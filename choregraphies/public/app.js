/* Nos idées de danses · Maxime & Habeeshana (vanilla JS, sans dépendance). */
(() => {
  /* ——— Réglages ——— */
  const CONFIG = { names: ['Maxime', 'Habeeshana'], target: new Date('2027-08-21T14:00:00+02:00') };
  const CATS = { couple: ['💞', 'Couple'], filles: ['💃', 'Filles'], garcons: ['🕺', 'Garçons'], groupe: ['👯', 'Groupe'] };
  const CRIT = [['music', '🎵', 'Musique', 'La musique'], ['dance', '💃', 'Choré', 'La choré'], ['vibe', '✨', 'Vibe', 'La vibe']];

  const $app = document.getElementById('app');
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const S = {
    user: null, members: [], reels: [], demo: false, authTab: 'login',
    view: 'list', id: null, editMusic: false, listY: 0,
    tab: store.get('choreo_tab3', 'todo'), cat: 'all', sort: 'recent', open: new Set(),
  };

  /* ——— Utilitaires ——— */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'à l’instant'; if (m < 60) return `${m} min`; const h = Math.round(m / 60); if (h < 24) return `${h} h`; const d = Math.round(h / 24); return d < 7 ? `${d} j` : new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); };
  const dec = (s) => String(s ?? '').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
  const escd = (s) => esc(dec(s));
  const handle = (r) => !r.author ? '' : /\s/.test(r.author) ? escd(r.author) : '@' + escd(r.author);
  const MOCK = !!window.__CHOREO_MOCK;
  const thumbSrc = (r) => `/api/thumb?id=${encodeURIComponent(r.id)}`;
  const POS = ['radial-gradient(120% 90% at 20% 10%,#a8304f 0%,#4d1225 45%,#120a0d 100%)', 'radial-gradient(110% 90% at 80% 0%,#d6b685 0%,#7a1d34 40%,#140b0e 100%)', 'radial-gradient(120% 100% at 50% 0%,#e27590 0%,#6b1a33 45%,#0f090b 100%)', 'radial-gradient(130% 90% at 0% 100%,#8b4a7e 0%,#3b1530 45%,#0d090b 100%)'];
  const listFr = (a) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1];
  const haptic = () => { try { navigator.vibrate?.(10); } catch {} };
  const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  const plat = (r) => ({ instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' }[r.platform] || r.platform);
  const byId = (id) => S.reels.find((r) => r.id === id);
  const me = () => S.user.pseudo;
  const AVG = ['#962744,#5e1528', '#e27590,#962744', '#d6b685,#8a4b3b', '#8b4a7e,#3e1d3e', '#c2566f,#4a1a2c', '#b98552,#6e2b3a'];
  const av = (p, cls = '') => `<span class="av ${cls}" style="background:linear-gradient(135deg,${AVG[hash(p) % AVG.length]})">${esc(String(p)[0] || '?')}</span>`;

  /* ——— Icônes ——— */
  const sv = (d, x = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${x}>${d}</svg>`;
  const I = {
    up: sv('<path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3Zm0 0 4-8a3 3 0 0 1 3 3v4h5.3a2 2 0 0 1 2 2.3l-1.4 8.4a2 2 0 0 1-2 1.7H7"/>'),
    down: sv('<path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3Zm0 0-4 8a3 3 0 0 1-3-3v-4H4.7a2 2 0 0 1-2-2.3l1.4-8.4a2 2 0 0 1 2-1.7H17"/>'),
    plus: sv('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.2"'),
    back: sv('<path d="m15 18-6-6 6-6"/>', 'stroke-width="2.2"'),
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.6v14.8a.9.9 0 0 0 1.4.8l11.6-7.4a.9.9 0 0 0 0-1.6L8.4 3.8A.9.9 0 0 0 7 4.6Z"/></svg>',
    note: sv('<path d="M9 17.5V5.2l11-2.2v12.5"/><circle cx="6" cy="17.5" r="3"/><circle cx="17" cy="15.5" r="3"/>'),
    bubble: sv('<path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.2A8.5 8.5 0 1 1 20.5 11.5Z"/>'),
    send: sv('<path d="M5 12h14M13 6l6 6-6 6"/>', 'stroke-width="2.2"'),
    edit: sv('<path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4"/>'),
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z"/></svg>',
    sort: sv('<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>'),
    chev: sv('<path d="m6 9 6 6 6-6"/>'),
    users: sv('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.6M18 14.8c1.8.8 3 2.6 3.5 5.2"/>'),
  };
  const MONO = () => `<svg class="mono" viewBox="0 0 100 100" aria-label="M&H"><text x="50" y="66" text-anchor="middle" font-size="46" letter-spacing="-1.5">M<tspan font-style="italic" fill="#e27590" font-size="32" dx="-2" dy="-1.5">&amp;</tspan><tspan dx="-2" dy="1.5">H</tspan></text></svg>`;

  /* ——— API ——— */
  async function api(path, { method = 'GET', data } = {}) {
    const r = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Erreur réseau'), { status: r.status });
    return j;
  }
  let toastT;
  function toast(msg) {
    let d = document.querySelector('.toast');
    if (!d) { d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); document.body.appendChild(d); }
    d.textContent = msg; requestAnimationFrame(() => d.classList.add('show'));
    clearTimeout(toastT); toastT = setTimeout(() => d.classList.remove('show'), 2800);
  }
  async function load() {
    const m = await api('/api/auth');
    S.user = m.user; S.members = m.members || []; S.demo = m.demo;
    if (S.user) { S.reels = (await api('/api/reels')).reels; await flushPending(); }
    render();
  }
  async function refresh() {
    if (!S.user) return load();
    const [rl, m] = await Promise.all([api('/api/reels'), api('/api/auth')]);
    S.reels = rl.reels; S.members = m.members || S.members; render();
  }
  async function flushPending() {
    let p = null; try { p = localStorage.getItem('choreo_pending'); localStorage.removeItem('choreo_pending'); } catch {}
    if (!p) return;
    try { const r = await api('/api/submit', { method: 'POST', data: { text: p } }); toast(r.message); S.reels = (await api('/api/reels')).reels; } catch (e) { toast(e.message); }
  }

  /* ——— Compte à rebours ——— */
  const two = (n) => String(n).padStart(2, '0');
  const cd = () => { const s = Math.max(0, Math.floor((CONFIG.target - Date.now()) / 1000)); return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 }; };
  function tick() {
    const c = cd();
    document.querySelectorAll('[data-cd=d]').forEach((e) => { e.textContent = c.d; });
    document.querySelectorAll('[data-cd=j]').forEach((e) => { e.textContent = `J-${c.d}`; });
    document.querySelectorAll('[data-cd=hms]').forEach((e) => { e.textContent = `${two(c.h)} h ${two(c.m)} min ${two(c.s)} s`; });
  }
  setInterval(tick, 1000);

  /* ——— Dérivés ——— */
  const isMine = (r) => r.proposers.some((p) => p.pseudo === me());
  const ratedAll = (r) => CRIT.every(([k]) => r.votes.mine[k]);
  const canEditType = (r) => isMine(r) || S.user.admin;
  const visible = (r) => r.status !== 'rejected' || S.user.admin || isMine(r);

  /* ——— Navigation ——— */
  function go(view, id, { push = true } = {}) {
    if (S.view === 'list') S.listY = window.scrollY;
    S.view = view; S.id = id || null; S.editMusic = false;
    if (push) history.pushState({ view, id }, '');
    render();
    window.scrollTo(0, view === 'list' ? S.listY : 0);
  }
  window.addEventListener('popstate', (e) => { const st = e.state || { view: 'list' }; if (S.user) go(st.view || 'list', st.id, { push: false }); });
  history.replaceState({ view: 'list' }, '');

  function render() {
    if (!S.user) return renderAuth();
    const V = { list: viewList, idea: viewIdea, add: viewAdd, me: viewMe }[S.view] || viewList;
    if (S.view === 'idea' && !byId(S.id)) { S.view = 'list'; }
    $app.innerHTML = (S.view === 'idea' && !byId(S.id)) ? viewList() : V();
    tick();
  }

  /* ——— Liste ——— */
  function gauge(r, k, label) {
    const y = r.votes[k].up.length, n = r.votes[k].down.length, t = y + n;
    return `<div class="g"><span class="l">${label}</span><span class="track">${t ? `<span class="y" style="width:${(y / t) * 100}%"></span><span class="n" style="width:${(n / t) * 100}%"></span>` : ''}</span><span class="c ${t ? '' : 'empty'}">${t ? `<b>${y}</b> 👍 ${n} 👎` : 'pas d’avis'}</span></div>`;
  }
  const domain = (r) => ({ instagram: 'instagram.com', tiktok: 'tiktok.com', youtube: 'youtube.com' }[r.platform] || '');
  const pvTitle = (r) => r.author ? `${escd(r.author)}${r.platform === 'instagram' ? ' sur Instagram' : ''}` : `Reel ${esc(plat(r))}`;
  // Aperçu façon « lien partagé » (comme dans Messages / WhatsApp)
  function preview(r, big) {
    const img = MOCK ? window.__mockImg?.(r) : thumbSrc(r);
    return `<a class="lp ${big ? 'big' : ''}" href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="Ouvrir dans ${esc(plat(r))}">
      <span class="lpi" style="background:${POS[hash(r.id) % POS.length]}">${img ? `<img src="${img}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="lpplay">${I.play}</span></span>
      <span class="lpt"><b>${pvTitle(r)}</b>${r.caption ? `<span class="lpd">${escd(r.caption)}</span>` : ''}<small>${domain(r)}</small></span>
    </a>`;
  }
  const thumb = (r) => preview(r, true);
  function musicLine(r) {
    return `<div class="mline ${r.music ? '' : 'none'}">${I.note}<span>${r.music ? escd(r.music) : 'Musique à préciser'}</span>${r.music ? '' : `<button data-a="open" data-id="${r.id}" data-edit="1">Ajouter</button>`}</div>`;
  }
  function voteRows(r) {
    return CRIT.map(([k, e, l]) => {
      const v = r.votes.mine[k], y = r.votes[k].up, n = r.votes[k].down;
      const key = `${r.id}:${k}`, open = S.open.has(key);
      const waiting = S.members.filter((m) => !y.includes(m) && !n.includes(m));
      return `<div class="vrow ${open ? 'open' : ''}">
        <button class="vl" data-a="expand" data-v="${key}" aria-expanded="${open}"><span class="e">${e}</span>${l}${I.chev}</button>
        <button class="vb yes ${v === 1 ? 'on' : ''}" data-a="vote" data-id="${r.id}" data-k="${k}" data-v="${v === 1 ? 0 : 1}" aria-label="J’aime ${l}">${I.up}<b>${y.length}</b></button>
        <button class="vb no ${v === -1 ? 'on' : ''}" data-a="vote" data-id="${r.id}" data-k="${k}" data-v="${v === -1 ? 0 : -1}" aria-label="Pas fan ${l}">${I.down}<b>${n.length}</b></button>
        ${open ? `<div class="vdet">${y.map((p) => `<span class="y">👍 ${esc(p)}</span>`).join('')}${n.map((p) => `<span class="n">👎 ${esc(p)}</span>`).join('')}${waiting.length ? `<span class="w">⏳ ${esc(waiting.join(', '))}</span>` : ''}${!y.length && !n.length ? '' : ''}</div>` : ''}
      </div>`;
    }).join('');
  }
  function card(r) {
    const todo = !ratedAll(r) && r.status !== 'rejected';
    const cms = r.comments || [];
    const last = cms[cms.length - 1];
    const props = r.proposers.map((p) => p.pseudo);
    const cat = CATS[r.category];
    return `<article class="card ${todo ? 'todo' : ''} ${r.status === 'rejected' ? 'rej' : ''}">
      <button class="cwho" data-a="open" data-id="${r.id}">
        <span class="stack">${props.slice(0, 3).map((p) => av(p, 'sm')).join('')}</span>
        <span class="cw"><b>${esc(listFr(props))}</b> ${props.length > 1 ? 'ont proposé' : 'a proposé'}<small>${ago(r.createdAt)}</small></span>
        ${r.status === 'validated' ? `<span class="pill kept">${I.star} Retenue</span>` : r.status === 'rejected' ? '<span class="pill rej">Écartée</span>' : ''}
      </button>
      ${preview(r)}
      ${musicLine(r)}
      <div class="ctags">${cat ? `<span class="type">${cat[0]} ${cat[1]}</span>` : (isMine(r) || S.user.admin) ? `<button class="type none" data-a="open" data-id="${r.id}">👉 Choisir le type</button>` : '<span class="type none">Type à préciser</span>'}${props.length > 1 ? `<span class="pill multi">${I.users} Proposée ${props.length}×</span>` : ''}</div>
      <div class="votes">${voteRows(r)}</div>
      <button class="cfoot" data-a="open" data-id="${r.id}">${I.bubble}${cms.length ? `<span><b>${cms.length}</b> · ${esc(last.pseudo)} : ${escd(last.text)}</span>` : '<span>Commenter</span>'}<em>${todo ? '<i class="dot"></i>' : ''}Détails ›</em></button>
    </article>`;
  }
  function viewList() {
    const base = S.reels.filter(visible);
    const T = { todo: (r) => !ratedAll(r) && r.status !== 'rejected', all: () => true, mine: isMine, others: (r) => !isMine(r), kept: (r) => r.status === 'validated' };
    const n = (k) => base.filter(T[k]).length;
    const inCat = (r) => S.cat === 'all' || (S.cat === 'none' ? !r.category : r.category === S.cat);
    let list = base.filter(T[S.tab] || T.all).filter(inCat);
    list = list.sort(S.sort === 'top' ? (a, b) => b.votes.score - a.votes.score || b.createdAt - a.createdAt : (a, b) => b.createdAt - a.createdAt);
    const tab = (k, l) => `<button class="${S.tab === k ? 'on' : ''}" data-a="tab" data-v="${k}">${l}${k === 'todo' && n(k) ? `<i>${n(k)}</i>` : ''}</button>`;
    const tcount = (k) => base.filter(T[S.tab] || T.all).filter((r) => k === 'none' ? !r.category : r.category === k).length;
    const tchip = (k, l) => `<button class="tchip ${S.cat === k ? 'on' : ''}" data-a="cat" data-v="${k}">${l}${k !== 'all' ? ` <small>${tcount(k)}</small>` : ''}</button>`;
    const c = cd();
    const empty = { todo: ['🎉', 'Tout est noté', 'Tu as donné ton avis sur toutes les idées.'], all: ['💡', 'Aucune idée pour l’instant', 'Partage un reel depuis Instagram ou touche « Ajouter ».'], mine: ['✨', 'Pas encore d’idée de ta part', 'Touche « Ajouter une idée ».'], others: ['👀', 'Rien des autres pour l’instant', 'Les idées proposées par le reste du groupe apparaîtront ici.'], kept: ['⭐️', 'Rien de retenu pour l’instant', S.user.admin ? 'Ouvre une idée et choisis « Retenue ».' : 'Maxime choisira les danses retenues.'] }[S.tab];
    return `
      <div class="top">${MONO()}<div class="t"><small>${esc(CONFIG.names[0])} & ${esc(CONFIG.names[1])}</small><b>Nos idées de danses</b></div><button data-a="me" aria-label="Mon profil">${av(me())}</button></div>
      ${S.demo ? '<div class="banner">Mode démo : aucune base connectée, rien n’est conservé.</div>' : ''}
      <div class="count"><div class="d"><span data-cd="d">${c.d}</span><small>jours</small></div><div class="x">avant le 21 août 2027 💍<span data-cd="hms"></span></div></div>
      <div class="seg">${tab('todo', 'À noter')}${tab('all', 'Toutes')}${tab('mine', 'De moi')}${tab('others', 'Des autres')}${tab('kept', 'Retenues')}</div>
      <div class="types">${tchip('all', 'Tous les types')}${Object.entries(CATS).map(([k, [e, l]]) => tchip(k, `${e} ${l}`)).join('')}${tchip('none', 'Sans type')}</div>
      <div class="bar"><span>${list.length} idée${list.length > 1 ? 's' : ''}</span><button class="sort" data-a="sort">${I.sort}${S.sort === 'top' ? 'Les mieux notées' : 'Les plus récentes'}</button></div>
      <div class="list">${list.length ? list.map(card).join('') : `<div class="void"><div class="e">${empty[0]}</div><h3>${empty[1]}</h3>${empty[2]}</div>`}</div>
      <button class="fab" data-a="add">${I.plus}Ajouter une idée</button>`;
  }

  /* ——— Page d'une idée ——— */
  function viewIdea() {
    const r = byId(S.id);
    const cat = CATS[r.category];
    const props = r.proposers;
    const notRated = S.members.filter((m) => !r.votes.voters.includes(m));
    const cms = r.comments || [];
    const notes = props.filter((p) => p.note).map((p) => ({ id: null, pseudo: p.pseudo, text: p.note, at: p.at, note: true }));
    const others = S.reels.filter((x) => x.id !== r.id);
    const watchLabel = { instagram: 'Regarder sur Instagram', tiktok: 'Regarder sur TikTok', youtube: 'Regarder sur YouTube' }[r.platform] || 'Regarder la vidéo';
    return `
      <div class="nav"><button class="back" data-a="back">${I.back}Idées</button><div class="ttl">${r.music ? escd(r.music) : 'Idée de danse'}</div></div>
      <div class="page">
        ${thumb(r, 'big')}
        <section class="hero">
          <div class="ctop">${cat ? `<span class="type">${cat[0]} ${cat[1]}</span>` : '<span class="type none">Type à préciser</span>'}
            ${r.status === 'validated' ? `<span class="pill kept">${I.star} Retenue</span>` : r.status === 'rejected' ? '<span class="pill rej">Écartée</span>' : ''}</div>
          ${S.editMusic
            ? `<form class="musicform" data-form="music"><input type="text" name="music" value="${esc(r.music || '')}" placeholder="Titre — Artiste" autocomplete="off" enterkeyhint="done" autofocus><button>OK</button></form>`
            : `<h1 class="${r.music ? '' : 'tbd'}">${r.music ? esc(r.music) : 'Musique à préciser'}</h1>
               <div class="meta">${handle(r) ? `Reel de ${handle(r)} · ` : ''}${esc(plat(r))}</div>
               <button class="edit" data-a="editmusic">${I.edit}${r.music ? 'Corriger la musique' : 'Indiquer la musique'}</button>`}
          <div class="props"><span class="stack">${props.slice(0, 3).map((p) => av(p.pseudo, 'sm')).join('')}</span>
            <p>${props.length > 1 ? `Proposée par <b>${props.length} personnes</b><small>${esc(listFr(props.map((p) => p.pseudo)))}</small>` : `Proposée par <b>${esc(props[0].pseudo)}</b><small>${ago(props[0].at)}</small>`}</p></div>
          <a class="watch" href="${esc(r.url)}" target="_blank" rel="noopener">${I.play}${watchLabel}</a>
        </section>

        <section class="blk"><h2>Ton avis</h2>
          <div class="rate">${CRIT.map(([k, e, , L]) => { const v = r.votes.mine[k]; return `<div class="rrow"><div class="rl"><span class="e">${e}</span>${L}${v ? '' : '<small>à noter</small>'}</div><div class="yn">
            <button class="yes ${v === 1 ? 'on' : ''}" data-a="vote" data-id="${r.id}" data-k="${k}" data-v="${v === 1 ? 0 : 1}">${I.up}J’aime</button>
            <button class="no ${v === -1 ? 'on' : ''}" data-a="vote" data-id="${r.id}" data-k="${k}" data-v="${v === -1 ? 0 : -1}">${I.down}Pas fan</button></div></div>`; }).join('')}</div>
        </section>

        <section class="blk"><h2>L’avis du groupe <small>${r.votes.voters.length}/${S.members.length}</small></h2>
          <div class="grp">${CRIT.map(([k, e, , L]) => { const y = r.votes[k].up, n = r.votes[k].down, t = y.length + n.length; return `<div class="gr"><div class="gh"><span class="e">${e}</span>${L}<span class="c">${t ? `${y.length} 👍 · ${n.length} 👎` : 'pas encore d’avis'}</span></div>
            ${t ? `<div class="track"><span class="y" style="width:${(y.length / t) * 100}%"></span><span class="n" style="width:${(n.length / t) * 100}%"></span></div><div class="who">${y.map((p) => `<span class="y">👍 ${esc(p)}</span>`).join('')}${n.map((p) => `<span class="n">👎 ${esc(p)}</span>`).join('')}</div>` : ''}</div>`; }).join('')}</div>
          ${notRated.length ? `<div class="waiting">Pas encore donné son avis : ${esc(notRated.join(', '))}</div>` : '<div class="waiting">Tout le monde a donné son avis ✓</div>'}
        </section>

        <section class="blk"><h2>Type de danse</h2>${canEditType(r) ? '' : '<p class="sub">Choisi par la personne qui a proposé l’idée.</p>'}
          <div class="cats">${Object.entries(CATS).map(([k, [e, l]]) => `<button class="cat ${r.category === k ? 'on' : ''}" data-a="setcat" data-v="${k}" ${canEditType(r) ? '' : 'disabled'}><span class="e">${e}</span>${l}</button>`).join('')}</div>
        </section>

        <section class="blk"><h2>Commentaires <small>${cms.length}</small></h2>
          <div class="cms">${[...notes, ...cms].map((c) => `<div class="cm ${c.note ? 'note' : ''}">${av(c.pseudo, 'sm')}<div class="b"><div class="h"><b>${esc(c.pseudo)}</b><small>${ago(c.at)}</small>${c.id && (c.pseudo === me() || S.user.admin) ? `<button data-a="delcom" data-v="${c.id}">Supprimer</button>` : ''}</div><p>${esc(c.text)}</p></div></div>`).join('') || '<div class="cnone">Aucun commentaire. Lance la discussion !</div>'}</div>
          <form class="cform" data-form="comment"><input type="text" name="text" placeholder="Écrire un commentaire…" autocomplete="off" enterkeyhint="send" maxlength="500"><button aria-label="Envoyer" disabled>${I.send}</button></form>
          <div class="quick">${['🔥 Validé !', '😍 J’adore', '🤔 Trop dur ?', '👌 Pour l’entrée', '🎶 Bonne musique'].map((q) => `<button data-a="quick" data-v="${esc(q)}">${q}</button>`).join('')}</div>
        </section>

        ${S.user.admin ? `<section class="blk"><h2>Admin</h2><div class="adm">
          <div class="st3">${[['pending', 'En attente'], ['validated', '⭐️ Retenue'], ['rejected', 'Écartée']].map(([k, l]) => `<button class="${r.status === k ? 'on' : ''}" data-a="status" data-v="${k}">${l}</button>`).join('')}</div>
          ${others.length ? `<select data-a="merge"><option value="">C’est un doublon de…</option>${others.map((o) => `<option value="${o.id}">${esc((o.music || o.author || o.code) + ' · ' + o.proposers.map((p) => p.pseudo).join(', '))}</option>`).join('')}</select>` : ''}
          <button class="del" data-a="delete">Supprimer cette idée</button></div></section>` : ''}
      </div>`;
  }

  /* ——— Ajouter ——— */
  function viewAdd() {
    return `<div class="nav"><button class="back" data-a="back">${I.back}Idées</button><div class="ttl">Nouvelle idée</div></div>
      <div class="page"><form data-form="add">
        <p class="sub" style="color:var(--muted);margin:4px 0 0">Le plus simple : dans Instagram, touche <b style="color:var(--text);font-weight:500">Partager</b> puis <b style="color:var(--text);font-weight:500">Chores</b>. Sinon, colle le lien ici.</p>
        <div class="field"><label for="a-u">Lien du reel</label><div class="pastebox"><input id="a-u" type="url" name="url" placeholder="https://www.instagram.com/reel/…" inputmode="url" autocapitalize="none" autocorrect="off" required>${navigator.clipboard?.readText ? '<button type="button" data-a="paste">Coller</button>' : ''}</div></div>
        <div class="field"><label>Type de danse</label><div class="cats" style="margin-top:0">${Object.entries(CATS).map(([k, [e, l]]) => `<button type="button" class="cat" data-a="pickcat" data-v="${k}"><span class="e">${e}</span>${l}</button>`).join('')}</div><input type="hidden" name="category"></div>
        <div class="field"><label for="a-m">Musique <span style="color:var(--faint)">(facultatif)</span></label><input id="a-m" type="text" name="music" placeholder="Titre — Artiste" autocomplete="off"></div>
        <div class="field"><label for="a-n">Pourquoi cette idée ? <span style="color:var(--faint)">(facultatif)</span></label><input id="a-n" type="text" name="note" placeholder="Parfait pour l’entrée des mariés…" autocomplete="off"></div>
        <div class="err" id="err"></div>
        <div class="row2" style="margin-top:8px"><button class="btn">Ajouter l’idée</button></div>
      </form></div>`;
  }

  /* ——— Profil ——— */
  function viewMe() {
    const mine = S.reels.filter(isMine);
    const rated = S.reels.filter((r) => r.votes.voters.includes(me())).length;
    const base = location.origin, tok = S.user.token;
    return `<div class="nav"><button class="back" data-a="back">${I.back}Idées</button><div class="ttl">Profil</div></div>
      <div class="page">
        <div class="me">${av(me(), 'lg')}<div><h1>@${esc(me())}</h1><p>${S.user.admin ? 'Admin du groupe' : 'Membre du groupe'}</p></div></div>
        <div class="stats"><div><b>${mine.length}</b><span>idées proposées</span></div><div><b>${rated}</b><span>idées notées</span></div><div><b>${mine.filter((r) => r.status === 'validated').length}</b><span>retenues</span></div></div>
        <section class="blk"><h2>Le groupe <small>${S.members.length}</small></h2><div class="mem">${S.members.map((m) => `<span>${av(m, 'sm')}${esc(m)}</span>`).join('')}</div></section>
        <section class="blk"><h2>Partager depuis Instagram</h2>
          <details><summary>📱 iPhone · Raccourci ${I.chev}</summary><ol>
            <li>App <b>Raccourcis</b> → <b>+</b>, ajoute <b>Obtenir le contenu de l’URL</b>, puis ⓘ → <b>Afficher dans la feuille de partage</b> (Texte et URL).</li>
            <li>URL <div class="copy"><span>${esc(base)}/api/submit</span><button data-a="copy" data-v="${esc(base)}/api/submit">Copier</button></div>Méthode <b>POST</b>.</li>
            <li>En-tête <code>x-token</code> = ton jeton <div class="copy"><span>${esc(tok)}</span><button data-a="copy" data-v="${esc(tok)}">Copier</button></div></li>
            <li>Corps <b>JSON</b> : champ <code>text</code> = <b>Entrée du raccourci</b>.</li>
            <li><b>Obtenir la valeur du dictionnaire</b> pour <code>message</code>, puis <b>Afficher la notification</b>.</li></ol></details>
          <details><summary>🤖 Android ${I.chev}</summary><ol>
            <li>Ouvre ce site dans <b>Chrome</b> → ⋮ → <b>Ajouter à l’écran d’accueil</b> → <b>Installer</b>.</li>
            <li>Dans Instagram : <b>Partager</b> → <b>Chorés</b>.</li></ol></details>
          <details><summary>🏠 Écran d’accueil iPhone ${I.chev}</summary><ol>
            <li>Dans Safari : <b>Partager</b> → <b>Sur l’écran d’accueil</b>.</li>
            <li>Tire la liste vers le bas pour la rafraîchir.</li></ol></details>
        </section>
        <div class="row2" style="margin-top:30px"><button class="btn ghost" data-a="logout">Se déconnecter</button></div>
      </div>`;
  }

  /* ——— Connexion ——— */
  function renderAuth() {
    const reg = S.authTab === 'register';
    $app.innerHTML = `<section class="auth">${MONO()}
      <h1>${esc(CONFIG.names[0])} <span class="amp">&amp;</span><br>${esc(CONFIG.names[1])}</h1>
      <div class="sub">Nos idées de danses pour le mariage 💃🕺</div>
      <span class="jd"><span data-cd="j">J-…</span>&nbsp;·&nbsp;21 août 2027</span>
      ${S.demo ? '<div class="banner" style="margin:14px 0 0">Mode démo : aucune base connectée.</div>' : ''}
      <form data-form="auth">
        <div class="field"><input type="text" name="pseudo" placeholder="Pseudo Instagram" aria-label="Pseudo Instagram" autocapitalize="none" autocorrect="off" autocomplete="username" required></div>
        <div class="field"><input type="password" name="password" placeholder="Mot de passe" aria-label="Mot de passe" autocomplete="${reg ? 'new-password' : 'current-password'}" required></div>
        ${reg ? `<div class="field"><input type="text" name="invite" placeholder="Code d’invitation" aria-label="Code d’invitation" autocapitalize="none" autocorrect="off"></div>` : ''}
        <div class="err" id="err"></div>
        <button class="btn">${reg ? 'Créer mon compte' : 'Se connecter'}</button>
      </form>
      <div class="switch">${reg ? 'Déjà un compte ?' : 'Pas encore de compte ?'}<button data-a="authtab" data-v="${reg ? 'login' : 'register'}">${reg ? 'Se connecter' : 'Créer un compte'}</button></div>
    </section>`;
    tick();
  }

  /* ——— Tirer pour rafraîchir ——— */
  const ptr = document.createElement('div'); ptr.className = 'ptr';
  ptr.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#e27590" stroke-width="2.2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v5h-5"/></svg>';
  document.body.appendChild(ptr);
  const PULL = 70; let py0 = null, pd = 0, busy = false;
  const setPtr = (d, anim) => { ptr.classList.toggle('anim', !!anim); ptr.style.transform = `translateY(${Math.min(d, 110) - 70}px)`; ptr.style.opacity = Math.min(1, d / PULL); ptr.firstChild.style.transform = `rotate(${d * 3}deg)`; };
  window.addEventListener('touchstart', (e) => { py0 = !busy && window.scrollY <= 0 && e.touches.length === 1 && !e.target.closest('input') ? e.touches[0].clientY : null; pd = 0; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (py0 === null) return;
    const dy = e.touches[0].clientY - py0;
    if (dy <= 0 || window.scrollY > 0) { if (!pd) py0 = null; pd = 0; setPtr(0); return; }
    pd = dy * 0.5; if (e.cancelable) e.preventDefault(); setPtr(pd);
  }, { passive: false });
  window.addEventListener('touchend', async () => {
    if (py0 === null) return; py0 = null;
    if (pd < PULL) return setPtr(0, true);
    busy = true; haptic(); setPtr(PULL, true); ptr.classList.add('spin');
    const t0 = Date.now();
    try { await refresh(); } catch (e) { toast(e.message); }
    setTimeout(() => { ptr.classList.remove('spin'); setPtr(0, true); busy = false; }, Math.max(0, 500 - (Date.now() - t0)));
  });
  // Retour depuis Instagram : on rafraîchit pour voir les nouveaux avis
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (S.user && Date.now() - hiddenAt > 10000 && !document.activeElement?.matches('input')) refresh().catch(() => {});
  });

  /* ——— Actions ——— */
  function applyVote(r, k, val) {
    const p = me(), t = r.votes[k];
    t.up = t.up.filter((x) => x !== p); t.down = t.down.filter((x) => x !== p);
    if (val === 1) t.up.push(p); if (val === -1) t.down.push(p);
    r.votes.mine[k] = val;
    r.votes.voters = r.votes.voters.filter((x) => x !== p); if (CRIT.some(([c]) => r.votes.mine[c])) r.votes.voters.push(p);
    r.votes.score = CRIT.reduce((s, [c]) => s + r.votes[c].up.length - r.votes[c].down.length, 0);
  }
  const keepY = (fn) => { const y = window.scrollY; fn(); window.scrollTo(0, y); };

  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-a]');
    if (!el || el.tagName === 'SELECT') return;
    const a = el.dataset.a, v = el.dataset.v;
    const r = S.id ? byId(S.id) : null;
    try {
      switch (a) {
        case 'authtab': S.authTab = v; return renderAuth();
        case 'tab': {
          S.tab = v; store.set('choreo_tab3', v); keepY(render);
          // garde l'onglet choisi visible dans la barre (défilement horizontal seulement)
          const seg = document.querySelector('.seg'), on = seg?.querySelector('.on');
          if (seg && on && seg.scrollWidth > seg.clientWidth) seg.scrollLeft = on.offsetLeft - (seg.clientWidth - on.offsetWidth) / 2;
          return;
        }
        case 'cat': S.cat = v; return keepY(render);
        case 'sort': S.sort = S.sort === 'top' ? 'recent' : 'top'; return keepY(render);
        case 'open': go('idea', el.dataset.id); if (el.dataset.edit) { S.editMusic = true; render(); document.querySelector('[data-form=music] input')?.focus(); } return;
        case 'expand': S.open.has(v) ? S.open.delete(v) : S.open.add(v); haptic(); return keepY(render);
        case 'add': return go('add');
        case 'me': return go('me');
        case 'back': return history.length > 1 && history.state?.view !== 'list' ? history.back() : go('list', null, { push: false });
        case 'editmusic': S.editMusic = true; keepY(render); document.querySelector('[data-form=music] input')?.focus(); return;
        case 'vote': {
          haptic(); const k = el.dataset.k, val = +v, rr = byId(el.dataset.id || S.id);
          const was = ratedAll(rr);
          applyVote(rr, k, val); keepY(render);
          document.querySelector(`[data-a=vote][data-id="${rr.id}"][data-k=${k}].${val === -1 ? 'no' : 'yes'}`)?.classList.add('pop');
          if (!was && ratedAll(rr)) toast('Merci pour ton avis ✨');
          await api('/api/vote', { method: 'POST', data: { id: rr.id, kind: k, value: val } }); return;
        }
        case 'setcat': {
          if (!canEditType(r)) return;
          haptic(); r.category = r.category === v ? null : v; keepY(render);
          await api('/api/reels', { method: 'PATCH', data: { id: r.id, category: r.category } }); return;
        }
        case 'pickcat': { const f = el.closest('form'); const cur = f.category.value === v ? '' : v; f.category.value = cur; f.querySelectorAll('[data-a=pickcat]').forEach((b) => b.classList.toggle('on', b.dataset.v === cur)); haptic(); return; }
        case 'quick': { const i = document.querySelector('[data-form=comment] input'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.focus(); return; }
        case 'delcom': { r.comments = r.comments.filter((c) => c.id !== v); keepY(render); await api('/api/comments', { method: 'POST', data: { action: 'delete', id: r.id, cid: v } }); return; }
        case 'status': { haptic(); r.status = v; r.statusAt = Date.now(); keepY(render); await api('/api/admin', { method: 'POST', data: { action: 'status', id: r.id, status: v } }); return toast(v === 'validated' ? '⭐️ Idée retenue' : v === 'rejected' ? 'Idée écartée' : 'Remise en attente'); }
        case 'delete':
          if (!el.dataset.confirm) { el.dataset.confirm = '1'; el.textContent = 'Touche encore pour confirmer'; return; }
          await api('/api/admin', { method: 'POST', data: { action: 'delete', id: r.id } }); toast('Idée supprimée'); S.reels = S.reels.filter((x) => x.id !== r.id); go('list', null, { push: false }); return refresh();
        case 'paste': try { document.querySelector('[name=url]').value = (await navigator.clipboard.readText()).trim(); } catch { toast('Colle le lien à la main'); } return;
        case 'copy': try { await navigator.clipboard.writeText(v); toast('Copié ✓'); } catch { toast('Sélectionne le texte pour le copier'); } return;
        case 'logout': await api('/api/auth?action=logout', { method: 'POST' }); S.user = null; S.reels = []; S.view = 'list'; return render();
      }
    } catch (err) { toast(err.message); refresh().catch(() => {}); }
  });

  document.addEventListener('input', (e) => {
    const f = e.target.closest('[data-form=comment]'); if (f) f.querySelector('button').disabled = !e.target.value.trim();
  });

  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.dataset.a !== 'merge' || !el.value) return;
    try { const res = await api('/api/admin', { method: 'POST', data: { action: 'merge', id: S.id, into: el.value } }); toast('Doublons regroupés ✓'); await refresh(); go('idea', res.reel.id, { push: false }); } catch (err) { toast(err.message); }
  });

  document.addEventListener('submit', async (e) => {
    const f = e.target; e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const btn = f.querySelector('button:not([type=button])'); if (btn) btn.disabled = true;
    const r = S.id ? byId(S.id) : null;
    try {
      if (f.dataset.form === 'auth') { const res = await api(`/api/auth?action=${S.authTab}`, { method: 'POST', data: d }); S.user = res.user; await load(); window.scrollTo(0, 0); return; }
      if (f.dataset.form === 'add') {
        const res = await api('/api/submit', { method: 'POST', data: { text: d.url, music: d.music, note: d.note, category: d.category || undefined } });
        toast(res.message); await refresh(); history.replaceState({ view: 'idea', id: res.reel.id }, ''); go('idea', res.reel.id, { push: false }); return;
      }
      if (f.dataset.form === 'music') { r.music = d.music.trim() || null; S.editMusic = false; keepY(render); await api('/api/reels', { method: 'PATCH', data: { id: r.id, music: d.music } }); return; }
      if (f.dataset.form === 'comment') {
        const text = d.text.trim(); if (!text) return;
        r.comments = [...(r.comments || []), { id: 'tmp', pseudo: me(), text, at: Date.now() }];
        keepY(render);
        const res = await api('/api/comments', { method: 'POST', data: { action: 'add', id: r.id, text } });
        r.comments = res.comments; keepY(render); return;
      }
    } catch (err) {
      const box = f.querySelector('#err'); if (box) box.textContent = err.message; else toast(err.message);
    } finally { if (btn?.isConnected && f.dataset.form !== 'comment') btn.disabled = false; }
  });

  window.__choreoReload = () => load(); window.__choreoToast = toast;
  load().catch((e) => { $app.innerHTML = `<section class="auth">${MONO()}<h1>Connexion impossible</h1><p class="sub">${esc(e.message)}<br>Tire vers le bas pour réessayer.</p></section>`; });
})();
