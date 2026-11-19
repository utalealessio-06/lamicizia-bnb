// Trasforma una sessione Stripe pagata in prenotazione confermata (idempotente).
// Chiamato solo dal webhook Stripe (unico punto che conferma, così le email partono una volta sola).
import { ROOMS } from './config.js';
import { markNights, saveBooking, getBooking, bookingIdForSession } from './store.js';
import { guestEmail, ownerEmail, sendEmail } from './email.js';

const code = () => 'AM-' + Math.random().toString(36).slice(2, 8).toUpperCase();

export async function confirmSession(session) {
  if (session.payment_status !== 'paid') return null;
  const existing = await bookingIdForSession(session.id);
  if (existing) return getBooking(existing);

  const m = session.metadata || {};
  if (!ROOMS[m.room]) throw new Error('Sessione senza dati di prenotazione: ' + session.id);
  const total = Number(m.total);
  const paid = session.amount_total / 100;
  const booking = {
    id: code(),
    sessionId: session.id,
    paymentIntent: session.payment_intent,
    status: 'confermata',
    room: m.room,
    roomName: ROOMS[m.room].name,
    roomNameEn: ROOMS[m.room].nameEn,
    lang: m.lang === 'en' ? 'en' : 'it',
    checkin: m.checkin,
    checkout: m.checkout,
    nights: Number(m.nights),
    guests: Number(m.guests),
    name: m.name,
    email: session.customer_details?.email || session.customer_email,
    phone: m.phone,
    notes: m.notes,
    payment: m.payment,
    total,
    paid,
    balance: Math.max(0, Math.round((total - paid) * 100) / 100),
    createdAt: new Date().toISOString(),
  };

  const conflicts = await markNights(booking.room, booking.checkin, booking.checkout, {
    t: 'booking',
    id: booking.id,
    holdId: session.id,
  });
  if (conflicts.length) booking.conflicts = conflicts;
  await saveBooking(booking);

  await Promise.allSettled([sendEmail(guestEmail(booking)), sendEmail(ownerEmail(booking, conflicts))]);
  return booking;
}
