// Email automatiche tramite Resend (https://resend.com). Senza RESEND_API_KEY le email non partono
// (la prenotazione viene comunque salvata e Stripe invia la ricevuta di pagamento).
// L'email all'ospite è nella lingua in cui ha prenotato; quella alla struttura è sempre in italiano.
import { PROPERTY, RULES } from './config.js';
import { itDate } from './dates.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const eur = (n, lang = 'it') => '€ ' + n.toLocaleString(lang === 'en' ? 'en-GB' : 'it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

async function send({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || !to) {
    console.warn('[email] non inviata (configurazione mancante):', subject);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, reply_to: replyTo }),
  });
  if (!res.ok) console.error('[email] errore', res.status, await res.text());
  return res.ok;
}

const T = {
  it: {
    code: 'Codice prenotazione', room: 'Camera', arr: 'Arrivo', dep: 'Partenza', nights: 'Notti', guests: 'Ospiti',
    total: 'Totale soggiorno', paid: 'Pagato online', balance: "Da saldare all'arrivo",
    checkin: RULES.checkin, checkout: RULES.checkout,
    kicker: 'Prenotazione confermata', subject: (d) => `Prenotazione confermata · ${PROPERTY.name} · ${d}`,
    hello: (n) => `Grazie ${n}, vi aspettiamo!`, received: 'Abbiamo ricevuto il pagamento e la camera è riservata per voi.',
    balanceNote: (b) => `Il saldo di <b>${b}</b> si paga direttamente in struttura all'arrivo.`,
    address: 'Indirizzo', phone: 'Telefono e WhatsApp', phoneV: PROPERTY.phone,
    questions: (wa) => `Per qualsiasi domanda rispondete a questa email o scriveteci su <a href="${wa}" style="color:#b4532f">WhatsApp</a>.`,
    bye: 'A presto,',
  },
  en: {
    code: 'Booking code', room: 'Room', arr: 'Arrival', dep: 'Departure', nights: 'Nights', guests: 'Guests',
    total: 'Total stay', paid: 'Paid online', balance: 'Balance due on arrival',
    checkin: '12:00 – 20:00', checkout: 'by 10:30',
    kicker: 'Booking confirmed', subject: (d) => `Booking confirmed · ${PROPERTY.name} · ${d}`,
    hello: (n) => `Thank you ${n}, we look forward to welcoming you!`, received: 'We have received your payment and the room is reserved for you.',
    balanceNote: (b) => `The balance of <b>${b}</b> is payable at the property on arrival.`,
    address: 'Address', phone: 'Phone and WhatsApp', phoneV: '+39 ' + PROPERTY.phone,
    questions: (wa) => `If you have any questions, just reply to this email or message us on <a href="${wa}" style="color:#b4532f">WhatsApp</a>.`,
    bye: 'See you soon,',
  },
};

function rows(b, lang = 'it') {
  const t = T[lang];
  const r = [
    [t.code, b.id],
    [t.room, lang === 'en' ? b.roomNameEn || b.roomName : b.roomName],
    [t.arr, `${itDate(b.checkin, lang)} · ${t.checkin}`],
    [t.dep, `${itDate(b.checkout, lang)} · ${t.checkout}`],
    [t.nights, b.nights],
    [t.guests, b.guests],
    [t.total, eur(b.total, lang)],
    [t.paid, eur(b.paid, lang)],
  ];
  if (b.balance > 0) r.push([t.balance, eur(b.balance, lang)]);
  return r
    .map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#8a7b6a">${esc(k)}</td><td style="padding:6px 0"><b>${esc(v)}</b></td></tr>`)
    .join('');
}

const wrap = (inner) =>
  `<div style="font-family:Georgia,serif;color:#2b2620;background:#f4ecdf;padding:28px"><div style="max-width:560px;margin:auto;background:#fbf7f0;padding:30px;border:1px solid #e8dcc6">${inner}</div></div>`;

export function guestEmail(b) {
  const lang = b.lang === 'en' ? 'en' : 'it';
  const t = T[lang];
  const wa = `https://wa.me/${PROPERTY.whatsapp}`;
  return {
    to: b.email,
    replyTo: process.env.OWNER_EMAIL,
    subject: t.subject(itDate(b.checkin, lang)),
    html: wrap(`
      <p style="font-family:monospace;letter-spacing:.12em;color:#b4532f;text-transform:uppercase;font-size:12px">${t.kicker}</p>
      <h1 style="font-weight:400;font-size:28px;margin:6px 0 16px">${t.hello(esc(b.name))}</h1>
      <p>${t.received}</p>
      <table style="margin:18px 0;font-size:15px;border-collapse:collapse">${rows(b, lang)}</table>
      ${b.balance > 0 ? `<p>${t.balanceNote(eur(b.balance, lang))}</p>` : ''}
      <p><b>${t.address}:</b> ${esc(PROPERTY.address)}${lang === 'en' ? ', Italy' : ''}<br>
      <b>${t.phone}:</b> ${esc(t.phoneV)}</p>
      <p>${t.questions(wa)}</p>
      <p style="margin-top:24px">${t.bye}<br>${esc(PROPERTY.host)} · ${esc(PROPERTY.name)}</p>`),
  };
}

export function ownerEmail(b, conflicts = []) {
  return {
    to: process.env.OWNER_EMAIL,
    replyTo: b.email,
    subject: `${conflicts.length ? '⚠️ CONTROLLARE · ' : ''}Nuova prenotazione dal sito · ${b.roomName} · ${itDate(b.checkin)}`,
    html: wrap(`
      ${conflicts.length ? `<p style="background:#fde2d6;padding:10px;border:1px solid #b4532f"><b>Attenzione:</b> queste notti risultavano già occupate: ${conflicts.map((d) => itDate(d)).join(', ')}. Controllate il calendario e contattate l'ospite.</p>` : ''}
      <h1 style="font-weight:400;font-size:24px;margin:0 0 14px">Nuova prenotazione dal sito</h1>
      <table style="font-size:15px;border-collapse:collapse">${rows(b)}
        <tr><td style="padding:6px 14px 6px 0;color:#8a7b6a">Nome</td><td><b>${esc(b.name)}</b></td></tr>
        <tr><td style="padding:6px 14px 6px 0;color:#8a7b6a">Email</td><td><b>${esc(b.email)}</b></td></tr>
        <tr><td style="padding:6px 14px 6px 0;color:#8a7b6a">Telefono</td><td><b>${esc(b.phone)}</b></td></tr>
        <tr><td style="padding:6px 14px 6px 0;color:#8a7b6a">Lingua dell'ospite</td><td><b>${b.lang === 'en' ? 'inglese 🇬🇧' : 'italiano'}</b></td></tr>
        <tr><td style="padding:6px 14px 6px 0;color:#8a7b6a">Note</td><td>${esc(b.notes || '—')}</td></tr>
      </table>
      <p style="margin-top:18px"><a href="${PROPERTY.siteUrl}/admin" style="color:#b4532f">Apri il pannello prenotazioni</a></p>`),
  };
}

export const sendEmail = send;
