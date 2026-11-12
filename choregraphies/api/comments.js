// POST /api/comments { action: 'add', id, text } | { action: 'delete', id, cid }
import crypto from 'node:crypto';
import * as db from '../lib/db.js';
import { route, body, HttpError } from '../lib/http.js';
import { requireUser } from '../lib/auth.js';
import { getReel } from '../lib/reels.js';

export default route(['POST'], async (req, res) => {
  const user = await requireUser(req);
  const { action, id, text, cid } = body(req);
  const reel = await getReel(id);
  if (!reel) throw new HttpError(404, 'Reel introuvable');
  const key = `comments:${reel.id}`;
  const list = (await db.get(key)) || [];

  if (action === 'add') {
    const t = String(text || '').trim().slice(0, 500);
    if (!t) throw new HttpError(400, 'Commentaire vide');
    const c = { id: crypto.randomBytes(6).toString('base64url'), pseudo: user.pseudo, text: t, at: Date.now() };
    list.push(c);
    await db.set(key, list);
    return res.status(201).json({ comment: c, comments: list });
  }
  if (action === 'delete') {
    const c = list.find((x) => x.id === cid);
    if (!c) throw new HttpError(404, 'Commentaire introuvable');
    if (c.pseudo !== user.pseudo && !user.admin) throw new HttpError(403, 'Tu ne peux supprimer que tes commentaires');
    const next = list.filter((x) => x.id !== cid);
    await db.set(key, next);
    return res.json({ comments: next });
  }
  throw new HttpError(400, 'Action inconnue');
});
