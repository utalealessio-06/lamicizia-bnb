import { registerHooks } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const mock = (f) => new URL(`./mocks/${f}`, import.meta.url).href;
registerHooks({
  resolve(spec, ctx, next) {
    if (spec === '@netlify/blobs') return { url: mock('blobs.js'), shortCircuit: true };
    if (spec === 'stripe') return { url: mock('stripe.js'), shortCircuit: true };
    return next(spec, ctx);
  },
});
process.env.STRIPE_SECRET_KEY = 'sk_test_x';
process.env.ADMIN_PASSWORD = 'password-lunga';
process.env.DEPOSIT_PERCENT = '30';
console.warn = () => {};

const { validateBooking } = await import('../lib/validate.js');
const { addDays, todayRome, nightsOf } = await import('../lib/dates.js');
const { quote } = await import('../lib/config.js');
const { sessions } = await import(mock('stripe.js'));
const availability = (await import('../functions/availability.js')).default;
const checkout = (await import('../functions/checkout.js')).default;
const webhook = (await import('../functions/stripe-webhook.js')).default;
const booking = (await import('../functions/booking.js')).default;
const admin = (await import('../functions/admin.js')).default;

const today = todayRome();
const IN = addDays(today, 20), OUT = addDays(today, 23);
const guest = { room: 'verde', checkin: IN, checkout: OUT, guests: 2, name: 'Mario Rossi', email: 'mario@example.com', phone: '+39 333 1234567', payment: 'deposit' };
const post = (url, body, headers = {}) => new Request('http://x' + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const busy = async (room) => (await (await availability(new Request('http://x/api/availability'))).json()).busy[room];
const event = (type, s) => post('/api/stripe-webhook', JSON.stringify({ type, data: { object: s } }), { 'stripe-signature': 'firma-ok' });
const adm = (body, pw = 'password-lunga') => admin(post('/api/admin', body, { 'x-admin-password': pw }));

test('validazione', () => {
  assert.ok(validateBooking(guest, today).value);
  assert.match(validateBooking({ ...guest, checkin: addDays(today, -1) }, today).error, /passata/);
  assert.match(validateBooking({ ...guest, checkout: IN }, today).error, /minimo/);
  assert.match(validateBooking({ ...guest, guests: 4 }, today).error, /massimo 3/);
  assert.match(validateBooking({ ...guest, email: 'no' }, today).error, /Email/);
  assert.match(validateBooking({ ...guest, room: 'toString' }, today).error, /Camera/);
  assert.equal(validateBooking({ ...guest, checkin: '2026-02-30' }, today).error, 'Date non valide.');
});

test('prezzi e caparra', () => {
  assert.deepEqual(quote('verde', 3, 'deposit'), { total: 285, deposit: 86, due: 86, balance: 199 });
  assert.deepEqual(quote('verde', 3, 'full'), { total: 285, deposit: 86, due: 285, balance: 0 });
});

test('flusso completo: blocco, pagamento, conferma, annullo', async () => {
  assert.deepEqual(await busy('verde'), []);

  const r1 = await checkout(post('/api/checkout', guest));
  assert.equal(r1.status, 200);
  const { id: sid } = await r1.json();
  const s = sessions.get(sid);
  assert.equal(s.amount_total, 8600, 'caparra 30% di 285 €');
  assert.deepEqual(await busy('verde'), nightsOf(IN, OUT), 'notti bloccate durante il pagamento');

  // un altro ospite sulle stesse date viene fermato
  assert.equal((await checkout(post('/api/checkout', { ...guest, checkin: addDays(IN, 1) }))).status, 409);
  // la stessa persona che torna indietro e riprova sì
  const r2 = await checkout(post('/api/checkout', { ...guest, payment: 'full', replaceSession: sid }));
  assert.equal(r2.status, 200);
  const { id: sid2 } = await r2.json();
  assert.equal(sessions.get(sid).status, 'expired');
  const s2 = sessions.get(sid2);
  assert.equal(s2.amount_total, 28500);

  // webhook con firma sbagliata
  assert.equal((await webhook(post('/api/stripe-webhook', '{}', { 'stripe-signature': 'no' }))).status, 400);

  // pagamento completato (due volte: Stripe può ripetere l'evento)
  Object.assign(s2, { status: 'complete', payment_status: 'paid', customer_details: { email: 'mario@example.com' } });
  assert.equal((await webhook(event('checkout.session.completed', s2))).status, 200);
  assert.equal((await webhook(event('checkout.session.completed', s2))).status, 200);

  const conf = await (await booking(new Request('http://x/api/booking?session_id=' + sid2))).json();
  assert.equal(conf.paid, true);
  assert.match(conf.code, /^AM-/);
  assert.equal(conf.balance, 0);

  const ov = await (await adm({ action: 'overview' })).json();
  const mine = ov.bookings.filter((b) => b.sessionId === sid2);
  assert.equal(mine.length, 1, 'una sola prenotazione anche con webhook ripetuto');
  assert.equal(ov.calendars.verde[IN].t, 'booking');
  assert.equal(mine[0].conflicts, undefined);

  // annullo dal pannello: le date tornano libere
  await adm({ action: 'cancel', id: mine[0].id });
  assert.deepEqual(await busy('verde'), []);
});

test('sessione scaduta libera le date', async () => {
  const r = await checkout(post('/api/checkout', { ...guest, room: 'viola' }));
  const { id } = await r.json();
  assert.equal((await busy('viola')).length, 3);
  await webhook(event('checkout.session.expired', sessions.get(id)));
  assert.deepEqual(await busy('viola'), []);
});

test('pannello: password, blocco e sblocco', async () => {
  assert.equal((await adm({ action: 'overview' }, 'sbagliata')).status, 401);
  const d = [addDays(today, 40), addDays(today, 41)];
  await adm({ action: 'block', room: 'classica', dates: d, note: 'Booking – Bianchi' });
  assert.deepEqual(await busy('classica'), d);
  // il blocco ferma anche le prenotazioni dal sito
  assert.equal((await checkout(post('/api/checkout', { ...guest, room: 'classica', checkin: d[0], checkout: addDays(d[0], 2) }))).status, 409);
  // si può partire il giorno in cui inizia un blocco
  assert.equal((await checkout(post('/api/checkout', { ...guest, room: 'classica', checkin: addDays(d[0], -2), checkout: d[0] }))).status, 200);
  await adm({ action: 'unblock', room: 'classica', dates: d });
  assert.deepEqual(await busy('classica'), nightsOf(addDays(d[0], -2), d[0]));
});

test('limiti: troppi pagamenti avviati e tetto globale', async () => {
  const from = (ip, n) => checkout(post('/api/checkout', { ...guest, room: 'classica', checkin: addDays(today, 100 + n * 3), checkout: addDays(today, 101 + n * 3) }, { 'x-nf-client-connection-ip': ip }));
  for (let i = 0; i < 5; i++) assert.equal((await from('1.1.1.1', i)).status, 200, `tentativo ${i + 1}`);
  assert.equal((await from('1.1.1.1', 5)).status, 429, 'sesto tentativo dallo stesso IP bloccato');
  // altri indirizzi: si arriva al tetto di 8 pagamenti in corso in tutto il sito
  let last;
  for (let i = 0; i < 4; i++) last = await from('2.2.2.' + i, 10 + i);
  assert.equal(last.status, 429, 'tetto globale raggiunto');
});

test('limiti: password del pannello', async () => {
  const h = { 'x-nf-client-connection-ip': '9.9.9.9' };
  for (let i = 0; i < 5; i++) assert.equal((await admin(post('/api/admin', { action: 'overview' }, { ...h, 'x-admin-password': 'no' }))).status, 401);
  // dopo 5 errori è bloccato anche con la password giusta
  assert.equal((await admin(post('/api/admin', { action: 'overview' }, { ...h, 'x-admin-password': 'password-lunga' }))).status, 429);
  // da un altro indirizzo si entra
  assert.equal((await admin(post('/api/admin', { action: 'overview' }, { 'x-nf-client-connection-ip': '8.8.8.8', 'x-admin-password': 'password-lunga' }))).status, 200);
});
