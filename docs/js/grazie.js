// Pagina di conferma dopo il pagamento Stripe.
(function () {
  const box = document.getElementById('thanks');
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const day = (s) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${MESI[m - 1]} ${y}`; };
  const eur = (n) => '€ ' + n.toLocaleString('it-IT', { maximumFractionDigits: 2 });
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const sid = new URLSearchParams(location.search).get('session_id');

  const problem = (msg) => {
    box.innerHTML = `<p class="mono kicker">Qualcosa non torna</p><h1>${msg}</h1>
      <p class="lead" style="margin:0 auto 24px">Se vi è stato addebitato un importo, la prenotazione è salva: scriveteci e controlliamo subito.</p>
      <a class="btn btn-terra" href="https://wa.me/393288712971">Scrivici su WhatsApp</a>`;
  };
  if (!sid) return problem('Prenotazione non trovata');

  let tries = 0;
  (function load() {
    fetch('/api/booking?session_id=' + encodeURIComponent(sid))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => {
        if (!b.paid) return problem('Il pagamento non risulta completato');
        // Il codice arriva dal webhook: se non c'è ancora riprovo qualche volta.
        if (!b.code && tries++ < 4) return setTimeout(load, 1500);
        try { sessionStorage.removeItem('bk-session'); } catch {}
        box.innerHTML = `
          <p class="mono kicker">Prenotazione confermata</p>
          <h1>Grazie ${esc(b.name)}, <em>vi aspettiamo!</em></h1>
          <p class="lead" style="margin:0 auto">Abbiamo inviato la conferma a <b>${esc(b.email)}</b>. Se non la trovate, guardate nello spam.</p>
          <div class="ticket">
            <img src="/img/logo-ink.png" alt="" class="ticket-logo">
            <dl>
              ${b.code ? `<div><dt class="mono">Codice</dt><dd>${esc(b.code)}</dd></div>` : ''}
              <div><dt class="mono">Camera</dt><dd>${esc(b.roomName)} · ${b.guests} ${b.guests === 1 ? 'ospite' : 'ospiti'}</dd></div>
              <div><dt class="mono">Arrivo</dt><dd>${day(b.checkin)} · dalle 12:00 alle 20:00</dd></div>
              <div><dt class="mono">Partenza</dt><dd>${day(b.checkout)} · entro le 10:30</dd></div>
              <div><dt class="mono">Pagato</dt><dd>${eur(b.paid_amount)} su ${eur(b.total)}</dd></div>
              ${b.balance > 0 ? `<div><dt class="mono">Saldo all'arrivo</dt><dd>${eur(b.balance)}</dd></div>` : ''}
            </dl>
          </div>
          <div class="cta" style="justify-content:center">
            <a class="btn btn-terra" href="https://wa.me/393288712971">Scrivi a Maddalena</a>
            <a class="link mono" href="/dintorni">Come arrivare →</a>
          </div>`;
      })
      .catch(() => problem('Non riusciamo a caricare la prenotazione'));
  })();
})();
