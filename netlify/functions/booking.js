// GET /api/booking?session_id=... -> riepilogo per la pagina di conferma dopo il pagamento.
import { stripe } from '../lib/stripe.js';
import { bookingIdForSession } from '../lib/store.js';
import { ROOMS } from '../lib/config.js';
import { json, fail } from '../lib/http.js';

export default async (req) => {
  const sid = new URL(req.url).searchParams.get('session_id') || '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return fail('Sessione non valida.');
  let s;
  try {
    s = await stripe().checkout.sessions.retrieve(sid);
  } catch {
    return fail('Prenotazione non trovata.', 404);
  }
  const m = s.metadata || {};
  const total = Number(m.total);
  const paid = s.amount_total / 100;
  return json({
    paid: s.payment_status === 'paid',
    code: await bookingIdForSession(sid),
    name: m.name,
    email: s.customer_details?.email || s.customer_email,
    roomName: ROOMS[m.room]?.name,
    checkin: m.checkin,
    checkout: m.checkout,
    nights: Number(m.nights),
    guests: Number(m.guests),
    total,
    paid_amount: paid,
    balance: Math.max(0, Math.round((total - paid) * 100) / 100),
  });
};

export const config = { path: '/api/booking' };
