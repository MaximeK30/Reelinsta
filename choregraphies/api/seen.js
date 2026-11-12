// POST /api/seen { ids: [...] } : marque des idées comme vues par l'utilisateur connecté.
import * as db from '../lib/db.js';
import { route, body } from '../lib/http.js';
import { requireUser } from '../lib/auth.js';

export default route(['POST'], async (req, res) => {
  const user = await requireUser(req);
  const ids = (body(req).ids || []).filter((x) => typeof x === 'string' && x.length < 80).slice(0, 200);
  for (const id of ids) await db.sadd(`seen:${user.pseudo}`, id);
  res.json({ ok: true, count: ids.length });
});
