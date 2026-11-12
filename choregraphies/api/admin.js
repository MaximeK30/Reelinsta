// POST /api/admin { action: 'status'|'delete'|'merge', id, status?, into? }
import { route, body, HttpError } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';
import { getReel, saveReel, deleteReel, mergeReels } from '../lib/reels.js';

export default route(['POST'], async (req, res) => {
  await requireAdmin(req);
  const { action, id, status, into } = body(req);
  const reel = await getReel(id);
  if (!reel) throw new HttpError(404, 'Reel introuvable');

  if (action === 'status') {
    if (!['pending', 'validated', 'rejected'].includes(status)) throw new HttpError(400, 'Statut invalide');
    reel.status = status; reel.statusAt = Date.now();
    await saveReel(reel);
    return res.json({ reel });
  }
  if (action === 'delete') { await deleteReel(reel.id); return res.json({ ok: true }); }
  if (action === 'merge') {
    const target = await getReel(into);
    if (!target) throw new HttpError(404, 'Reel cible introuvable');
    const merged = await mergeReels(reel.id, target.id);
    if (!merged) throw new HttpError(400, 'Fusion impossible');
    return res.json({ reel: merged });
  }
  throw new HttpError(400, 'Action inconnue');
});
