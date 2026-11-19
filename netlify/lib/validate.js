// Controllo della richiesta di prenotazione (separato per poterlo testare).
import { ROOMS, RULES } from './config.js';
import { isDate, diffDays, addDays } from './dates.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (s, n) => String(s ?? '').trim().slice(0, n);

export function validateBooking(input, today) {
  const b = input || {};
  const room = ROOMS[b.room];
  if (!Object.prototype.hasOwnProperty.call(ROOMS, b.room)) return { error: 'Camera non valida.' };
  if (!isDate(b.checkin) || !isDate(b.checkout)) return { error: 'Date non valide.' };
  if (b.checkin < today) return { error: "La data di arrivo è già passata." };
  if (b.checkin > addDays(today, RULES.bookingWindowDays)) return { error: 'Si può prenotare al massimo un anno in anticipo.' };
  const nights = diffDays(b.checkin, b.checkout);
  if (nights < RULES.minNights) return { error: `Il soggiorno minimo è di ${RULES.minNights} notti.` };
  if (nights > RULES.maxNights) return { error: `Per soggiorni oltre ${RULES.maxNights} notti scriveteci direttamente.` };
  const guests = Number(b.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > room.maxGuests)
    return { error: `La ${room.name} ospita al massimo ${room.maxGuests} persone.` };
  const name = clip(b.name, 80);
  const email = clip(b.email, 120);
  const phone = clip(b.phone, 30);
  if (name.length < 2) return { error: 'Inserite nome e cognome.' };
  if (!EMAIL.test(email)) return { error: 'Email non valida.' };
  if (phone.replace(/\D/g, '').length < 6) return { error: 'Numero di telefono non valido.' };
  const pct = RULES.depositPercent;
  const canDeposit = pct > 0 && pct < 100;
  const payment = b.payment === 'deposit' && canDeposit ? 'deposit' : 'full';
  return {
    value: { room: b.room, checkin: b.checkin, checkout: b.checkout, nights, guests, name, email, phone, notes: clip(b.notes, 450), payment },
  };
}
