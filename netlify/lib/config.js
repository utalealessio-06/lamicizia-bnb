// Unica fonte di verità per camere, prezzi e regole di prenotazione.
// Il sito legge questi valori da /api/availability, quindi basta cambiarli qui.

// Prezzo a notte in base al numero di ospiti, colazione inclusa.
// 1 e 2 ospiti: prezzi Booking (nov 2026). 3° e 4° ospite: SEGNAPOSTO (+20 €) da confermare con la struttura.
// pricePerNight = prezzo "da" mostrato sul sito (il più basso).
const room = (name, nameEn, prices, page) => {
  const maxGuests = Math.max(...Object.keys(prices).map(Number));
  return { name, nameEn, maxGuests, prices, pricePerNight: Math.min(...Object.values(prices)), page };
};
export const ROOMS = {
  viola: room('Camera Viola', 'Violet Room', { 1: 77, 2: 82 }, '/camera-viola'),
  verde: room('Camera Verde', 'Green Room', { 1: 77, 2: 82, 3: 102 }, '/camera-verde'),
  classica: room('Camera Classica', 'Classic Room', { 1: 77, 2: 82, 3: 102, 4: 122 }, '/camera-classica'),
};

export const roomName = (id, lang) => (lang === 'en' ? ROOMS[id].nameEn : ROOMS[id].name);

export const nightly = (roomId, guests) => ROOMS[roomId].prices[guests];

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

export function quote(roomId, nights, payment, guests) {
  const total = nightly(roomId, guests) * nights;
  const pct = RULES.depositPercent;
  const deposit = pct > 0 && pct < 100 ? Math.round((total * pct) / 100) : total;
  const due = payment === 'deposit' ? deposit : total;
  return { total, deposit, due, balance: total - due };
}

export function publicConfig() {
  return { rooms: ROOMS, rules: RULES, property: { phone: PROPERTY.phone, whatsapp: PROPERTY.whatsapp } };
}
