// GET /api/reels : liste   PATCH /api/reels { id, music?, caption?, category? }
import { route, body, HttpError } from '../lib/http.js';
import { requireUser } from '../lib/auth.js';
import { listReels, getReel, saveReel } from '../lib/reels.js';
import { normCategory } from '../lib/categories.js';

export default route(['GET', 'PATCH'], async (req, res) => {
  const user = await requireUser(req);
  if (req.method === 'GET') return res.json({ reels: await listReels(user.pseudo) });
  const b = body(req);
  const reel = await getReel(b.id);
  if (!reel) throw new HttpError(404, 'Reel introuvable');
  if (b.music !== undefined) reel.music = String(b.music).trim().slice(0, 150) || null;
  if (b.category !== undefined) {
    if (!user.admin && !reel.proposers.some((p) => p.pseudo === user.pseudo)) throw new HttpError(403, 'Seule la personne qui a proposé peut choisir le type');
    reel.category = normCategory(b.category);
  }
  if (b.caption !== undefined) reel.caption = String(b.caption).trim().slice(0, 200) || null;
  await saveReel(reel);
  res.json({ reel });
});
