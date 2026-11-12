// Reconnaissance des liens + enrichissement (auteur, légende, musique).

// Renvoie { id, platform, code, url } ou null. L'id sert de clé anti-doublon :
// deux partages du même reel (même avec ?igsh=… différents) donnent le même id.
export function parseLink(input) {
  const s = String(input || '');
  let m = s.match(/instagram\.com\/(?:[\w.]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]{5,})/i);
  if (m) return { id: `ig_${m[1]}`, platform: 'instagram', code: m[1], url: `https://www.instagram.com/reel/${m[1]}/` };
  m = s.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/i);
  if (m) return { id: `tt_${m[1]}`, platform: 'tiktok', code: m[1], url: `https://www.tiktok.com/video/${m[1]}` };
  m = s.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  if (m) return { id: `yt_${m[1]}`, platform: 'youtube', code: m[1], url: `https://www.youtube.com/shorts/${m[1]}` };
  return null;
}

// Lien court TikTok (vm.tiktok.com/xxx) : on suit la redirection pour obtenir l'id réel.
export async function resolveShortLink(input) {
  const m = String(input || '').match(/https?:\/\/(?:vm|vt)\.tiktok\.com\/[\w-]+\/?/i);
  if (!m) return input;
  try {
    const r = await fetchT(m[0], { redirect: 'follow' }, 4000);
    return r.url || input;
  } catch { return input; }
}

export function normMusic(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)|\[.*?\]|official|audio|original|son original|remix|sped up|slowed/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

async function fetchT(url, opts = {}, ms = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

// Cherche récursivement la musique dans une réponse JSON « façon API privée Instagram »
// (format renvoyé par la plupart des scrapers RapidAPI).
function findMusic(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 8) return null;
  const mi = obj.music_asset_info || obj.music_info?.music_asset_info;
  if (mi?.title) return [mi.title, mi.display_artist].filter(Boolean).join(' — ');
  const os = obj.original_sound_info;
  if (os?.original_audio_title) return [os.original_audio_title, os.ig_artist?.username && `@${os.ig_artist.username}`].filter(Boolean).join(' — ');
  if (obj.music?.title) return [obj.music.title, obj.music.author || obj.music.artist].filter(Boolean).join(' — ');
  for (const v of Object.values(obj)) { const r = findMusic(v, depth + 1); if (r) return r; }
  return null;
}
function findKey(obj, key, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 8) return null;
  if (obj[key] != null && typeof obj[key] !== 'object') return obj[key];
  for (const v of Object.values(obj)) { const r = findKey(v, key, depth + 1); if (r != null) return r; }
  return null;
}
const meta = (html, prop) => {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'));
  return m ? m[1].replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&') : null;
};

// Chaque source est optionnelle et échoue en silence : on garde ce qu'on obtient.
export async function enrich(link) {
  const out = { author: null, caption: null, music: null, thumbnail: null };

  // 1) API tierce configurable (meilleure source pour la musique)
  if (process.env.INSTAGRAM_API_URL && link.platform === 'instagram') {
    try {
      const u = process.env.INSTAGRAM_API_URL.replace('{code}', link.code).replace('{url}', encodeURIComponent(link.url));
      const headers = JSON.parse(process.env.INSTAGRAM_API_HEADERS || '{}');
      const r = await fetchT(u, { headers }, 8000);
      if (r.ok) {
        const j = await r.json();
        out.music = findMusic(j);
        out.author = out.author || findKey(j, 'username');
        const cap = findKey(j, 'text');
        if (cap) out.caption = String(cap).slice(0, 200);
      }
    } catch (e) { console.warn('INSTAGRAM_API_URL a échoué :', e.message); }
  }

  // 2) oEmbed officiel Meta (auteur, miniature)
  if (process.env.META_OEMBED_TOKEN && link.platform === 'instagram') {
    try {
      const r = await fetchT(`https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(link.url)}&access_token=${process.env.META_OEMBED_TOKEN}`);
      if (r.ok) { const j = await r.json(); out.author ||= j.author_name; out.thumbnail ||= j.thumbnail_url; out.caption ||= j.title; }
    } catch {}
  }

  // 3) oEmbed publics TikTok / YouTube (sans clé)
  if (link.platform === 'tiktok' || link.platform === 'youtube') {
    try {
      const api = link.platform === 'tiktok'
        ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(link.url)}`
        : `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link.url)}`;
      const r = await fetchT(api);
      if (r.ok) { const j = await r.json(); out.author ||= j.author_name; out.caption ||= j.title; out.thumbnail ||= j.thumbnail_url; }
    } catch {}
  }

  // 4) Balises OpenGraph de la page publique (souvent bloqué par Instagram, d'où le "best effort")
  if (!out.author && link.platform === 'instagram') {
    try {
      const r = await fetchT(link.url, { headers: { 'User-Agent': 'facebookexternalhit/1.1', 'Accept-Language': 'fr-FR,fr;q=0.9' } }, 4000);
      if (r.ok) {
        const html = await r.text();
        const title = meta(html, 'og:title');
        const desc = meta(html, 'og:description');
        out.thumbnail ||= meta(html, 'og:image');
        const a = (title || desc || '').match(/^(.+?) (?:on|sur) Instagram/i) || (desc || '').match(/- ([\w.]+) (?:on|le) /);
        if (a) out.author = a[1].replace(/^@/, '');
        const cap = (title || '').match(/Instagram\s*:\s*["“](.*)["”]/s);
        if (cap) out.caption = cap[1].slice(0, 200);
      }
    } catch {}
  }
  return out;
}
