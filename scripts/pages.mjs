// Genera le pagine statiche in italiano (docs/) e inglese (docs/en/).
// Uso: node scripts/pages.mjs
// La home (docs/index.html e docs/en/index.html) e il pannello admin sono scritti a mano.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const WA = '393288712971';

const UI = {
  it: {
    nav: { rooms: 'Camere', breakfast: 'Colazione', around: 'Dintorni', reviews: 'Recensioni', book: 'Prenota' },
    since: 'dal 2014', terms: 'Condizioni', privacy: 'Privacy e cookie', wa: 'Scrivi su WhatsApp', menu: 'Menu',
    langLabel: 'English', langShort: 'EN',
  },
  en: {
    nav: { rooms: 'Rooms', breakfast: 'Breakfast', around: 'Getting here', reviews: 'Reviews', book: 'Book' },
    since: 'since 2014', terms: 'Booking terms', privacy: 'Privacy & cookies', wa: 'Message us on WhatsApp', menu: 'Menu',
    langLabel: 'Italiano', langShort: 'IT',
  },
};

const base = (lang) => (lang === 'en' ? '/en' : '');
const other = (lang, path) => (lang === 'en' ? path : '/en' + (path === '/' ? '/' : path));

export function header(lang, cur, path) {
  const u = UI[lang], b = base(lang);
  return `<header class="top">
  <div class="wrap bar">
    <a class="brand" href="${b}/">
      <img src="/img/logo-ink.png" alt="" class="stamp-sm">
      <span>B&amp;B <em>L'Amicizia</em></span>
    </a>
    <nav class="nav" id="nav">
      <a href="${b}/#camere"${cur === 'camere' ? ' aria-current="page"' : ''}>${u.nav.rooms}</a>
      <a href="${b}/#colazione">${u.nav.breakfast}</a>
      <a href="${b}/dintorni"${cur === 'dintorni' ? ' aria-current="page"' : ''}>${u.nav.around}</a>
      <a href="${b}/#ospiti">${u.nav.reviews}</a>
    </nav>
    <a class="lang mono" href="${other(lang, path)}" hreflang="${lang === 'en' ? 'it' : 'en'}" lang="${lang === 'en' ? 'it' : 'en'}" title="${u.langLabel}">${u.langShort}</a>
    <a class="btn btn-terra small" href="${cur === 'camere' ? '#prenota' : b + '/#prenota'}">${u.nav.book}</a>
    <button class="burger" aria-label="${u.menu}" aria-expanded="false"><span></span></button>
  </div>
</header>`;
}

export function footer(lang) {
  const u = UI[lang], b = base(lang);
  return `<footer class="foot">
  <div class="wrap foot-row">
    <span class="brand small"><img src="/img/logo-ink.png" alt="" class="stamp-sm"><span>B&amp;B <em>L'Amicizia</em> · ${u.since}</span></span>
    <span class="mono"><a href="${b}/condizioni">${u.terms}</a> · <a href="${b}/privacy">${u.privacy}</a> · CIN IT056036C16TV8HPD4 · CIR 056036-B&amp;B-00006</span>
  </div>
</footer>

<a class="wa-float" href="https://wa.me/${WA}" aria-label="${u.wa}"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z"/></svg></a>`;
}

export function page({ lang, path, title, desc, cur = '', body, scripts = [], noindex = false }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">${noindex ? '\n<meta name="robots" content="noindex">' : ''}
<link rel="icon" href="/img/logo-ink.png">
<link rel="stylesheet" href="/css/style.css">
</head>
<body>

${header(lang, cur, path)}

<main>
${body}
</main>

${footer(lang)}

<script src="/js/main.js"></script>
${scripts.map((s) => `<script src="/js/${s}.js"></script>`).join('\n')}
</body>
</html>
`;
}

function write(lang, path, html) {
  const dir = lang === 'en' ? join(DOCS, 'en') : DOCS;
  mkdirSync(dir, { recursive: true });
  const file = path === '/' ? 'index.html' : path.slice(1) + '.html';
  writeFileSync(join(dir, file), html);
}

const T = (s) => `<span class="todo">${s}</span>`;
const q = (s) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s);

// ---------------------------------------------------------------- Camere
const ROOMS = [
  {
    id: 'viola', guests: 2, img: 'camera-viola.jpg',
    it: {
      name: 'Camera Viola',
      lead: 'La camera per due: raccolta, luminosa e tranquilla, con il bagno privato.',
      text: ["Pensata per una coppia o per chi viaggia da solo e vuole un po' di silenzio dopo una giornata tra il lago e i borghi della Tuscia.", 'La mattina si scende per la colazione in terrazza con i dolci fatti in casa; il pomeriggio ci sono la piscina e il giardino.'],
    },
    en: {
      name: 'Violet Room',
      lead: 'The room for two: cosy, bright and quiet, with a private bathroom.',
      text: ['Made for couples, or for solo travellers who want a little peace after a day exploring the lake and the hill towns of Tuscia.', 'In the morning, breakfast on the terrace with homemade cakes; in the afternoon, the pool and the garden.'],
    },
  },
  {
    id: 'verde', guests: 3, img: 'camera-verde.jpg',
    it: {
      name: 'Camera Verde',
      lead: "Spazio per tre, con il bagno privato e la campagna tutt'intorno.",
      text: ['Comoda per una famiglia piccola o per tre amici in giro per la Tuscia: il lago di Bolsena, Civita di Bagnoregio e Bomarzo sono tutti tra i 10 e i 15 km.', 'Colazione inclusa ogni mattina, piscina e giardino a disposizione per tutto il soggiorno.'],
    },
    en: {
      name: 'Green Room',
      lead: 'Room for three, with a private bathroom and the countryside all around.',
      text: ['Comfortable for a small family or three friends touring Tuscia: Lake Bolsena, Civita di Bagnoregio and Bomarzo are all between 10 and 15 km away.', 'Breakfast included every morning, with the pool and garden yours for the whole stay.'],
    },
  },
  {
    id: 'classica', guests: 4, img: 'camera-classica.jpg',
    it: {
      name: 'Camera Classica',
      lead: 'La più grande: fino a quattro ospiti, con il bagno privato.',
      text: ["La scelta per le famiglie o per due coppie che viaggiano insieme. C'è posto per tutti, e il parcheggio è compreso.", "Si fa colazione insieme in terrazza e si passa il pomeriggio a bordo piscina, con la campagna della Tuscia all'orizzonte."],
    },
    en: {
      name: 'Classic Room',
      lead: 'Our largest room: up to four guests, with a private bathroom.',
      text: ['The choice for families or two couples travelling together. There is space for everyone, and parking is included.', 'Breakfast together on the terrace, afternoons by the pool, with the Tuscia countryside on the horizon.'],
    },
  },
];

const R = {
  it: {
    all: '← Tutte le camere', upTo: (n) => `Fino a ${n} ospiti`, kicker: (n) => `Fino a ${n} ospiti · bagno privato · colazione inclusa`,
    pool: 'La piscina del B&amp;B con vista sulla campagna', bf: 'La colazione in terrazza', the: 'La camera',
    amen: (n) => [`Fino a ${n} ospiti`, 'Bagno privato', 'Colazione inclusa', 'Aria condizionata', 'Wi-Fi gratuito', 'Parcheggio', 'Piscina e giardino', 'Animali su accordo'],
    from: 'da', night: '/ notte', arr: 'Arrivo', arrV: '12:00 – 20:00', dep: 'Partenza', depV: 'entro le 10:30', bfk: 'Colazione', bfkV: 'inclusa, con dolci fatti in casa',
    dates: 'Vedi le date libere', bookK: 'Prenota direttamente · nessuna commissione', bookH: (n) => `Le date libere della <em>${n}</em>`,
    others: 'Le altre camere', see: 'Vedi la camera →',
    title: (n) => `${n} · B&amp;B L'Amicizia, Montefiascone`,
    desc: (n, g) => `${n} al B&amp;B L'Amicizia di Montefiascone: fino a ${g} ospiti, bagno privato, colazione inclusa, piscina. Vedi le date libere e prenota direttamente.`,
  },
  en: {
    all: '← All rooms', upTo: (n) => `Up to ${n} guests`, kicker: (n) => `Up to ${n} guests · private bathroom · breakfast included`,
    pool: 'The B&amp;B pool overlooking the countryside', bf: 'Breakfast on the terrace', the: 'The room',
    amen: (n) => [`Up to ${n} guests`, 'Private bathroom', 'Breakfast included', 'Air conditioning', 'Free Wi-Fi', 'Parking', 'Pool and garden', 'Pets on request'],
    from: 'from', night: '/ night', arr: 'Check-in', arrV: '12:00 – 20:00', dep: 'Check-out', depV: 'by 10:30', bfk: 'Breakfast', bfkV: 'included, with homemade cakes',
    dates: 'See available dates', bookK: 'Book direct · no booking fees', bookH: (n) => `Available dates for the <em>${n}</em>`,
    others: 'Our other rooms', see: 'See the room →',
    title: (n) => `${n} · B&amp;B L'Amicizia, Montefiascone`,
    desc: (n, g) => `${n} at B&amp;B L'Amicizia in Montefiascone, Italy: up to ${g} guests, private bathroom, breakfast included, pool. Check availability and book direct.`,
  },
};

function roomPage(lang, r) {
  const t = R[lang], c = r[lang], b = base(lang);
  const [first, ...rest] = c.name.split(' ');
  const h1 = lang === 'it' ? `${first} <em>${rest.join(' ')}</em>` : `<em>${first}</em> ${rest.join(' ')}`;
  const others = ROOMS.filter((o) => o.id !== r.id);
  const body = `<section class="page-head">
  <div class="wrap">
    <a class="crumb" href="${b}/#camere">${t.all}</a>
    <p class="mono kicker">${t.kicker(r.guests)}</p>
    <h1>${h1}</h1>
    <p class="lead">${c.lead}</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="room-hero">
      <img class="main" src="/img/${r.img}" alt="${c.name}">
      <img class="side" src="/img/piscina-vista.jpg" alt="${t.pool}" loading="lazy">
      <img class="side" src="/img/colazione.jpg" alt="${t.bf}" loading="lazy">
    </div>
    <div class="room-info">
      <div>
        <h2>${t.the}</h2>
        ${c.text.map((p) => `<p>${p}</p>`).join('\n        ')}
        <ul class="amen">
          ${t.amen(r.guests).map((a) => `<li>${a}</li>`).join('\n          ')}
        </ul>
      </div>
      <aside class="room-card">
        <div class="price"><span class="mono">${t.from}</span> <span data-price="${r.id}">€ —</span> <span class="mono">${t.night}</span></div>
        <dl>
          <div><dt>${t.arr}</dt><dd>${t.arrV}</dd></div>
          <div><dt>${t.dep}</dt><dd>${t.depV}</dd></div>
          <div><dt>${t.bfk}</dt><dd>${t.bfkV}</dd></div>
        </dl>
        <a class="btn btn-terra full" href="#prenota">${t.dates}</a>
      </aside>
    </div>
  </div>
</section>

<section class="book" id="prenota">
  <div class="wrap book-full">
    <div class="sec-head">
      <p class="mono kicker">${t.bookK}</p>
      <h2>${t.bookH(c.name)}</h2>
    </div>
    <div data-booking data-room="${r.id}"></div>
  </div>
</section>

<section class="other-rooms">
  <div class="wrap">
    <div class="sec-head"><p class="mono kicker">${t.others}</p></div>
    <div class="room-grid">
      ${others.map((o, i) => `<a class="polaroid ${i ? 'tilt-r' : 'tilt-l'}" href="${b}/camera-${o.id}">
        <span class="tape"></span>
        <img src="/img/${o.img}" alt="${o[lang].name}" loading="lazy">
        <div class="cap"><h3>${o[lang].name}</h3><p class="mono">${t.upTo(o.guests)}</p><span class="link mono">${t.see}</span></div>
      </a>`).join('\n      ')}
    </div>
  </div>
</section>`;
  const path = `/camera-${r.id}`;
  write(lang, path, page({ lang, path, title: t.title(c.name), desc: t.desc(c.name, r.guests), cur: 'camere', body, scripts: ['booking'] }));
}

// ---------------------------------------------------------------- Dintorni
const ADDRESS_Q = "B&B L'Amicizia, Via Cassia Vecchia 100, 01027 Montefiascone VT";
const SIGHTS = [
  { d: '700 m', s: 'Cattedrale di Santa Margherita Montefiascone',
    it: ['Il centro di Montefiascone', 'La Cattedrale di Santa Margherita, con la cupola che si vede dal giardino, e Piazza Vittorio Emanuele: si arriva a piedi.'],
    en: ['Montefiascone old town', 'The Cathedral of Santa Margherita, whose dome you can see from our garden, and Piazza Vittorio Emanuele: an easy walk away.'] },
  { d: '880 m', s: 'Rocca dei Papi Montefiascone',
    it: ['Rocca dei Papi', 'Il punto più alto del paese, con il belvedere sul lago di Bolsena. Al tramonto è il posto giusto.'],
    en: ['Rocca dei Papi', 'The highest point in town, with a viewpoint over Lake Bolsena. The place to be at sunset.'] },
  { d: '5 km', s: 'terme libere Montefiascone',
    it: ['Terme libere', "Le vasche termali all'aperto, a ingresso libero, a pochi minuti di macchina."],
    en: ['Free hot springs', 'Open-air thermal pools, free to enter, a few minutes away by car.'] },
  { d: '10 km', s: 'Capodimonte lago di Bolsena',
    it: ['Bolsena e Capodimonte', 'I paesi sul lago: passeggiata sul lungolago, spiagge e giri in barca nella bella stagione.'],
    en: ['Bolsena and Capodimonte', 'The lakeside villages: waterfront walks, beaches and boat trips in the warmer months.'] },
  { d: '12 km', s: 'Parco dei Mostri Bomarzo',
    it: ['Parco dei Mostri di Bomarzo', 'Il giardino del Cinquecento con le sculture giganti nella roccia. Piace a grandi e bambini.'],
    en: ['Bomarzo Monster Park', 'A 16th-century garden of giant figures carved into the rock. Loved by adults and children alike.'] },
  { d: '12 km', s: "Sant'Angelo di Roccalvecce paese delle fiabe",
    it: ["Sant'Angelo, il Paese delle Fiabe", 'Il borgo dove i muri delle case sono dipinti con le fiabe più famose.'],
    en: ["Sant'Angelo, the Fairy-Tale Village", 'A tiny village where the house walls are painted with famous fairy tales.'] },
  { d: '15 km', s: 'Civita di Bagnoregio',
    it: ['Civita di Bagnoregio', 'Il borgo sullo sperone di tufo, che si raggiunge a piedi attraverso il ponte.'],
    en: ['Civita di Bagnoregio', 'The village perched on a tufa outcrop, reached on foot across a long bridge.'] },
  { d: '15 km', s: 'Terme dei Papi Viterbo',
    it: ['Terme dei Papi', 'Lo stabilimento termale di Viterbo con la grande piscina di acqua calda.'],
    en: ['Terme dei Papi', "Viterbo's thermal spa, with a large pool of naturally hot water."] },
  { d: '84 km', s: 'Aeroporto Fiumicino',
    it: ['Aeroporto di Fiumicino', 'Il punto di arrivo più comodo per chi viene in aereo.'],
    en: ['Rome Fiumicino Airport', 'The most convenient airport if you are flying in.'] },
];

const D = {
  it: {
    kicker: 'Come arrivare e cosa vedere', h1: 'Nel cuore <em>della Tuscia.</em>',
    lead: 'Siamo in Via Cassia Vecchia 100, ai margini di Montefiascone: fuori dal traffico, ma a 700 metri dal centro.',
    mapTitle: "Mappa del B&amp;B L'Amicizia",
    consent: 'La mappa è fornita da Google, che può impostare cookie e ricevere il vostro indirizzo IP.', privacy: 'Informativa privacy',
    show: 'Mostra la mappa', remember: 'Ricorda la mia scelta', addr: 'Indirizzo', route: 'Calcola il percorso',
    how: [
      ['In auto da Roma', 'Via Cassia (SS2) in direzione Viterbo, poi verso Montefiascone. In alternativa A1 fino a Orte, superstrada per Viterbo e poi la Cassia verso nord.'],
      ['In auto da Firenze e dal Nord', 'A1 con uscita Orvieto, poi la statale in direzione Montefiascone e lago di Bolsena.'],
      ['In treno o in aereo', "Le stazioni più comode sono Orvieto (linea Roma–Firenze) e Viterbo; l'aeroporto più vicino è Fiumicino, a 84 km. Scriveteci prima di partire e vi diamo una mano a organizzare l'ultimo tratto."],
      ['Parcheggio', "C'è il parcheggio per gli ospiti, compreso nel soggiorno."],
    ],
    sk: 'Il taccuino dei dintorni', sh: 'Cosa vedere <em>in zona.</em>', sp: 'Distanze dal B&amp;B. Chiedete pure a Maddalena: i consigli migliori sono i suoi.', open: 'Apri sulla mappa →',
    title: "Come arrivare e cosa vedere · B&amp;B L'Amicizia, Montefiascone",
    desc: "Mappa, indicazioni per arrivare al B&amp;B L'Amicizia di Montefiascone e cosa vedere nella Tuscia: lago di Bolsena, Civita di Bagnoregio, Bomarzo, terme.",
  },
  en: {
    kicker: 'Getting here and what to see', h1: 'In the heart <em>of Tuscia.</em>',
    lead: 'We are at Via Cassia Vecchia 100, on the edge of Montefiascone: away from the traffic, yet just 700 metres from the old town.',
    mapTitle: "Map of B&amp;B L'Amicizia",
    consent: 'The map is provided by Google, which may set cookies and receive your IP address.', privacy: 'Privacy policy',
    show: 'Show the map', remember: 'Remember my choice', addr: 'Address', route: 'Get directions',
    how: [
      ['By car from Rome', 'Take the Via Cassia (SS2) towards Viterbo, then follow signs for Montefiascone. Alternatively, take the A1 motorway to Orte, the expressway to Viterbo, then the Cassia north.'],
      ['By car from Florence and the north', 'A1 motorway, exit Orvieto, then the main road towards Montefiascone and Lake Bolsena.'],
      ['By train or plane', 'The handiest railway stations are Orvieto (Rome–Florence line) and Viterbo; the nearest airport is Rome Fiumicino, 84 km away. Message us before you travel and we will help you plan the last leg.'],
      ['Parking', 'Free guest parking is included in your stay.'],
    ],
    sk: 'Our notebook of the area', sh: 'What to see <em>nearby.</em>', sp: 'Distances from the B&amp;B. Just ask Maddalena: she gives the best tips.', open: 'Open in Maps →',
    title: "Getting here and what to see · B&amp;B L'Amicizia, Montefiascone",
    desc: "Map, directions to B&amp;B L'Amicizia in Montefiascone and what to see in Tuscia: Lake Bolsena, Civita di Bagnoregio, Bomarzo, hot springs.",
  },
};

function dintorni(lang) {
  const t = D[lang], b = base(lang);
  const body = `<section class="page-head">
  <div class="wrap">
    <p class="mono kicker">${t.kicker}</p>
    <h1>${t.h1}</h1>
    <p class="lead">${t.lead}</p>
  </div>
</section>

<section>
  <div class="wrap map-row">
    <div class="map" data-map="https://maps.google.com/maps?q=${encodeURIComponent(ADDRESS_Q)}&amp;z=14&amp;output=embed&amp;hl=${lang}" data-map-title="${t.mapTitle}">
      <div class="map-consent">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>
        <p>${t.consent} <a href="${b}/privacy">${t.privacy}</a></p>
        <button type="button" class="btn btn-terra">${t.show}</button>
        <label class="check"><input type="checkbox"> <span>${t.remember}</span></label>
      </div>
    </div>
    <div class="how">
      <div>
        <p class="mono kicker">${t.addr}</p>
        <h3>Via Cassia Vecchia, 100<br>01027 Montefiascone (VT)</h3>
        <a class="btn btn-terra" style="margin-top:14px" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&amp;destination=${encodeURIComponent('Via Cassia Vecchia 100, 01027 Montefiascone VT')}">${t.route}</a>
      </div>
      ${t.how.map(([h, p]) => `<div><h3>${h}</h3><p>${p}</p></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="sights">
  <div class="wrap">
    <div class="sec-head">
      <p class="mono kicker">${t.sk}</p>
      <h2>${t.sh}</h2>
      <p style="color:#d4e0e6">${t.sp}</p>
    </div>
    <div class="sight-grid">
      ${SIGHTS.map((s) => `<article class="sight"><b>${s.d}</b><h3>${s[lang][0]}</h3><p>${s[lang][1]}</p><a target="_blank" rel="noopener" href="${q(s.s)}">${t.open}</a></article>`).join('\n      ')}
    </div>
  </div>
</section>`;
  write(lang, '/dintorni', page({ lang, path: '/dintorni', title: t.title, desc: t.desc, cur: 'dintorni', body }));
}

// ---------------------------------------------------------------- Condizioni
function condizioni(lang) {
  const it = lang === 'it';
  const body = it
    ? `<section class="page-head"><div class="wrap">
  <p class="mono kicker">Prima di prenotare</p>
  <h1>Condizioni <em>di prenotazione</em></h1>
</div></section>
<section><div class="wrap prose">
  <h2>Prenotazione e pagamento</h2>
  <p>La prenotazione fatta sul sito è confermata quando il pagamento va a buon fine: riceverete subito una email di conferma con il codice di prenotazione.</p>
  <p>Si può pagare con carta, Apple Pay o Google Pay tramite Stripe. Si può scegliere tra il pagamento dell'intero soggiorno e una caparra; in quel caso il saldo si paga in struttura all'arrivo ${T('metodi accettati per il saldo: da confermare')}.</p>
  <h2>Cancellazione</h2>
  <p>${T("Politica di cancellazione da definire con la struttura: entro quanti giorni dall'arrivo si può cancellare gratis, se la caparra viene restituita, cosa succede in caso di mancato arrivo.")}</p>
  <h2>Arrivo e partenza</h2>
  <ul><li>Arrivo dalle 12:00 alle 20:00. Per arrivi in altri orari scriveteci prima.</li><li>Partenza entro le 10:30.</li></ul>
  <h2>Animali</h2>
  <p>Gli animali di piccola e media taglia sono benvenuti, previo accordo: segnalatelo nelle note della prenotazione.</p>
  <h2>Imposta di soggiorno</h2>
  <p>${T("Da verificare: se è prevista l'imposta di soggiorno, importo ed esenzioni.")}</p>
  <h2>Contatti</h2>
  <p>Per qualsiasi domanda: telefono e WhatsApp 328 871 2971.</p>
  <p class="mono tiny" style="text-align:left;margin-top:30px">B&amp;B L'Amicizia · Via Cassia Vecchia, 100 · 01027 Montefiascone (VT) · CIN IT056036C16TV8HPD4 · CIR 056036-B&amp;B-00006</p>
</div></section>`
    : `<section class="page-head"><div class="wrap">
  <p class="mono kicker">Before you book</p>
  <h1>Booking <em>terms</em></h1>
</div></section>
<section><div class="wrap prose">
  <h2>Booking and payment</h2>
  <p>A booking made on this website is confirmed once payment goes through: you will immediately receive a confirmation email with your booking code.</p>
  <p>You can pay by card, Apple Pay or Google Pay via Stripe. You can choose to pay for the whole stay or just a deposit; in that case the balance is paid at the property on arrival ${T('accepted payment methods for the balance: to be confirmed')}.</p>
  <h2>Cancellation</h2>
  <p>${T('Cancellation policy to be agreed with the property: how many days before arrival you can cancel free of charge, whether the deposit is refunded, what happens in case of no-show.')}</p>
  <h2>Check-in and check-out</h2>
  <ul><li>Check-in from 12:00 to 20:00. For other times, please let us know in advance.</li><li>Check-out by 10:30.</li></ul>
  <h2>Pets</h2>
  <p>Small and medium-sized pets are welcome by prior arrangement: please mention it in the booking notes.</p>
  <h2>Tourist tax</h2>
  <p>${T('To be checked: whether a local tourist tax applies, amount and exemptions.')}</p>
  <h2>Contact</h2>
  <p>For any question: phone and WhatsApp +39 328 871 2971.</p>
  <p>The Italian version of these terms prevails in case of discrepancy.</p>
  <p class="mono tiny" style="text-align:left;margin-top:30px">B&amp;B L'Amicizia · Via Cassia Vecchia, 100 · 01027 Montefiascone (VT), Italy · CIN IT056036C16TV8HPD4 · CIR 056036-B&amp;B-00006</p>
</div></section>`;
  write(lang, '/condizioni', page({
    lang, path: '/condizioni', body,
    title: it ? "Condizioni di prenotazione · B&amp;B L'Amicizia" : "Booking terms · B&amp;B L'Amicizia",
    desc: it ? "Condizioni di prenotazione, pagamento e cancellazione del B&amp;B L'Amicizia di Montefiascone." : "Booking, payment and cancellation terms of B&amp;B L'Amicizia, Montefiascone.",
  }));
}

// ---------------------------------------------------------------- Privacy (BOZZA)
function privacy(lang) {
  const it = lang === 'it';
  const body = it
    ? `<section class="page-head"><div class="wrap">
  <p class="mono kicker">Informativa ai sensi del Regolamento UE 2016/679 (GDPR)</p>
  <h1>Privacy <em>e cookie</em></h1>
</div></section>
<section><div class="wrap prose">
  <p>${T('BOZZA: testo da far verificare a un consulente prima della pubblicazione.')}</p>
  <h2>Titolare del trattamento</h2>
  <p>${T('Nome e cognome / ragione sociale, codice fiscale o P.IVA')} · B&amp;B L'Amicizia, Via Cassia Vecchia 100, 01027 Montefiascone (VT) · email ${T('da inserire')} · telefono 328 871 2971.</p>
  <h2>Quali dati raccogliamo</h2>
  <ul>
    <li><b>Prenotazione dal sito:</b> nome e cognome, email, telefono, date del soggiorno, numero di ospiti e le eventuali note che scrivete.</li>
    <li><b>Pagamento:</b> avviene sulla pagina sicura di Stripe. Noi <b>non riceviamo e non conserviamo</b> i dati della carta; Stripe ci comunica solo l'esito e l'importo.</li>
    <li><b>Contatto su WhatsApp:</b> se ci scrivete, i dati sono trattati anche da WhatsApp secondo la sua informativa.</li>
  </ul>
  <h2>Perché e su quale base</h2>
  <ul>
    <li>Gestire la prenotazione, il pagamento e il soggiorno, e inviarvi la conferma: esecuzione del contratto (art. 6.1.b GDPR).</li>
    <li>Adempiere agli obblighi di legge, fiscali e di pubblica sicurezza (comunicazione degli alloggiati): obbligo legale (art. 6.1.c GDPR).</li>
  </ul>
  <p>Non usiamo i vostri dati per pubblicità e non li vendiamo a nessuno.</p>
  <h2>Per quanto tempo</h2>
  <p>${T('Da definire: ad es. i dati della prenotazione per il tempo necessario al soggiorno e poi per i periodi richiesti dalla normativa fiscale (fino a 10 anni per i documenti contabili).')}</p>
  <h2>Chi tratta i dati per nostro conto</h2>
  <ul>
    <li><b>Netlify</b>: ospita il sito e l'archivio delle prenotazioni.</li>
    <li><b>Stripe</b>: gestisce i pagamenti.</li>
    <li><b>Resend</b>: invia le email di conferma.</li>
    <li><b>Google</b>: fornisce la mappa (solo se scegliete di mostrarla) e le recensioni pubblicate su Google.</li>
  </ul>
  <p>Alcuni di questi fornitori hanno sede negli Stati Uniti: il trasferimento avviene con le garanzie previste dal GDPR (EU-US Data Privacy Framework o clausole contrattuali standard).</p>
  <h2>Cookie</h2>
  <p>Questo sito <b>non usa cookie di profilazione né di statistica</b>. Usa solo una memoria tecnica del browser per completare la prenotazione e, se lo chiedete, per ricordare che avete accettato di vedere la mappa.</p>
  <p>La <b>mappa di Google</b> nella pagina Dintorni si carica solo dopo che premete "Mostra la mappa": da quel momento Google può impostare i propri cookie. Durante il pagamento, Stripe usa cookie tecnici necessari per la sicurezza della transazione.</p>
  <h2>I vostri diritti</h2>
  <p>Potete chiedere in ogni momento di accedere ai vostri dati, correggerli, cancellarli o limitarne l'uso, e opporvi al trattamento (artt. 15–22 GDPR), scrivendo ai contatti sopra. Potete anche presentare reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener">garanteprivacy.it</a>).</p>
</div></section>`
    : `<section class="page-head"><div class="wrap">
  <p class="mono kicker">Privacy notice under EU Regulation 2016/679 (GDPR)</p>
  <h1>Privacy <em>&amp; cookies</em></h1>
</div></section>
<section><div class="wrap prose">
  <p>${T('DRAFT: to be reviewed by an adviser before publication.')}</p>
  <h2>Data controller</h2>
  <p>${T('Full name / company name, tax code or VAT number')} · B&amp;B L'Amicizia, Via Cassia Vecchia 100, 01027 Montefiascone (VT), Italy · email ${T('to be added')} · phone +39 328 871 2971.</p>
  <h2>What data we collect</h2>
  <ul>
    <li><b>Bookings on this website:</b> full name, email, phone number, dates of stay, number of guests and any notes you write.</li>
    <li><b>Payment:</b> handled on Stripe's secure page. We <b>never receive or store</b> your card details; Stripe only tells us the outcome and the amount.</li>
    <li><b>WhatsApp:</b> if you message us, your data is also processed by WhatsApp under its own privacy policy.</li>
  </ul>
  <h2>Why, and on what legal basis</h2>
  <ul>
    <li>To manage your booking, payment and stay, and to send you the confirmation: performance of a contract (Art. 6(1)(b) GDPR).</li>
    <li>To meet legal, tax and public-safety obligations (Italian guest registration): legal obligation (Art. 6(1)(c) GDPR).</li>
  </ul>
  <p>We do not use your data for advertising and we never sell it.</p>
  <h2>How long we keep it</h2>
  <p>${T('To be defined: e.g. booking data for as long as needed for the stay, then for the periods required by tax law (up to 10 years for accounting records).')}</p>
  <h2>Who processes data on our behalf</h2>
  <ul>
    <li><b>Netlify</b>: hosts the website and the booking records.</li>
    <li><b>Stripe</b>: processes payments.</li>
    <li><b>Resend</b>: sends confirmation emails.</li>
    <li><b>Google</b>: provides the map (only if you choose to show it) and the reviews published on Google.</li>
  </ul>
  <p>Some of these providers are based in the United States: transfers rely on the safeguards provided by the GDPR (EU-US Data Privacy Framework or standard contractual clauses).</p>
  <h2>Cookies</h2>
  <p>This website <b>uses no profiling or analytics cookies</b>. It only uses technical browser storage to complete your booking and, if you ask, to remember that you agreed to show the map.</p>
  <p>The <b>Google map</b> on the Getting here page loads only after you press "Show the map": from then on Google may set its own cookies. During payment, Stripe uses technical cookies needed to keep the transaction secure.</p>
  <h2>Your rights</h2>
  <p>You can ask at any time to access, correct or delete your data, restrict its use, or object to its processing (Arts. 15–22 GDPR) by contacting us as above. You can also lodge a complaint with the Italian Data Protection Authority (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener">garanteprivacy.it</a>).</p>
</div></section>`;
  write(lang, '/privacy', page({
    lang, path: '/privacy', body,
    title: it ? "Privacy e cookie · B&amp;B L'Amicizia" : "Privacy &amp; cookies · B&amp;B L'Amicizia",
    desc: it ? "Informativa privacy e cookie del B&amp;B L'Amicizia di Montefiascone." : "Privacy and cookie notice of B&amp;B L'Amicizia, Montefiascone.",
  }));
}

// ---------------------------------------------------------------- Grazie
function grazie(lang) {
  const it = lang === 'it';
  const body = `<section><div class="wrap thanks" id="thanks">
  <p class="mono kicker">${it ? 'Un attimo…' : 'Just a moment…'}</p>
  <h1>${it ? 'Controllo il pagamento' : 'Checking your payment'}</h1>
</div></section>`;
  write(lang, '/grazie', page({
    lang, path: '/grazie', body, noindex: true, scripts: ['grazie'],
    title: it ? "Prenotazione confermata · B&amp;B L'Amicizia" : "Booking confirmed · B&amp;B L'Amicizia",
    desc: it ? 'Conferma di prenotazione.' : 'Booking confirmation.',
  }));
}

for (const lang of ['it', 'en']) {
  ROOMS.forEach((r) => roomPage(lang, r));
  dintorni(lang);
  condizioni(lang);
  privacy(lang);
  grazie(lang);
}
console.log('pagine generate');
