// POST /api/admin -> pannello riservato di Maddalena (password in ADMIN_PASSWORD).
// Azioni: overview, block, unblock, cancel.
import { timingSafeEqual, createHash } from 'node:crypto';
import { ROOMS } from '../lib/config.js';
import { todayRome, isDate, addDays } from '../lib/dates.js';
import { getCalendar, saveCalendar, isBusy, listBookings, getBooking, saveBooking, releaseById, validRoom } from '../lib/store.js';
import { json, fail } from '../lib/http.js';
import { clientId, check, record } from '../lib/ratelimit.js';

const h = (s) => createHash('sha256').update(String(s)).digest();
function authorized(req) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 8) return false;
  return timingSafeEqual(h(req.headers.get('x-admin-password') || ''), h(pw));
}

// Dopo 5 password sbagliate da uno stesso indirizzo: blocco di 15 minuti.
// Oltre 30 errori in un'ora da indirizzi diversi: pannello bloccato per tutti per un'ora.
const IP_LIMIT = 5, IP_WINDOW = 15 * 60e3;
const ALL_LIMIT = 30, ALL_WINDOW = 60 * 60e3;

export default async (req, context) => {
  if (req.method !== 'POST') return fail('Metodo non consentito', 405);
  const ipKey = `admin/${clientId(req, context)}`;
  const [ip, all] = await Promise.all([check(ipKey, IP_LIMIT, IP_WINDOW), check('admin/all', ALL_LIMIT, ALL_WINDOW)]);
  if (!ip.ok || !all.ok)
    return fail(`Troppi tentativi sbagliati. Riprova tra ${Math.max(ip.retryAfter || 0, all.retryAfter || 0)} minuti.`, 429);
  if (!authorized(req)) {
    await Promise.all([record(ipKey, IP_WINDOW), record('admin/all', ALL_WINDOW)]);
    await new Promise((r) => setTimeout(r, 800));
    return fail('Password errata.', 401);
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return fail('Richiesta non valida.');
  }
  const today = todayRome();

  if (body.action === 'overview') {
    const calendars = {};
    const now = Date.now();
    for (const id of Object.keys(ROOMS)) {
      const c = await getCalendar(id);
      calendars[id] = Object.fromEntries(Object.entries(c).filter(([d, e]) => d >= addDays(today, -60) && isBusy(e, now)));
    }
    const bookings = (await listBookings()).filter((b) => b.checkout >= addDays(today, -30));
    return json({ rooms: ROOMS, today, calendars, bookings });
  }

  if (body.action === 'block' || body.action === 'unblock') {
    if (!validRoom(body.room)) return fail('Camera non valida.');
    const dates = Array.isArray(body.dates) ? body.dates.filter(isDate).slice(0, 400) : [];
    const c = await getCalendar(body.room);
    const now = Date.now();
    const skipped = [];
    for (const d of dates) {
      if (body.action === 'block') {
        if (isBusy(c[d], now) && c[d].t !== 'block') skipped.push(d);
        else c[d] = { t: 'block', note: String(body.note || '').slice(0, 80) };
      } else if (c[d]?.t === 'block') delete c[d];
      else if (isBusy(c[d], now)) skipped.push(d);
    }
    await saveCalendar(body.room, c);
    return json({ ok: true, skipped });
  }

  if (body.action === 'cancel') {
    const b = await getBooking(String(body.id || ''));
    if (!b) return fail('Prenotazione non trovata.', 404);
    await releaseById(b.room, b.id);
    b.status = 'cancellata';
    b.cancelledAt = new Date().toISOString();
    await saveBooking(b);
    return json({ ok: true });
  }

  return fail('Azione sconosciuta.');
};

export const config = { path: '/api/admin' };
