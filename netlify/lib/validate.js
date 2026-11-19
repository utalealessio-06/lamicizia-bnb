// Controllo della richiesta di prenotazione (separato per poterlo testare).
import { ROOMS, RULES } from './config.js';
import { isDate, diffDays, addDays } from './dates.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (s, n) => String(s ?? '').trim().slice(0, n);

const MSG = {
  it: {
    room: 'Camera non valida.', dates: 'Date non valide.', past: 'La data di arrivo è già passata.',
    window: 'Si può prenotare al massimo un anno in anticipo.', min: (n) => `Il soggiorno minimo è di ${n} notti.`,
    max: (n) => `Per soggiorni oltre ${n} notti scriveteci direttamente.`, guests: (r, n) => `La ${r} ospita al massimo ${n} persone.`,
    name: 'Inserite nome e cognome.', email: 'Email non valida.', phone: 'Numero di telefono non valido.',
  },
  en: {
    room: 'Invalid room.', dates: 'Invalid dates.', past: 'The arrival date is in the past.',
    window: 'Bookings can be made up to one year in advance.', min: (n) => `The minimum stay is ${n} nights.`,
    max: (n) => `For stays longer than ${n} nights, please contact us directly.`, guests: (r, n) => `The ${r} sleeps up to ${n} guests.`,
    name: 'Please enter your full name.', email: 'Invalid email address.', phone: 'Invalid phone number.',
  },
};

export function validateBooking(input, today) {
  const b = input || {};
  const lang = b.lang === 'en' ? 'en' : 'it';
  const m = MSG[lang];
  const room = ROOMS[b.room];
  if (!Object.prototype.hasOwnProperty.call(ROOMS, b.room)) return { error: m.room };
  if (!isDate(b.checkin) || !isDate(b.checkout)) return { error: m.dates };
  if (b.checkin < today) return { error: m.past };
  if (b.checkin > addDays(today, RULES.bookingWindowDays)) return { error: m.window };
  const nights = diffDays(b.checkin, b.checkout);
  if (nights < RULES.minNights) return { error: m.min(RULES.minNights) };
  if (nights > RULES.maxNights) return { error: m.max(RULES.maxNights) };
  const guests = Number(b.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > room.maxGuests)
    return { error: m.guests(lang === 'en' ? room.nameEn : room.name, room.maxGuests) };
  const name = clip(b.name, 80);
  const email = clip(b.email, 120);
  const phone = clip(b.phone, 30);
  if (name.length < 2) return { error: m.name };
  if (!EMAIL.test(email)) return { error: m.email };
  if (phone.replace(/\D/g, '').length < 6) return { error: m.phone };
  const pct = RULES.depositPercent;
  const canDeposit = pct > 0 && pct < 100;
  const payment = b.payment === 'deposit' && canDeposit ? 'deposit' : 'full';
  return {
    value: { lang, room: b.room, checkin: b.checkin, checkout: b.checkout, nights, guests, name, email, phone, notes: clip(b.notes, 450), payment },
  };
}
