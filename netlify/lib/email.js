// Email automatiche tramite Resend (https://resend.com). Senza RESEND_API_KEY le email non partono
// (la prenotazione viene comunque salvata e Stripe invia la ricevuta di pagamento).
import { PROPERTY, RULES } from './config.js';
import { itDate } from './dates.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const eur = (n) => '€ ' + n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

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

function rows(b) {
  const r = [
    ['Codice prenotazione', b.id],
    ['Camera', b.roomName],
    ['Arrivo', `${itDate(b.checkin)} · ${RULES.checkin}`],
    ['Partenza', `${itDate(b.checkout)} · ${RULES.checkout}`],
    ['Notti', b.nights],
    ['Ospiti', b.guests],
    ['Totale soggiorno', eur(b.total)],
    ['Pagato online', eur(b.paid)],
  ];
  if (b.balance > 0) r.push(['Da saldare all\'arrivo', eur(b.balance)]);
  return r
    .map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#8a7b6a">${esc(k)}</td><td style="padding:6px 0"><b>${esc(v)}</b></td></tr>`)
    .join('');
}

const wrap = (inner) =>
  `<div style="font-family:Georgia,serif;color:#2b2620;background:#f4ecdf;padding:28px"><div style="max-width:560px;margin:auto;background:#fbf7f0;padding:30px;border:1px solid #e8dcc6">${inner}</div></div>`;

export function guestEmail(b) {
  const wa = `https://wa.me/${PROPERTY.whatsapp}`;
  return {
    to: b.email,
    replyTo: process.env.OWNER_EMAIL,
    subject: `Prenotazione confermata · ${PROPERTY.name} · ${itDate(b.checkin)}`,
    html: wrap(`
      <p style="font-family:monospace;letter-spacing:.12em;color:#b4532f;text-transform:uppercase;font-size:12px">Prenotazione confermata</p>
      <h1 style="font-weight:400;font-size:28px;margin:6px 0 16px">Grazie ${esc(b.name)}, vi aspettiamo!</h1>
      <p>Abbiamo ricevuto il pagamento e la camera è riservata per voi.</p>
      <table style="margin:18px 0;font-size:15px;border-collapse:collapse">${rows(b)}</table>
      ${b.balance > 0 ? `<p>Il saldo di <b>${eur(b.balance)}</b> si paga direttamente in struttura all'arrivo.</p>` : ''}
      <p><b>Indirizzo:</b> ${esc(PROPERTY.address)}<br>
      <b>Telefono e WhatsApp:</b> ${esc(PROPERTY.phone)}</p>
      <p>Per qualsiasi domanda rispondete a questa email o scriveteci su <a href="${wa}" style="color:#b4532f">WhatsApp</a>.</p>
      <p style="margin-top:24px">A presto,<br>${esc(PROPERTY.host)} · ${esc(PROPERTY.name)}</p>`),
  };
}

export function ownerEmail(b, conflicts = []) {
  return {
    to: process.env.OWNER_EMAIL,
    replyTo: b.email,
    subject: `${conflicts.length ? '⚠️ CONTROLLARE · ' : ''}Nuova prenotazione dal sito · ${b.roomName} · ${itDate(b.checkin)}`,
    html: wrap(`
      ${conflicts.length ? `<p style="background:#fde2d6;padding:10px;border:1px solid #b4532f"><b>Attenzione:</b> queste notti risultavano già occupate: ${conflicts.map(itDate).join(', ')}. Controllate il calendario e contattate l'ospite.</p>` : ''}
      <h1 style="font-weight:400;font-size:24px;margin:0 0 14px">Nuova prenotazione dal sito</h1>
      <table style="font-size:15px;border-collapse:collapse">${rows(b)}
        <tr><td style="padding:6px 14px 6px 0;color:#8a7b6a">Nome</td><td><b>${esc(b.name)}</b></td></tr>
        <tr><td style="padding:6px 14px 6px 0;color:#8a7b6a">Email</td><td><b>${esc(b.email)}</b></td></tr>
        <tr><td style="padding:6px 14px 6px 0;color:#8a7b6a">Telefono</td><td><b>${esc(b.phone)}</b></td></tr>
        <tr><td style="padding:6px 14px 6px 0;color:#8a7b6a">Note</td><td>${esc(b.notes || '—')}</td></tr>
      </table>
      <p style="margin-top:18px"><a href="${PROPERTY.siteUrl}/admin" style="color:#b4532f">Apri il pannello prenotazioni</a></p>`),
  };
}

export const sendEmail = send;
