// Unica fonte di verità per camere, prezzi e regole di prenotazione.
// Il sito legge questi valori da /api/availability, quindi basta cambiarli qui.

// TODO prezzi: valori segnaposto finché la struttura non conferma il listino.
export const ROOMS = {
  viola: { name: 'Camera Viola', maxGuests: 2, pricePerNight: 80, page: '/camera-viola' },
  verde: { name: 'Camera Verde', maxGuests: 3, pricePerNight: 95, page: '/camera-verde' },
  classica: { name: 'Camera Classica', maxGuests: 4, pricePerNight: 110, page: '/camera-classica' },
};

const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));

export const RULES = {
  minNights: 1,
  maxNights: 30,
  bookingWindowDays: 365,
  // Percentuale di caparra (0 = solo pagamento intero, 100 = come intero).
  depositPercent: num(process.env.DEPOSIT_PERCENT, 30),
  // Il checkout di Stripe scade dopo 30 minuti (minimo consentito): le date restano bloccate per quel tempo.
  holdMinutes: 30,
  checkin: '12:00 – 20:00',
  checkout: 'entro le 10:30',
};

export const PROPERTY = {
  name: "B&B L'Amicizia",
  host: 'Maddalena',
  address: 'Via Cassia Vecchia, 100 · 01027 Montefiascone (VT)',
  phone: '328 871 2971',
  whatsapp: '393288712971',
  siteUrl: process.env.URL || 'http://localhost:8888',
};

export function quote(roomId, nights, payment) {
  const room = ROOMS[roomId];
  const total = room.pricePerNight * nights;
  const pct = RULES.depositPercent;
  const deposit = pct > 0 && pct < 100 ? Math.round((total * pct) / 100) : total;
  const due = payment === 'deposit' ? deposit : total;
  return { total, deposit, due, balance: total - due };
}

export function publicConfig() {
  return { rooms: ROOMS, rules: RULES, property: { phone: PROPERTY.phone, whatsapp: PROPERTY.whatsapp } };
}
