// Calendario delle date libere + prenotazione diretta con pagamento Stripe.
// Si monta su <div data-booking [data-room="viola"]>.
(function () {
  const root = document.querySelector('[data-booking]');
  if (!root) return;

  const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const add = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const diff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
  const nice = (s) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${MESI_BREVI[m - 1]}`; };
  const eur = (n) => '€ ' + n.toLocaleString('it-IT', { maximumFractionDigits: 2 });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const fixedRoom = root.dataset.room || null;
  let cfg, room = fixedRoom, start = null, end = null, month, busy = new Set();

  root.innerHTML = '<p class="bk-loading mono">Carico il calendario…</p>';

  fetch('/api/availability')
    .then((r) => { if (!r.ok) throw 0; return r.json(); })
    .then((data) => { cfg = data; if (!room) room = Object.keys(cfg.rooms)[0]; month = cfg.today.slice(0, 7); build(); })
    .catch(() => {
      root.innerHTML = `<div class="bk-error"><p>Il calendario non è disponibile in questo momento.</p>
        <a class="btn btn-terra" href="https://wa.me/393288712971">Chiedi le date su WhatsApp</a></div>`;
    });

  function build() {
    const pct = cfg.rules.depositPercent;
    const canDeposit = pct > 0 && pct < 100;
    const roomTabs = fixedRoom ? '' : `<div class="bk-rooms" role="tablist">${Object.entries(cfg.rooms)
      .map(([id, r]) => `<button type="button" role="tab" data-r="${id}">${esc(r.name)}<small>fino a ${r.maxGuests} · ${eur(r.pricePerNight)}/notte</small></button>`).join('')}</div>`;

    root.innerHTML = `
      ${roomTabs}
      <div class="bk-grid">
        <div class="cal">
          <div class="cal-nav">
            <button type="button" class="cal-prev" aria-label="Mese precedente">‹</button>
            <p class="mono cal-hint"></p>
            <button type="button" class="cal-next" aria-label="Mese successivo">›</button>
          </div>
          <div class="cal-months"></div>
          <p class="cal-legend mono"><span class="lg free"></span>libera <span class="lg busy"></span>occupata <span class="lg sel"></span>il tuo soggiorno</p>
        </div>
        <form class="form bk-form" novalidate>
          <div class="bk-sum"></div>
          <div class="row2">
            <label>Ospiti<select name="guests"></select></label>
            <label>Telefono<input name="phone" type="tel" autocomplete="tel" required placeholder="+39 …"></label>
          </div>
          <label>Nome e cognome<input name="name" autocomplete="name" required></label>
          <label>Email<input name="email" type="email" autocomplete="email" required placeholder="per la conferma"></label>
          <label><span>Note <span class="opt">(facoltative)</span></span><textarea name="notes" rows="2" maxlength="450" placeholder="Orario di arrivo, animali, esigenze per la colazione…"></textarea></label>
          ${canDeposit ? `<fieldset class="bk-pay"><legend class="mono">Pagamento</legend>
            <label class="radio"><input type="radio" name="payment" value="deposit" checked><span>Caparra ${pct}% <b class="pay-dep"></b><small>il resto all'arrivo</small></span></label>
            <label class="radio"><input type="radio" name="payment" value="full"><span>Intero soggiorno <b class="pay-full"></b><small>non pensi più a niente</small></span></label>
          </fieldset>` : ''}
          <label class="check"><input type="checkbox" name="ok" required><span>Ho letto le <a href="/condizioni" target="_blank">condizioni di prenotazione</a> e l'<a href="/privacy" target="_blank">informativa privacy</a>.</span></label>
          <p class="bk-err" role="alert" hidden></p>
          <button class="btn btn-terra full bk-submit" type="submit" disabled>Scegli le date</button>
          <p class="mono tiny pay-icons">Carta · Apple Pay · Google Pay — pagamento sicuro con Stripe</p>
          <a class="btn btn-ghost full bk-wa" target="_blank" rel="noopener">Preferisci chiedere prima? Scrivici su WhatsApp</a>
        </form>
      </div>`;

    root.querySelectorAll('.bk-rooms button').forEach((b) => b.addEventListener('click', () => setRoom(b.dataset.r)));
    root.querySelector('.cal-prev').addEventListener('click', () => shift(-1));
    root.querySelector('.cal-next').addEventListener('click', () => shift(1));
    root.querySelector('.cal-months').addEventListener('click', (e) => { const c = e.target.closest('[data-d]'); if (c && !c.disabled) pick(c.dataset.d); });
    root.querySelector('.bk-form').addEventListener('submit', submit);
    root.querySelector('.bk-form').addEventListener('change', summary);

    const qs = new URLSearchParams(location.search);
    if (qs.get('annullato')) showErr('Pagamento annullato: nessun addebito. Potete riprovare quando volete.');
    setRoom(room);
    window.addEventListener('resize', debounce(renderCal, 150));
  }

  function setRoom(id) {
    room = id;
    busy = new Set(cfg.busy[id] || []);
    if (start && end && !free(start, end)) { start = end = null; }
    root.querySelectorAll('.bk-rooms button').forEach((b) => b.setAttribute('aria-selected', b.dataset.r === id));
    const sel = root.querySelector('[name=guests]');
    const prev = Number(sel.value) || 2;
    sel.innerHTML = Array.from({ length: cfg.rooms[id].maxGuests }, (_, i) => `<option${i + 1 === Math.min(prev, cfg.rooms[id].maxGuests) ? ' selected' : ''}>${i + 1}</option>`).join('');
    renderCal();
    summary();
  }

  const lastMonth = () => add(cfg.today, cfg.rules.bookingWindowDays).slice(0, 7);
  const monthsShown = () => (root.querySelector('.cal').offsetWidth > 600 ? 2 : 1);
  const addMonth = (ym, n) => { let [y, m] = ym.split('-').map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return `${y}-${String(m).padStart(2, '0')}`; };

  function shift(n) {
    const next = addMonth(month, n);
    if (next < cfg.today.slice(0, 7) || next > lastMonth()) return;
    month = next;
    renderCal();
  }

  // Tutte le notti tra arrivo e partenza devono essere libere.
  function free(a, b) {
    for (let d = a; d < b; d = add(d, 1)) if (busy.has(d)) return false;
    return diff(a, b) <= cfg.rules.maxNights;
  }

  function canCheckout(d) { return start && !end && d > start && free(start, d); }

  function pick(d) {
    if (canCheckout(d)) { end = d; }
    else { start = d; end = null; }
    renderCal();
    summary();
  }

  function renderCal() {
    const wrap = root.querySelector('.cal-months');
    const n = monthsShown();
    const max = add(cfg.today, cfg.rules.bookingWindowDays);
    let html = '';
    for (let i = 0; i < n; i++) {
      const ym = addMonth(month, i);
      const [y, m] = ym.split('-').map(Number);
      const first = `${ym}-01`;
      const lead = (new Date(first + 'T00:00:00Z').getUTCDay() + 6) % 7; // lunedì = 0
      const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      html += `<div class="cal-month"><h4>${MESI[m - 1]} ${y}</h4><div class="cal-days mono"><span>L</span><span>M</span><span>M</span><span>G</span><span>V</span><span>S</span><span>D</span>`;
      html += '<i></i>'.repeat(lead);
      for (let day = 1; day <= days; day++) {
        const d = `${ym}-${String(day).padStart(2, '0')}`;
        const past = d < cfg.today || d > max;
        const isBusy = busy.has(d);
        const cls = [];
        if (past) cls.push('past');
        if (isBusy) cls.push('busy');
        if (d === start) cls.push('start');
        if (d === end) cls.push('end');
        if (start && end && d > start && d < end) cls.push('in');
        const ok = !past && (!isBusy || canCheckout(d));
        if (start && !end && d > start && !canCheckout(d)) cls.push('off');
        html += `<button type="button" data-d="${d}" class="${cls.join(' ')}"${ok ? '' : ' disabled'} aria-label="${day} ${MESI[m - 1]}${isBusy ? ', occupata' : ''}">${day}</button>`;
      }
      html += '</div></div>';
    }
    wrap.innerHTML = html;
    wrap.style.setProperty('--n', n);
    root.querySelector('.cal-prev').disabled = month <= cfg.today.slice(0, 7);
    root.querySelector('.cal-next').disabled = addMonth(month, n - 1) >= lastMonth();
    root.querySelector('.cal-hint').textContent = !start ? 'Scegli il giorno di arrivo' : !end ? 'Ora il giorno di partenza' : `${nice(start)} → ${nice(end)}`;
  }

  function summary() {
    const r = cfg.rooms[room];
    const f = root.querySelector('.bk-form');
    const btn = f.querySelector('.bk-submit');
    const sum = f.querySelector('.bk-sum');
    const nights = start && end ? diff(start, end) : 0;
    const total = nights * r.pricePerNight;
    const pct = cfg.rules.depositPercent;
    const dep = Math.round((total * pct) / 100);
    const tooShort = nights && nights < cfg.rules.minNights;

    sum.innerHTML = nights
      ? `<p class="mono kicker">${esc(r.name)}</p>
         <p class="bk-dates"><b>${nice(start)}</b> → <b>${nice(end)}</b> <span>${nights} ${nights === 1 ? 'notte' : 'notti'}</span></p>
         <p class="bk-total">${nights} × ${eur(r.pricePerNight)} = <b>${eur(total)}</b> <small>colazione inclusa</small></p>`
      : `<p class="mono kicker">${esc(r.name)} · ${eur(r.pricePerNight)} / notte</p><p class="bk-dates muted">Scegli arrivo e partenza sul calendario.</p>`;

    const d = f.querySelector('.pay-dep'), fu = f.querySelector('.pay-full');
    if (d) d.textContent = nights ? eur(dep) : '';
    if (fu) fu.textContent = nights ? eur(total) : '';

    const payment = f.querySelector('[name=payment]:checked')?.value || 'full';
    btn.disabled = !nights || tooShort;
    btn.textContent = !nights ? 'Scegli le date' : tooShort ? `Minimo ${cfg.rules.minNights} notti` : `Prenota e paga ${eur(payment === 'deposit' ? dep : total)}`;

    const msg = nights
      ? `Buongiorno Maddalena, vorrei informazioni per la ${r.name} dal ${nice(start)} al ${nice(end)} (${nights} notti) per ${val(f, "guests")} ospiti. Grazie!`
      : `Buongiorno Maddalena, vorrei informazioni sulla ${r.name}. Grazie!`;
    f.querySelector('.bk-wa').href = `https://wa.me/${cfg.property.whatsapp}?text=${encodeURIComponent(msg)}`;
  }

  const val = (f, n) => f.elements.namedItem(n).value;
  function showErr(t) { const e = root.querySelector('.bk-err'); e.textContent = t; e.hidden = !t; }

  async function submit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    showErr('');
    if (!f.reportValidity()) return;
    const btn = f.querySelector('.bk-submit');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Apro il pagamento sicuro…';
    let prev = null;
    try { prev = sessionStorage.getItem('bk-session'); } catch {}
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room, checkin: start, checkout: end,
          guests: Number(val(f, "guests")), name: val(f, "name"), email: val(f, "email"), phone: val(f, "phone"), notes: val(f, "notes"),
          payment: f.querySelector('[name=payment]:checked')?.value || 'full',
          replaceSession: prev,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        if (res.status === 409) refresh();
        throw new Error(data.error || 'Non siamo riusciti ad aprire il pagamento. Riprovate o scriveteci su WhatsApp.');
      }
      try { sessionStorage.setItem('bk-session', data.id); } catch {}
      location.href = data.url;
    } catch (err) {
      showErr(err.message);
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  function refresh() {
    fetch('/api/availability').then((r) => r.json()).then((d) => { cfg = d; start = end = null; setRoom(room); });
  }

  function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }
})();
