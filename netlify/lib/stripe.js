import Stripe from 'stripe';

let client;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY mancante');
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
