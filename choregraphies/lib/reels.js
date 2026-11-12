// Modèle de données des propositions.
// reel:{id}  -> { id, platform, code, url, author, caption, music, thumbnail, status, proposers:[{pseudo,at,note}], aliases:[], createdAt }
// votes:{id} -> hash pseudo -> { dance: 1|-1|0, music: 1|-1|0 }
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
  await db.srem('reels', id);
}

function tally(votes, pseudo) {
  const t = { dance: { up: [], down: [] }, music: { up: [], down: [] }, mine: { dance: 0, music: 0 }, voters: [] };
  for (const [p, v] of Object.entries(votes || {})) {
    for (const k of ['dance', 'music']) {
      if (v?.[k] === 1) t[k].up.push(p);
      if (v?.[k] === -1) t[k].down.push(p);
    }
    if (v?.dance || v?.music) t.voters.push(p);
    if (p === pseudo) t.mine = { dance: v?.dance || 0, music: v?.music || 0 };
  }
  t.score = t.dance.up.length - t.dance.down.length + (t.music.up.length - t.music.down.length) * 0.5;
  return t;
}

export async function listReels(pseudo) {
  const ids = await db.smembers('reels');
  const reels = (await db.mget(ids.map((i) => `reel:${i}`))).filter(Boolean);
  const votes = await Promise.all(reels.map((r) => db.hgetall(`votes:${r.id}`)));
  const list = reels.map((r, i) => ({ ...r, votes: tally(votes[i], pseudo) }));
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
  await saveReel(into);
  await deleteReel(fromId);
  return into;
}
