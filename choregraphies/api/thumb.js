// GET /api/thumb?id=ig_xxx : aperçu du reel, mis en cache dans la base
// (les liens d'images Instagram expirent au bout de quelques jours).
import * as db from '../lib/db.js';
import { getReel, saveReel } from '../lib/reels.js';
import { enrich, fetchImage } from '../lib/media.js';

const MAX = 700 * 1024;       // taille max stockée
const RETRY = 6 * 3600 * 1000; // ne réessaie pas plus d'une fois toutes les 6 h

export default async function handler(req, res) {
  try {
    const id = String(req.query.id || '');
    const reel = await getReel(id);
    if (!reel) return res.status(404).end();
    const key = `thumb:${reel.id}`;
    const cached = await db.get(key);
    if (cached?.b64) return send(res, cached.type, Buffer.from(cached.b64, 'base64'));
    if (cached?.miss && Date.now() - cached.miss < RETRY) return res.status(404).end();

    let img = await fetchImage(reel.thumbnail);
    if (!img) { // lien expiré ou absent : on redemande l'aperçu à Instagram
      const info = await enrich(reel);
      if (info.thumbnail) {
        reel.thumbnail = info.thumbnail;
        reel.author ||= info.author; reel.caption ||= info.caption;
        await saveReel(reel);
        img = await fetchImage(info.thumbnail);
      }
    }
    if (!img) { await db.set(key, { miss: Date.now() }); return res.status(404).end(); }
    if (img.buf.length <= MAX) await db.set(key, { type: img.type, b64: img.buf.toString('base64') });
    return send(res, img.type, img.buf);
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}

function send(res, type, buf) {
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  res.status(200).end(buf);
}
