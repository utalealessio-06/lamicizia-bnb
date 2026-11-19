// Calendario delle date libere + prenotazione diretta con pagamento Stripe.
// Si monta su <div data-booking [data-room="viola"]>. Lingua presa da <html lang>.
(function () {
  const root = document.querySelector('[data-booking]');
  if (!root) return;

  const EN = document.documentElement.lang === 'en';
  const L = EN
    ? {
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        dow: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        loading: 'Loading the calendar…', unavailable: 'The calendar is not available right now.', askWa: 'Ask for dates on WhatsApp',
        upTo: (n) => `up to ${n}`, from: 'from', perNight: '/night', prev: 'Previous month', next: 'Next month',
        free: 'available', busy: 'booked', sel: 'your stay', guests: 'Guests', phone: 'Phone', name: 'Full name', email: 'Email',
        emailPh: 'for your confirmation', notes: 'Notes', optional: '(optional)', notesPh: 'Arrival time, pets, breakfast requirements…',
        payment: 'Payment', deposit: (p) => `${p}% deposit`, depositSub: 'balance on arrival', full: 'Whole stay', fullSub: 'nothing left to pay',
        agree: `I have read the <a href="/en/condizioni" target="_blank">booking terms</a> and the <a href="/en/privacy" target="_blank">privacy policy</a>.`,
        pickDates: 'Choose your dates', payIcons: 'Card · Apple Pay · Google Pay — secure payment by Stripe', waAsk: 'Prefer to ask first? Message us on WhatsApp',
        cancelled: 'Payment cancelled: you have not been charged. You can try again whenever you like.',
        hintStart: 'Choose your arrival day', hintEnd: 'Now choose your departure day', busyLabel: ', booked',
        night: (n) => (n === 1 ? 'night' : 'nights'), guest: (n) => (n === 1 ? 'guest' : 'guests'), bf: 'breakfast included',
        perNightFor: (p, g) => `${p} / night for ${g}`, pickHint: 'Choose arrival and departure on the calendar.',
        minN: (n) => `Minimum ${n} nights`, payBtn: (p) => `Book and pay ${p}`, opening: 'Opening secure payment…',
        payFail: 'We could not open the payment page. Please try again or message us on WhatsApp.',
        waDates: (r, a, b, n, g) => `Hello Maddalena, I'd like some information about the ${r} from ${a} to ${b} (${n} nights) for ${g} guests. Thank you!`,
        waRoom: (r) => `Hello Maddalena, I'd like some information about the ${r}. Thank you!`,
        locale: 'en-GB', nice: (d, m) => `${d} ${m}`,
      }
    : {
        months: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
        short: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
        dow: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
        loading: 'Carico il calendario…', unavailable: 'Il calendario non è disponibile in questo momento.', askWa: 'Chiedi le date su WhatsApp',
        upTo: (n) => `fino a ${n}`, from: 'da', perNight: '/notte', prev: 'Mese precedente', next: 'Mese successivo',
        free: 'libera', busy: 'occupata', sel: 'il tuo soggiorno', guests: 'Ospiti', phone: 'Telefono', name: 'Nome e cognome', email: 'Email',
        emailPh: 'per la conferma', notes: 'Note', optional: '(facoltative)', notesPh: 'Orario di arrivo, animali, esigenze per la colazione…',
        payment: 'Pagamento', deposit: (p) => `Caparra ${p}%`, depositSub: "il resto all'arrivo", full: 'Intero soggiorno', fullSub: 'non pensi più a niente',
        agree: `Ho letto le <a href="/condizioni" target="_blank">condizioni di prenotazione</a> e l'<a href="/privacy" target="_blank">informativa privacy</a>.`,
        pickDates: 'Scegli le date', payIcons: 'Carta · Apple Pay · Google Pay — pagamento sicuro con Stripe', waAsk: 'Preferisci chiedere prima? Scrivici su WhatsApp',
        cancelled: 'Pagamento annullato: nessun addebito. Potete riprovare quando volete.',
        hintStart: 'Scegli il giorno di arrivo', hintEnd: 'Ora il giorno di partenza', busyLabel: ', occupata',
        night: (n) => (n === 1 ? 'notte' : 'notti'), guest: (n) => (n === 1 ? 'ospite' : 'ospiti'), bf: 'colazione inclusa',
        perNightFor: (p, g) => `${p} / notte per ${g}`, pickHint: 'Scegli arrivo e partenza sul calendario.',
        minN: (n) => `Minimo ${n} notti`, payBtn: (p) => `Prenota e paga ${p}`, opening: 'Apro il pagamento sicuro…',
        payFail: 'Non siamo riusciti ad aprire il pagamento. Riprovate o scriveteci su WhatsApp.',
        waDates: (r, a, b, n, g) => `Buongiorno Maddalena, vorrei informazioni per la ${r} dal ${a} al ${b} (${n} notti) per ${g} ospiti. Grazie!`,
        waRoom: (r) => `Buongiorno Maddalena, vorrei informazioni sulla ${r}. Grazie!`,
        locale: 'it-IT', nice: (d, m) => `${d} ${m}`,
      };

  const add = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const diff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
  const nice = (s) => { const [, m, d] = s.split('-').map(Number); return L.nice(d, L.short[m - 1]); };
  const eur = (n) => '€ ' + n.toLocaleString(L.locale, { maximumFractionDigits: 2 });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const rname = (r) => (EN ? r.nameEn : r.name);

  const fixedRoom = root.dataset.room || null;
  let cfg, room = fixedRoom, start = null, end = null, month, busy = new Set();

  root.innerHTML = `<p class="bk-loading mono">${L.loading}</p>`;

  fetch('/api/availability')
    .then((r) => { if (!r.ok) throw 0; return r.json(); })
    .then((data) => { cfg = data; if (!room) room = Object.keys(cfg.rooms)[0]; month = cfg.today.slice(0, 7); build(); })
    .catch(() => {
      root.innerHTML = `<div class="bk-error"><p>${L.unavailable}</p>
        <a class="btn btn-terra" href="https://wa.me/393288712971">${L.askWa}</a></div>`;
    });

  function build() {
    const pct = cfg.rules.depositPercent;
    const canDeposit = pct > 0 && pct < 100;
    const roomTabs = fixedRoom ? '' : `<div class="bk-rooms" role="tablist">${Object.entries(cfg.rooms)
      .map(([id, r]) => `<button type="button" role="tab" data-r="${id}">${esc(rname(r))}<small>${L.upTo(r.maxGuests)} · ${L.from} ${eur(r.pricePerNight)}${L.perNight}</small></button>`).join('')}</div>`;

    root.innerHTML = `
      ${roomTabs}
      <div class="bk-grid">
        <div class="cal">
          <div class="cal-nav">
            <button type="button" class="cal-prev" aria-label="${L.prev}">‹</button>
            <p class="mono cal-hint"></p>
            <button type="button" class="cal-next" aria-label="${L.next}">›</button>
          </div>
          <div class="cal-months"></div>
          <p class="cal-legend mono"><span class="lg free"></span>${L.free} <span class="lg busy"></span>${L.busy} <span class="lg sel"></span>${L.sel}</p>
        </div>
        <form class="form bk-form" novalidate>
          <div class="bk-sum"></div>
          <div class="row2">
            <label>${L.guests}<select name="guests"></select></label>
            <label>${L.phone}<input name="phone" type="tel" autocomplete="tel" required placeholder="+39 …"></label>
          </div>
          <label>${L.name}<input name="name" autocomplete="name" required></label>
          <label>${L.email}<input name="email" type="email" autocomplete="email" required placeholder="${L.emailPh}"></label>
          <label><span>${L.notes} <span class="opt">${L.optional}</span></span><textarea name="notes" rows="2" maxlength="450" placeholder="${L.notesPh}"></textarea></label>
          ${canDeposit ? `<fieldset class="bk-pay"><legend class="mono">${L.payment}</legend>
            <label class="radio"><input type="radio" name="payment" value="deposit" checked><span>${L.deposit(pct)} <b class="pay-dep"></b><small>${L.depositSub}</small></span></label>
            <label class="radio"><input type="radio" name="payment" value="full"><span>${L.full} <b class="pay-full"></b><small>${L.fullSub}</small></span></label>
          </fieldset>` : ''}
          <label class="check"><input type="checkbox" name="ok" required><span>${L.agree}</span></label>
          <p class="bk-err" role="alert" hidden></p>
          <button class="btn btn-terra full bk-submit" type="submit" disabled>${L.pickDates}</button>
          <p class="mono tiny pay-icons">${L.payIcons}</p>
          <a class="btn btn-ghost full bk-wa" target="_blank" rel="noopener">${L.waAsk}</a>
        </form>
      </div>`;

    root.querySelectorAll('.bk-rooms button').forEach((b) => b.addEventListener('click', () => setRoom(b.dataset.r)));
    root.querySelector('.cal-prev').addEventListener('click', () => shift(-1));
    root.querySelector('.cal-next').addEventListener('click', () => shift(1));
    root.querySelector('.cal-months').addEventListener('click', (e) => { const c = e.target.closest('[data-d]'); if (c && !c.disabled) pick(c.dataset.d); });
    root.querySelector('.bk-form').addEventListener('submit', submit);
    root.querySelector('.bk-form').addEventListener('change', summary);

    const qs = new URLSearchParams(location.search);
    if (qs.get('annullato')) showErr(L.cancelled);
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
      const lead = (new Date(`${ym}-01T00:00:00Z`).getUTCDay() + 6) % 7; // lunedì = 0
      const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      html += `<div class="cal-month"><h4>${L.months[m - 1]} ${y}</h4><div class="cal-days mono">${L.dow.map((x) => `<span>${x}</span>`).join('')}`;
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
        html += `<button type="button" data-d="${d}" class="${cls.join(' ')}"${ok ? '' : ' disabled'} aria-label="${day} ${L.months[m - 1]}${isBusy ? L.busyLabel : ''}">${day}</button>`;
      }
      html += '</div></div>';
    }
    wrap.innerHTML = html;
    wrap.style.setProperty('--n', n);
    root.querySelector('.cal-prev').disabled = month <= cfg.today.slice(0, 7);
    root.querySelector('.cal-next').disabled = addMonth(month, n - 1) >= lastMonth();
    root.querySelector('.cal-hint').textContent = !start ? L.hintStart : !end ? L.hintEnd : `${nice(start)} → ${nice(end)}`;
  }

  const val = (f, n) => f.elements.namedItem(n).value;

  function summary() {
    const r = cfg.rooms[room];
    const f = root.querySelector('.bk-form');
    const btn = f.querySelector('.bk-submit');
    const sum = f.querySelector('.bk-sum');
    const nights = start && end ? diff(start, end) : 0;
    const guests = Number(val(f, 'guests')) || 1;
    const perNight = r.prices[guests];
    const total = nights * perNight;
    const pct = cfg.rules.depositPercent;
    const dep = Math.round((total * pct) / 100);
    const tooShort = nights && nights < cfg.rules.minNights;
    const g = `${guests} ${L.guest(guests)}`;

    sum.innerHTML = nights
      ? `<p class="mono kicker">${esc(rname(r))}</p>
         <p class="bk-dates"><b>${nice(start)}</b> → <b>${nice(end)}</b> <span>${nights} ${L.night(nights)}</span></p>
         <p class="bk-total">${nights} × ${eur(perNight)} (${g}) = <b>${eur(total)}</b> <small>${L.bf}</small></p>`
      : `<p class="mono kicker">${esc(rname(r))} · ${L.perNightFor(eur(perNight), g)}</p><p class="bk-dates muted">${L.pickHint}</p>`;

    const d = f.querySelector('.pay-dep'), fu = f.querySelector('.pay-full');
    if (d) d.textContent = nights ? eur(dep) : '';
    if (fu) fu.textContent = nights ? eur(total) : '';

    const payment = f.querySelector('[name=payment]:checked')?.value || 'full';
    btn.disabled = !nights || tooShort;
    btn.textContent = !nights ? L.pickDates : tooShort ? L.minN(cfg.rules.minNights) : L.payBtn(eur(payment === 'deposit' ? dep : total));

    const msg = nights ? L.waDates(rname(r), nice(start), nice(end), nights, guests) : L.waRoom(rname(r));
    f.querySelector('.bk-wa').href = `https://wa.me/${cfg.property.whatsapp}?text=${encodeURIComponent(msg)}`;
  }

  function showErr(t) { const e = root.querySelector('.bk-err'); e.textContent = t; e.hidden = !t; }

  async function submit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    showErr('');
    if (!f.reportValidity()) return;
    const btn = f.querySelector('.bk-submit');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = L.opening;
    let prev = null;
    try { prev = sessionStorage.getItem('bk-session'); } catch {}
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room, checkin: start, checkout: end, lang: EN ? 'en' : 'it',
          guests: Number(val(f, 'guests')), name: val(f, 'name'), email: val(f, 'email'), phone: val(f, 'phone'), notes: val(f, 'notes'),
          payment: f.querySelector('[name=payment]:checked')?.value || 'full',
          replaceSession: prev,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        if (res.status === 409) refresh();
        throw new Error(data.error || L.payFail);
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
