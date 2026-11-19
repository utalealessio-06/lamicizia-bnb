// Pannello riservato: blocco/sblocco date e prenotazioni ricevute.
(function () {
  const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const MB = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const nice = (s) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${MB[m - 1]} ${y}`; };
  const eur = (n) => '€ ' + Number(n).toLocaleString('it-IT', { maximumFractionDigits: 2 });
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const addMonth = (ym, n) => { let [y, m] = ym.split('-').map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return `${y}-${String(m).padStart(2, '0')}`; };

  const main = document.getElementById('adm');
  let pw = '';
  try { pw = sessionStorage.getItem('adm-pw') || ''; } catch {}
  let data, room, month, picked = new Set();

  async function api(body) {
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': pw }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => ({}));
    if (res.status === 401) { try { sessionStorage.removeItem('adm-pw'); } catch {} }
    if (!res.ok) throw Object.assign(new Error(out.error || 'Errore'), { status: res.status });
    return out;
  }

  document.getElementById('login').addEventListener('submit', async (e) => {
    e.preventDefault();
    pw = document.getElementById('pw').value;
    try { await load(); try { sessionStorage.setItem('adm-pw', pw); } catch {} }
    catch (err) { const el = document.getElementById('login-err'); el.textContent = err.message; el.hidden = false; }
  });
  if (pw) load().catch(() => {});

  async function load() {
    data = await api({ action: 'overview' });
    room ??= Object.keys(data.rooms)[0];
    month ??= data.today.slice(0, 7);
    render();
  }

  function render() {
    const upcoming = data.bookings.filter((b) => b.status !== 'cancellata' && b.checkout >= data.today);
    main.innerHTML = `
      <p class="mono kicker">Pannello prenotazioni</p>
      <h2>Calendario <em>delle camere</em></h2>
      <div class="adm-tabs">${Object.entries(data.rooms).map(([id, r]) => `<button data-r="${id}" aria-selected="${id === room}">${esc(r.name)}</button>`).join('')}</div>
      <div class="cal adm-cal">
        <div class="cal-nav"><button class="cal-prev" aria-label="Mese precedente">‹</button><p class="mono cal-hint">Tocca i giorni per selezionarli, poi blocca o sblocca</p><button class="cal-next" aria-label="Mese successivo">›</button></div>
        <div class="cal-months"></div>
        <p class="cal-legend mono"><span class="lg free"></span>libera <span class="lg" style="background:var(--olive)"></span>prenotata dal sito <span class="lg" style="background:var(--ink-2)"></span>bloccata da te <span class="lg" style="background:#e7b23f"></span>pagamento in corso</p>
        <div class="adm-bar">
          <input id="note" placeholder="Nota per il blocco (es. Booking – Rossi, chiusura)">
          <button class="btn btn-terra small" id="do-block">Blocca selezionate</button>
          <button class="btn btn-ghost small" id="do-unblock">Sblocca selezionate</button>
          <button class="btn btn-ghost small" id="do-clear">Annulla selezione</button>
        </div>
        <p class="adm-msg" id="msg"></p>
      </div>
      <h2 style="margin-top:60px">Prenotazioni <em>in arrivo</em></h2>
      <div class="adm-list">${upcoming.length ? upcoming.map(card).join('') : '<p>Nessuna prenotazione in arrivo dal sito.</p>'}</div>
      <p class="mono tiny" style="text-align:left;margin-top:24px">I rimborsi si fanno dal pannello di Stripe. Annullando qui, le date tornano libere sul sito.</p>`;

    main.querySelectorAll('.adm-tabs button').forEach((b) => b.onclick = () => { room = b.dataset.r; picked.clear(); render(); });
    main.querySelector('.cal-prev').onclick = () => { month = addMonth(month, -1); cal(); };
    main.querySelector('.cal-next').onclick = () => { month = addMonth(month, 1); cal(); };
    main.querySelector('.cal-months').onclick = (e) => {
      const c = e.target.closest('[data-d]');
      if (!c) return;
      const entry = data.calendars[room][c.dataset.d];
      if (entry?.t === 'booking') { const b = data.bookings.find((x) => x.id === entry.id); msg(b ? `${nice(c.dataset.d)}: prenotazione ${b.id} di ${b.name}` : 'Prenotazione dal sito'); return; }
      if (entry?.t === 'hold') { msg('Qualcuno sta pagando queste date in questo momento.'); return; }
      picked.has(c.dataset.d) ? picked.delete(c.dataset.d) : picked.add(c.dataset.d);
      if (entry?.t === 'block' && entry.note) msg(`${nice(c.dataset.d)}: ${entry.note}`);
      cal();
    };
    main.querySelector('#do-block').onclick = () => change('block');
    main.querySelector('#do-unblock').onclick = () => change('unblock');
    main.querySelector('#do-clear').onclick = () => { picked.clear(); cal(); };
    main.querySelectorAll('[data-cancel]').forEach((b) => b.onclick = () => cancel(b.dataset.cancel));
    cal();
  }

  function card(b) {
    return `<article class="adm-bk">
      <div>
        <h3>${esc(b.name)} · ${esc(b.roomName)}</h3>
        <p><b>${nice(b.checkin)} → ${nice(b.checkout)}</b> · ${b.nights} notti · ${b.guests} ospiti · codice ${esc(b.id)}</p>
        <p>Pagato ${eur(b.paid)} su ${eur(b.total)}${b.balance > 0 ? ` · <b>saldo all'arrivo ${eur(b.balance)}</b>` : ''}</p>
        <p>${esc(b.phone)} · <a href="mailto:${esc(b.email)}">${esc(b.email)}</a>${b.notes ? ` · «${esc(b.notes)}»` : ''}</p>
        ${b.conflicts ? `<p class="warn">Attenzione: date già occupate al momento del pagamento (${b.conflicts.map(nice).join(', ')}).</p>` : ''}
      </div>
      <button class="btn btn-ghost small" data-cancel="${esc(b.id)}">Annulla</button>
    </article>`;
  }

  function cal() {
    const wrap = main.querySelector('.cal-months');
    const n = wrap.offsetWidth > 600 ? 2 : 1;
    const c = data.calendars[room] || {};
    let html = '';
    for (let i = 0; i < n; i++) {
      const ym = addMonth(month, i);
      const [y, m] = ym.split('-').map(Number);
      const lead = (new Date(`${ym}-01T00:00:00Z`).getUTCDay() + 6) % 7;
      const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      html += `<div class="cal-month"><h4>${MESI[m - 1]} ${y}</h4><div class="cal-days mono"><span>L</span><span>M</span><span>M</span><span>G</span><span>V</span><span>S</span><span>D</span>${'<i></i>'.repeat(lead)}`;
      for (let d = 1; d <= days; d++) {
        const ds = `${ym}-${String(d).padStart(2, '0')}`;
        const e = c[ds];
        const cls = [e?.t || '', picked.has(ds) ? 'picked' : '', ds < data.today ? 'past' : ''].join(' ');
        html += `<button type="button" data-d="${ds}" class="${cls}" title="${e?.note ? esc(e.note) : ''}">${d}</button>`;
      }
      html += '</div></div>';
    }
    wrap.innerHTML = html;
    wrap.style.setProperty('--n', n);
  }

  function msg(t) { main.querySelector('#msg').textContent = t; }

  async function change(action) {
    if (!picked.size) return msg('Seleziona prima i giorni sul calendario.');
    try {
      const r = await api({ action, room, dates: [...picked], note: main.querySelector('#note').value });
      picked.clear();
      await load();
      msg(r.skipped?.length ? `Fatto. Saltati (occupati da prenotazioni): ${r.skipped.map(nice).join(', ')}` : 'Fatto.');
    } catch (e) { msg(e.message); }
  }

  async function cancel(id) {
    const b = data.bookings.find((x) => x.id === id);
    if (!confirm(`Annullare la prenotazione ${id} di ${b?.name}? Le date tornano libere. Il rimborso va fatto da Stripe.`)) return;
    try { await api({ action: 'cancel', id }); await load(); msg('Prenotazione annullata.'); } catch (e) { msg(e.message); }
  }
})();
