// GET /api/availability -> camere, prezzi, regole e notti occupate di ogni camera.
import { ROOMS, publicConfig } from '../lib/config.js';
import { todayRome } from '../lib/dates.js';
import { busyNights } from '../lib/store.js';
import { json } from '../lib/http.js';

export default async () => {
  const today = todayRome();
  const busy = {};
  await Promise.all(Object.keys(ROOMS).map(async (id) => (busy[id] = await busyNights(id, today))));
  return json({ ...publicConfig(), today, busy });
};

export const config = { path: '/api/availability' };
