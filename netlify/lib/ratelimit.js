// Limite di richieste per indirizzo IP (salvato solo come hash, non in chiaro).
import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const store = () => getStore({ name: 'ratelimit', consistency: 'strong' });

export function clientId(req, context) {
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  return createHash('sha256').update('lamicizia:' + ip).digest('hex').slice(0, 32);
}

async function recent(key, windowMs) {
  const list = (await store().get(key, { type: 'json' })) || [];
  const now = Date.now();
  return list.filter((t) => now - t < windowMs);
}

// Quanti tentativi restano, senza registrarne uno nuovo.
export async function check(key, limit, windowMs) {
  const list = await recent(key, windowMs);
  if (list.length < limit) return { ok: true };
  return { ok: false, retryAfter: Math.ceil((list[0] + windowMs - Date.now()) / 60000) };
}

// Registra un tentativo.
export async function record(key, windowMs) {
  const list = await recent(key, windowMs);
  list.push(Date.now());
  await store().setJSON(key, list.slice(-100));
}

export async function clear(key) {
  await store().delete(key);
}
