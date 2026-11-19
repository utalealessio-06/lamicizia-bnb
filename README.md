# B&B L'Amicizia · sito

Sito statico in `docs/` + funzioni Netlify in `netlify/functions/` (prenotazioni, pagamenti, recensioni).

## Pagine
- `/` home · `/camera-viola` `/camera-verde` `/camera-classica` · `/dintorni` · `/condizioni`
- `/grazie` conferma dopo il pagamento · `/admin` pannello riservato di Maddalena

## Come funziona la prenotazione
1. L'ospite sceglie camera e date sul calendario (`/api/availability`).
2. `/api/checkout` controlla le date, le blocca per 30 minuti e apre Stripe Checkout
   (carta, Apple Pay, Google Pay). Caparra o intero soggiorno.
3. Stripe chiama `/api/stripe-webhook`: la prenotazione viene confermata, le notti
   bloccate e partono le email a ospite e struttura.
4. Se il pagamento non si completa, le date si liberano da sole.

Calendario e prenotazioni stanno su Netlify Blobs. Niente collegamento con Booking:
le date vendute altrove si bloccano a mano da `/admin`.

## Da modificare
- Prezzi e capienza: `netlify/lib/config.js` (ora sono **segnaposto**).
- Testi delle condizioni: `docs/condizioni.html` (parti evidenziate in giallo).

## Messa online
1. Netlify: collegare il repo; build automatica (vedi `netlify.toml`).
2. Variabili d'ambiente: vedi `.env.example`.
3. Stripe: attivare Apple Pay e Google Pay in Settings > Payment methods;
   creare il webhook verso `https://<dominio>/api/stripe-webhook`.
4. Dominio: aggiungerlo in Netlify > Domain management e puntare i DNS.

## Test
`npm install && npm test` (Stripe e Blobs simulati).

## Sicurezza e privacy
- Pagamenti solo su Stripe Checkout: i dati delle carte non passano dal sito. Importi calcolati sul server.
- Webhook Stripe verificato con firma (`STRIPE_WEBHOOK_SECRET`).
- `/api/checkout`: max 5 tentativi l'ora per IP e max 8 pagamenti in corso in tutto il sito
  (contro chi blocca il calendario per dispetto).
- `/admin`: dopo 5 password errate blocco di 15 minuti per IP; oltre 30 errori/ora blocco totale per 1 ora.
  Gli IP sono salvati solo come hash.
- Intestazioni di sicurezza e CSP in `netlify.toml`.
- Mappa Google caricata solo dopo il consenso; recensioni senza foto profilo da Google.
- `docs/privacy.html` è una **bozza** da far verificare (parti in giallo).
