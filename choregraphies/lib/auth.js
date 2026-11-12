import crypto from 'node:crypto';
import * as db from './db.js';
import { HttpError, body } from './http.js';

const SECRET = process.env.SESSION_SECRET || 'dev-secret-a-changer';
const MAX_AGE = 60 * 60 * 24 * 180; // 6 mois

export const normPseudo = (p) => String(p || '').trim().replace(/^@/, '').toLowerCase();
export const validPseudo = (p) => /^[a-z0-9._]{1,30}$/.test(p);

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`;
}
export function checkPassword(pw, stored) {
  const [salt, h] = String(stored || '').split(':');
  if (!salt || !h) return false;
  const a = crypto.scryptSync(pw, salt, 32);
  const b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const newToken = () => crypto.randomBytes(18).toString('base64url');

const hmac = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');

function signSession(pseudo) {
  const payload = Buffer.from(JSON.stringify({ p: pseudo, e: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}
function readSession(value) {
  if (!value) return null;
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;
  const expected = hmac(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { p, e } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return e > Date.now() ? p : null;
  } catch { return null; }
}

export function setSessionCookie(res, pseudo) {
  res.setHeader('Set-Cookie', `session=${signSession(pseudo)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`);
}
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
}

function parseCookies(req) {
  if (req.cookies) return req.cookies;
  return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((x) => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}

const adminList = () => (process.env.ADMIN_PSEUDOS || '').split(',').map(normPseudo).filter(Boolean);
export const isAdmin = (user) => !!user && (user.role === 'admin' || adminList().includes(user.pseudo));

// Session (cookie) OU jeton personnel (Raccourci iPhone : en-tête x-token ou champ token).
export async function currentUser(req) {
  let pseudo = readSession(parseCookies(req).session);
  if (!pseudo) {
    const tok = req.headers['x-token'] || body(req).token || req.query?.token;
    if (tok) pseudo = await db.get(`token:${tok}`);
  }
  if (!pseudo) return null;
  const user = await db.get(`user:${pseudo}`);
  return user ? { ...user, admin: isAdmin(user) } : null;
}

export async function requireUser(req) {
  const u = await currentUser(req);
  if (!u) throw new HttpError(401, 'Connecte-toi d’abord');
  return u;
}
export async function requireAdmin(req) {
  const u = await requireUser(req);
  if (!u.admin) throw new HttpError(403, 'Réservé à l’admin');
  return u;
}

export const publicUser = (u) => ({ pseudo: u.pseudo, admin: isAdmin(u), token: u.token, demo: db.isDemo });
