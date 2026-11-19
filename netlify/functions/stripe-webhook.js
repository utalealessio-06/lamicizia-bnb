// POST /api/stripe-webhook -> riceve gli eventi di Stripe.
// Eventi da attivare nel pannello Stripe: checkout.session.completed, checkout.session.expired.
import { stripe } from '../lib/stripe.js';
import { confirmSession } from '../lib/confirm.js';
import { releaseById } from '../lib/store.js';
import { ROOMS } from '../lib/config.js';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Metodo non consentito', { status: 405 });
  const raw = await req.text();
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, req.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('[webhook] firma non valida', e.message);
    return new Response('Firma non valida', { status: 400 });
  }

  const s = event.data.object;
  if (event.type === 'checkout.session.completed') {
    await confirmSession(s);
  } else if (event.type === 'checkout.session.expired') {
    if (ROOMS[s.metadata?.room]) await releaseById(s.metadata.room, s.id);
  }
  return new Response('ok');
};

export const config = { path: '/api/stripe-webhook' };
