// POST /api/vote { id, kind: 'dance'|'music', value: 1|-1|0 }
import * as db from '../lib/db.js';
import { route, body, HttpError } from '../lib/http.js';
import { requireUser } from '../lib/auth.js';
import { getReel } from '../lib/reels.js';

export default route(['POST'], async (req, res) => {
  const user = await requireUser(req);
  const { id, kind, value } = body(req);
  if (!['dance', 'music'].includes(kind) || ![1, -1, 0].includes(Number(value))) throw new HttpError(400, 'Vote invalide');
  const reel = await getReel(id);
  if (!reel) throw new HttpError(404, 'Reel introuvable');
  const all = await db.hgetall(`votes:${reel.id}`);
  const mine = { dance: 0, music: 0, ...(all[user.pseudo] || {}), [kind]: Number(value) };
  await db.hset(`votes:${reel.id}`, user.pseudo, mine);
  res.json({ ok: true, vote: mine });
});
