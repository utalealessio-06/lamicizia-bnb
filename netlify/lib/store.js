// Archivio su Netlify Blobs.
//  calendar / room/<id>      -> { "YYYY-MM-DD": { t: "booking"|"block"|"hold", id?, note?, until? } }
//  bookings / <bookingId>    -> scheda prenotazione
//  bookings / session/<sid>  -> bookingId (evita doppie registrazioni dal webhook)
import { getStore } from '@netlify/blobs';
import { ROOMS } from './config.js';
import { nightsOf } from './dates.js';

const cal = () => getStore({ name: 'calendar', consistency: 'strong' });
const bk = () => getStore({ name: 'bookings', consistency: 'strong' });

export async function getCalendar(roomId) {
  return (await cal().get(`room/${roomId}`, { type: 'json' })) || {};
}

export async function saveCalendar(roomId, data) {
  await cal().setJSON(`room/${roomId}`, data);
}

export function isBusy(entry, now = Date.now()) {
  if (!entry) return false;
  if (entry.t === 'hold') return entry.until > now;
  return true;
}

// Numero di pagamenti in corso (blocchi temporanei ancora attivi) su tutte le camere.
export async function activeHolds(now = Date.now()) {
  const ids = new Set();
  for (const id of Object.keys(ROOMS)) {
    const c = await getCalendar(id);
    for (const e of Object.values(c)) if (e.t === 'hold' && e.until > now) ids.add(e.id);
  }
  return ids.size;
}

// Notti non disponibili per il pubblico (prenotate, bloccate o in pagamento).
export async function busyNights(roomId, from) {
  const c = await getCalendar(roomId);
  const now = Date.now();
  return Object.keys(c).filter((d) => d >= from && isBusy(c[d], now)).sort();
}

export async function rangeIsFree(roomId, checkin, checkout, ignoreHoldId) {
  const c = await getCalendar(roomId);
  const now = Date.now();
  return nightsOf(checkin, checkout).every((d) => {
    const e = c[d];
    if (e && e.t === 'hold' && e.id === ignoreHoldId) return true;
    return !isBusy(e, now);
  });
}

// Scrive le notti di un soggiorno. Ritorna le notti che erano già occupate da altro (conflitti).
export async function markNights(roomId, checkin, checkout, entry, { onlyIfFree = false } = {}) {
  const c = await getCalendar(roomId);
  const now = Date.now();
  const conflicts = [];
  for (const d of nightsOf(checkin, checkout)) {
    const cur = c[d];
    const sameHold = cur && cur.t === 'hold' && entry.holdId && cur.id === entry.holdId;
    if (isBusy(cur, now) && !sameHold) {
      conflicts.push(d);
      if (onlyIfFree) continue;
    }
    const { holdId, ...clean } = entry;
    c[d] = clean;
  }
  await saveCalendar(roomId, c);
  return conflicts;
}

// Libera le notti che appartengono a un certo id (prenotazione o hold).
export async function releaseById(roomId, id) {
  const c = await getCalendar(roomId);
  let changed = false;
  for (const d of Object.keys(c)) {
    if (c[d].id === id) {
      delete c[d];
      changed = true;
    }
  }
  if (changed) await saveCalendar(roomId, c);
}

export async function getBooking(id) {
  return bk().get(id, { type: 'json' });
}

export async function saveBooking(b) {
  await bk().setJSON(b.id, b);
  if (b.sessionId) await bk().set(`session/${b.sessionId}`, b.id);
}

export async function bookingIdForSession(sid) {
  return bk().get(`session/${sid}`);
}

export async function listBookings() {
  const store = bk();
  const { blobs } = await store.list();
  const ids = blobs.map((b) => b.key).filter((k) => !k.startsWith('session/'));
  const all = await Promise.all(ids.map((id) => store.get(id, { type: 'json' })));
  return all.filter(Boolean).sort((a, b) => a.checkin.localeCompare(b.checkin));
}

export function validRoom(id) {
  return Object.prototype.hasOwnProperty.call(ROOMS, id);
}

export async function cacheGet(key) {
  return getStore('cache').get(key, { type: 'json' });
}
export async function cacheSet(key, value) {
  return getStore('cache').setJSON(key, value);
}
