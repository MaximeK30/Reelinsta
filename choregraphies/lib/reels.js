// Modèle de données des propositions.
// reel:{id}  -> { id, platform, code, url, author, caption, music, thumbnail, status, proposers:[{pseudo,at,note}], aliases:[], createdAt }
// votes:{id} -> hash pseudo -> { dance, music, vibe : 1|-1|0 }
// comments:{id} -> [{ id, pseudo, text, at }]
// reels      -> set des ids ; alias:{id} -> id cible (après une fusion)
import * as db from './db.js';
import { normMusic } from './media.js';

export async function resolveId(id) {
  return (await db.get(`alias:${id}`)) || id;
}

export async function getReel(id) {
  return db.get(`reel:${await resolveId(id)}`);
}

export async function saveReel(reel) {
  await db.set(`reel:${reel.id}`, reel);
  await db.sadd('reels', reel.id);
}

export async function deleteReel(id) {
  await db.del(`reel:${id}`);
  await db.del(`votes:${id}`);
  await db.del(`comments:${id}`);
  await db.del(`thumb:${id}`);
  await db.srem('reels', id);
}

function tally(votes, pseudo) {
  const K = ['music', 'dance', 'vibe'];
  const t = { dance: { up: [], down: [] }, music: { up: [], down: [] }, vibe: { up: [], down: [] }, mine: { dance: 0, music: 0, vibe: 0 }, voters: [] };
  for (const [p, v] of Object.entries(votes || {})) {
    for (const k of K) {
      if (v?.[k] === 1) t[k].up.push(p);
      if (v?.[k] === -1) t[k].down.push(p);
    }
    if (K.some((k) => v?.[k])) t.voters.push(p);
    if (p === pseudo) t.mine = { dance: v?.dance || 0, music: v?.music || 0, vibe: v?.vibe || 0 };
  }
  t.score = K.reduce((s, k) => s + t[k].up.length - t[k].down.length, 0);
  return t;
}

export async function listReels(pseudo) {
  const ids = await db.smembers('reels');
  const reels = (await db.mget(ids.map((i) => `reel:${i}`))).filter(Boolean);
  const votes = await Promise.all(reels.map((r) => db.hgetall(`votes:${r.id}`)));
  const comments = await db.mget(reels.map((r) => `comments:${r.id}`));
  const seen = new Set(pseudo ? await db.smembers(`seen:${pseudo}`) : []);
  const list = reels.map((r, i) => ({
    ...r, votes: tally(votes[i], pseudo), comments: comments[i] || [],
    // « vu » : déjà affiché à cet utilisateur (ou proposé par lui, ou un doublon fusionné qu'il avait vu)
    seen: seen.has(r.id) || (r.aliases || []).some((a) => seen.has(a)) || r.proposers.some((p) => p.pseudo === pseudo),
  }));
  // Même musique sur des reels différents : on le signale (sans fusionner).
  const byMusic = {};
  for (const r of list) { const k = normMusic(r.music); if (k) (byMusic[k] ||= []).push(r.id); }
  for (const r of list) { const k = normMusic(r.music); r.sameMusic = k ? byMusic[k].filter((x) => x !== r.id) : []; }
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function mergeReels(fromId, intoId) {
  const from = await db.get(`reel:${fromId}`);
  const into = await db.get(`reel:${intoId}`);
  if (!from || !into || fromId === intoId) return null;
  for (const p of from.proposers) if (!into.proposers.some((x) => x.pseudo === p.pseudo)) into.proposers.push(p);
  into.music ||= from.music; into.author ||= from.author; into.caption ||= from.caption;
  into.aliases = [...new Set([...(into.aliases || []), fromId, ...(from.aliases || [])])];
  const fv = await db.hgetall(`votes:${fromId}`);
  const iv = await db.hgetall(`votes:${intoId}`);
  for (const [p, v] of Object.entries(fv)) if (!iv[p]) await db.hset(`votes:${intoId}`, p, v);
  for (const a of into.aliases) await db.set(`alias:${a}`, intoId);
  into.category ||= from.category;
  const fc = (await db.get(`comments:${fromId}`)) || [];
  if (fc.length) {
    const ic = (await db.get(`comments:${intoId}`)) || [];
    await db.set(`comments:${intoId}`, [...ic, ...fc].sort((a, b) => a.at - b.at));
  }
  await saveReel(into);
  await deleteReel(fromId);
  return into;
}
