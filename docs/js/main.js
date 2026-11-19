// Menu mobile
const burger = document.querySelector('.burger'), nav = document.getElementById('nav');
burger.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));

const eur = (n) => '€ ' + n.toLocaleString('it-IT', { maximumFractionDigits: 2 });
const escHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Prezzi delle camere (unica fonte: netlify/lib/config.js)
if (document.querySelector('[data-price]')) {
  fetch('/api/availability').then((r) => r.json()).then((d) => {
    document.querySelectorAll('[data-price]').forEach((el) => {
      const r = d.rooms[el.dataset.price];
      if (r) el.textContent = eur(r.pricePerNight);
    });
  }).catch(() => {});
}

// Recensioni Google vere (se l'API non è configurata resta la sintesi statica)
const revBox = document.getElementById('reviews');
if (revBox) {
  fetch('/api/reviews').then((r) => (r.ok ? r.json() : Promise.reject())).then((g) => {
    if (g.rating) document.querySelectorAll('[data-g=rating]').forEach((e) => (e.textContent = g.rating.toLocaleString('it-IT', { maximumFractionDigits: 1 })));
    if (g.count) document.querySelectorAll('[data-g=count]').forEach((e) => (e.textContent = g.count));
    if (g.url) document.getElementById('g-link').href = g.url;
    if (!g.reviews?.length) return;
    revBox.innerHTML = g.reviews.map((r) => {
      const who = r.authorUrl ? `<a href="${escHtml(r.authorUrl)}" target="_blank" rel="noopener">${escHtml(r.author)}</a>` : escHtml(r.author);
      const pic = r.photo ? `<img src="${escHtml(r.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="ini">${escHtml((r.author || '?')[0])}</span>`;
      return `<article class="review">
        <header>${pic}<div><h3>${who}</h3><time>${escHtml(r.when || '')}</time></div></header>
        <span class="stars" aria-label="${r.rating} stelle su 5">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
        <p class="clamp">${escHtml(r.text)}</p>
      </article>`;
    }).join('');
    revBox.querySelectorAll('p.clamp').forEach((p) => {
      if (p.scrollHeight > p.clientHeight + 4) {
        const b = document.createElement('button');
        b.textContent = 'Leggi tutto';
        b.onclick = () => { p.classList.remove('clamp'); b.remove(); };
        p.after(b);
      }
    });
    revBox.hidden = false;
    document.getElementById('reviews-fallback').hidden = true;
  }).catch(() => {});
}
