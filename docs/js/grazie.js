// Pagina di conferma dopo il pagamento Stripe.
(function () {
  const box = document.getElementById('thanks');
  const EN = document.documentElement.lang === 'en';
  const B = EN ? '/en' : '';
  const L = EN
    ? {
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        locale: 'en-GB', wrong: 'Something is not right',
        safe: 'If you have been charged, your booking is safe: message us and we will check straight away.', wa: 'Message us on WhatsApp',
        notFound: 'Booking not found', notPaid: 'The payment does not appear to be complete', loadFail: 'We could not load your booking',
        ok: 'Booking confirmed', thanks: (n) => `Thank you ${n}, <em>see you soon!</em>`,
        sent: (e) => `We have sent your confirmation to <b>${e}</b>. If you can't find it, please check your spam folder.`,
        code: 'Code', room: 'Room', guest: (n) => (n === 1 ? 'guest' : 'guests'), arr: 'Arrival', arrT: 'from 12:00 to 20:00',
        dep: 'Departure', depT: 'by 10:30', paid: 'Paid', of: 'of', bal: 'Balance on arrival', write: 'Message Maddalena', how: 'How to get here →',
      }
    : {
        months: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
        locale: 'it-IT', wrong: 'Qualcosa non torna',
        safe: 'Se vi è stato addebitato un importo, la prenotazione è salva: scriveteci e controlliamo subito.', wa: 'Scrivici su WhatsApp',
        notFound: 'Prenotazione non trovata', notPaid: 'Il pagamento non risulta completato', loadFail: 'Non riusciamo a caricare la prenotazione',
        ok: 'Prenotazione confermata', thanks: (n) => `Grazie ${n}, <em>vi aspettiamo!</em>`,
        sent: (e) => `Abbiamo inviato la conferma a <b>${e}</b>. Se non la trovate, guardate nello spam.`,
        code: 'Codice', room: 'Camera', guest: (n) => (n === 1 ? 'ospite' : 'ospiti'), arr: 'Arrivo', arrT: 'dalle 12:00 alle 20:00',
        dep: 'Partenza', depT: 'entro le 10:30', paid: 'Pagato', of: 'su', bal: "Saldo all'arrivo", write: 'Scrivi a Maddalena', how: 'Come arrivare →',
      };
  const day = (s) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${L.months[m - 1]} ${y}`; };
  const eur = (n) => '€ ' + n.toLocaleString(L.locale, { maximumFractionDigits: 2 });
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const sid = new URLSearchParams(location.search).get('session_id');

  const problem = (msg) => {
    box.innerHTML = `<p class="mono kicker">${L.wrong}</p><h1>${msg}</h1>
      <p class="lead" style="margin:0 auto 24px">${L.safe}</p>
      <a class="btn btn-terra" href="https://wa.me/393288712971">${L.wa}</a>`;
  };
  if (!sid) return problem(L.notFound);

  let tries = 0;
  (function load() {
    fetch('/api/booking?session_id=' + encodeURIComponent(sid))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => {
        if (!b.paid) return problem(L.notPaid);
        // Il codice arriva dal webhook: se non c'è ancora riprovo qualche volta.
        if (!b.code && tries++ < 4) return setTimeout(load, 1500);
        try { sessionStorage.removeItem('bk-session'); } catch {}
        box.innerHTML = `
          <p class="mono kicker">${L.ok}</p>
          <h1>${L.thanks(esc(b.name))}</h1>
          <p class="lead" style="margin:0 auto">${L.sent(esc(b.email))}</p>
          <div class="ticket">
            <img src="/img/logo-ink.png" alt="" class="ticket-logo">
            <dl>
              ${b.code ? `<div><dt class="mono">${L.code}</dt><dd>${esc(b.code)}</dd></div>` : ''}
              <div><dt class="mono">${L.room}</dt><dd>${esc(EN ? b.roomNameEn : b.roomName)} · ${b.guests} ${L.guest(b.guests)}</dd></div>
              <div><dt class="mono">${L.arr}</dt><dd>${day(b.checkin)} · ${L.arrT}</dd></div>
              <div><dt class="mono">${L.dep}</dt><dd>${day(b.checkout)} · ${L.depT}</dd></div>
              <div><dt class="mono">${L.paid}</dt><dd>${eur(b.paid_amount)} ${L.of} ${eur(b.total)}</dd></div>
              ${b.balance > 0 ? `<div><dt class="mono">${L.bal}</dt><dd>${eur(b.balance)}</dd></div>` : ''}
            </dl>
          </div>
          <div class="cta" style="justify-content:center">
            <a class="btn btn-terra" href="https://wa.me/393288712971">${L.write}</a>
            <a class="link mono" href="${B}/dintorni">${L.how}</a>
          </div>`;
      })
      .catch(() => problem(L.loadFail));
  })();
})();
