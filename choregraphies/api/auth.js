// POST /api/auth?action=register|login|logout   GET /api/auth (moi)
import * as db from '../lib/db.js';
import { route, body, HttpError } from '../lib/http.js';
import { normPseudo, validPseudo, hashPassword, checkPassword, newToken, setSessionCookie, clearSessionCookie, currentUser, publicUser } from '../lib/auth.js';

export default route(['GET', 'POST'], async (req, res) => {
  if (req.method === 'GET') {
    const u = await currentUser(req);
    const members = u ? await db.smembers('users') : [];
    return res.json({ user: u ? publicUser(u) : null, members, demo: db.isDemo });
  }
  const action = req.query.action;
  const b = body(req);

  if (action === 'logout') { clearSessionCookie(res); return res.json({ ok: true }); }

  const pseudo = normPseudo(b.pseudo);
  const password = String(b.password || '');
  if (!validPseudo(pseudo)) throw new HttpError(400, 'Pseudo Instagram invalide');
  if (password.length < 4) throw new HttpError(400, 'Mot de passe trop court (4 caractères min.)');

  if (action === 'register') {
    if (process.env.INVITE_CODE && String(b.invite || '').trim() !== process.env.INVITE_CODE) throw new HttpError(403, 'Code d’invitation incorrect');
    if (await db.get(`user:${pseudo}`)) throw new HttpError(409, 'Ce pseudo a déjà un compte, connecte-toi');
    const first = (await db.smembers('users')).length === 0;
    const user = { pseudo, pass: hashPassword(password), token: newToken(), role: first && !process.env.ADMIN_PSEUDOS ? 'admin' : 'member', createdAt: Date.now() };
    await db.set(`user:${pseudo}`, user);
    await db.set(`token:${user.token}`, pseudo);
    await db.sadd('users', pseudo);
    setSessionCookie(res, pseudo);
    return res.json({ user: publicUser(user) });
  }

  if (action === 'login') {
    const user = await db.get(`user:${pseudo}`);
    if (!user || !checkPassword(password, user.pass)) throw new HttpError(401, 'Pseudo ou mot de passe incorrect');
    setSessionCookie(res, pseudo);
    return res.json({ user: publicUser(user) });
  }
  throw new HttpError(400, 'Action inconnue');
});
