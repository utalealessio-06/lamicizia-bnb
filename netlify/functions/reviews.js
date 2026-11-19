// GET /api/reviews -> recensioni Google vere (Places API), in cache per 12 ore.
// Servono GOOGLE_PLACES_API_KEY e GOOGLE_PLACE_ID. Google fornisce al massimo 5 recensioni.
import { cacheGet, cacheSet } from '../lib/store.js';
import { json, fail } from '../lib/http.js';

const TTL = 12 * 3600 * 1000;

export default async (req) => {
  const lang = new URL(req.url).searchParams.get('lang') === 'en' ? 'en' : 'it';
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const place = process.env.GOOGLE_PLACE_ID;
  if (!key || !place) return fail('Recensioni non configurate.', 503);

  const cached = await cacheGet(`reviews-${lang}`).catch(() => null);
  if (cached && Date.now() - cached.at < TTL) return out(cached.data);

  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(place)}?languageCode=${lang}`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews' },
  });
  if (!res.ok) {
    console.error('[reviews]', res.status, await res.text());
    return cached ? out(cached.data) : fail('Recensioni non disponibili.', 502);
  }
  const p = await res.json();
  const data = {
    rating: p.rating,
    count: p.userRatingCount,
    url: p.googleMapsUri,
    reviews: (p.reviews || [])
      .filter((r) => (r.text?.text || r.originalText?.text))
      .map((r) => ({
        author: r.authorAttribution?.displayName,
        authorUrl: r.authorAttribution?.uri,
        photo: r.authorAttribution?.photoUri,
        rating: r.rating,
        text: r.text?.text || r.originalText?.text,
        when: r.relativePublishTimeDescription,
        date: r.publishTime,
      })),
  };
  await cacheSet(`reviews-${lang}`, { at: Date.now(), data }).catch(() => {});
  return out(data);
};

const out = (data) => json(data, 200, { 'Cache-Control': 'public, max-age=3600' });

export const config = { path: '/api/reviews' };
