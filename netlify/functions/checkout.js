// POST /api/checkout -> controlla le date, le blocca per 30 minuti e apre il pagamento Stripe.
// Carta, Apple Pay e Google Pay sono offerti da Stripe Checkout (metodi attivi nel pannello Stripe).
import { ROOMS, RULES, PROPERTY, quote } from '../lib/config.js';
import { todayRome, itDate } from '../lib/dates.js';
import { rangeIsFree, markNights, releaseById, activeHolds } from '../lib/store.js';
import { clientId, check, record } from '../lib/ratelimit.js';
import { validateBooking } from '../lib/validate.js';
import { stripe } from '../lib/stripe.js';
import { json, fail } from '../lib/http.js';

// Contro chi avvia pagamenti a vuoto per bloccare il calendario:
// massimo 5 tentativi l'ora per indirizzo e massimo 8 pagamenti in corso in tutto il sito.
const IP_LIMIT = 5, IP_WINDOW = 60 * 60e3, MAX_ACTIVE_HOLDS = 8;
const busyMsg = 'Troppe richieste in questo momento. Riprovate tra qualche minuto o scriveteci su WhatsApp al 328 871 2971.';

export default async (req, context) => {
  if (req.method !== 'POST') return fail('Metodo non consentito', 405);
  const ipKey = `checkout/${clientId(req, context)}`;
  if (!(await check(ipKey, IP_LIMIT, IP_WINDOW)).ok) return fail(busyMsg, 429);
  let body;
  try {
    body = await req.json();
  } catch {
    return fail('Richiesta non valida.');
  }
  const { error, value: b } = validateBooking(body, todayRome());
  if (error) return fail(error);

  // Se l'ospite torna indietro dal pagamento e riprova, il suo vecchio blocco non deve fermarlo.
  const prev = typeof body.replaceSession === 'string' && /^cs_[A-Za-z0-9_]+$/.test(body.replaceSession) ? body.replaceSession : null;
  if (prev) {
    try {
      const old = await stripe().checkout.sessions.retrieve(prev);
      if (old.status === 'open') await stripe().checkout.sessions.expire(prev);
      if (old.status !== 'complete' && ROOMS[old.metadata?.room]) await releaseById(old.metadata.room, prev);
    } catch (e) {
      console.warn('[checkout] sessione precedente non rilasciata', e.message);
    }
  }

  if (!(await rangeIsFree(b.room, b.checkin, b.checkout)))
    return fail('Alcune di queste notti sono appena state prenotate. Scegliete altre date.', 409);
  if ((await activeHolds()) >= MAX_ACTIVE_HOLDS) return fail(busyMsg, 429);
  await record(ipKey, IP_WINDOW);

  const room = ROOMS[b.room];
  const q = quote(b.room, b.nights, b.payment);
  const base = process.env.URL || new URL(req.url).origin;
  const expiresAt = Math.floor(Date.now() / 1000) + RULES.holdMinutes * 60 + 60;
  const label = `${room.name} · ${b.nights} ${b.nights === 1 ? 'notte' : 'notti'} · ${itDate(b.checkin)} → ${itDate(b.checkout)}`;

  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    locale: 'it',
    customer_email: b.email,
    expires_at: expiresAt,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(q.due * 100),
          product_data: {
            name: b.payment === 'deposit' ? `Caparra ${RULES.depositPercent}% · ${label}` : label,
            description:
              b.payment === 'deposit'
                ? `Totale soggiorno € ${q.total}. Saldo di € ${q.balance} da pagare all'arrivo.`
                : `Soggiorno completo per ${b.guests} ${b.guests === 1 ? 'ospite' : 'ospiti'}, colazione inclusa.`,
          },
        },
      },
    ],
    payment_intent_data: { description: `${PROPERTY.name} · ${label}` },
    metadata: {
      room: b.room,
      checkin: b.checkin,
      checkout: b.checkout,
      nights: String(b.nights),
      guests: String(b.guests),
      name: b.name,
      phone: b.phone,
      notes: b.notes,
      payment: b.payment,
      total: String(q.total),
    },
    success_url: `${base}/grazie?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}${room.page}?annullato=1#prenota`,
  });

  // Blocca le notti finché il pagamento è in corso (si liberano da sole alla scadenza).
  await markNights(b.room, b.checkin, b.checkout, { t: 'hold', id: session.id, until: expiresAt * 1000 });

  return json({ url: session.url, id: session.id });
};

export const config = { path: '/api/checkout' };
