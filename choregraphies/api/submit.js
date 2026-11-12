// POST /api/submit  { url | text, music?, note?, token? }
// Appelé par : la page /share (Android), le Raccourci iPhone (avec token), le formulaire du site.
import { route, body, HttpError } from '../lib/http.js';
import { requireUser } from '../lib/auth.js';
import { parseLink, resolveShortLink, enrich } from '../lib/media.js';
import { getReel, saveReel } from '../lib/reels.js';

export default route(['POST'], async (req, res) => {
  const user = await requireUser(req);
  const b = body(req);
  const raw = await resolveShortLink([b.url, b.text, b.title].filter(Boolean).join(' '));
  const link = parseLink(raw);
  if (!link) throw new HttpError(400, 'Lien non reconnu (Instagram, TikTok ou YouTube Shorts)');

  const music = String(b.music || '').trim().slice(0, 150) || null;
  const note = String(b.note || '').trim().slice(0, 300) || null;
  const existing = await getReel(link.id);

  if (existing) {
    const mine = existing.proposers.find((p) => p.pseudo === user.pseudo);
    const already = !!mine;
    if (!already) existing.proposers.push({ pseudo: user.pseudo, at: Date.now(), note });
    else if (note) mine.note = note;
    if (music && !existing.music) existing.music = music;
    await saveReel(existing);
    const others = existing.proposers.filter((p) => p.pseudo !== user.pseudo).map((p) => '@' + p.pseudo);
    return res.json({
      status: already ? 'already' : 'duplicate',
      message: already ? 'Tu avais déjà proposé ce reel 😉' : `Doublon : déjà proposé par ${others.join(', ')}. Tu es ajouté·e comme co-proposeur.`,
      reel: existing,
    });
  }

  const info = await enrich(link);
  const reel = {
    ...link, ...info, music: music || info.music,
    status: 'pending', proposers: [{ pseudo: user.pseudo, at: Date.now(), note }], aliases: [], createdAt: Date.now(),
  };
  await saveReel(reel);
  res.status(201).json({ status: 'created', message: reel.music ? `Ajouté ✓ 🎵 ${reel.music}` : 'Ajouté ✓ (pense à indiquer la musique)', reel });
});
