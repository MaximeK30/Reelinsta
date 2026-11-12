/* Chorés du mariage : interface (vanilla JS, aucune dépendance). */
(() => {
  const $app = document.getElementById('app');
  const MOCK = !!window.__CHOREO_MOCK; // maquette de test : pas d'iframes externes
  const S = { user: null, members: [], reels: [], demo: false, filter: 'all', sort: 'recent', authTab: 'login', open: {}, editing: null, modal: null, busy: false };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const at = (p) => '@' + esc(p);
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'à l’instant'; if (m < 60) return `il y a ${m} min`; const h = Math.round(m / 60); if (h < 24) return `il y a ${h} h`; return `il y a ${Math.round(h / 24)} j`; };

  async function api(path, { method = 'GET', data } = {}) {
    const r = await fetch(path, { method, credentials: 'same-origin', headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Erreur'), { status: r.status });
    return j;
  }

  let toastT;
  function toast(msg) {
    document.querySelector('.toast')?.remove();
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; document.body.appendChild(d);
    clearTimeout(toastT); toastT = setTimeout(() => d.remove(), 3500);
  }

  async function load() {
    const me = await api('/api/auth');
    S.user = me.user; S.members = me.members || []; S.demo = me.demo;
    if (S.user) { S.reels = (await api('/api/reels')).reels; await flushPending(); }
    render();
  }
  async function refresh() { S.reels = (await api('/api/reels')).reels; render(); }

  // Lien partagé avant connexion (depuis /share) : on l'envoie après login.
  async function flushPending() {
    let p; try { p = localStorage.getItem('choreo_pending'); } catch {}
    if (!p) return;
    try { localStorage.removeItem('choreo_pending'); } catch {}
    try { const r = await api('/api/submit', { method: 'POST', data: { text: p } }); toast(r.message); S.reels = (await api('/api/reels')).reels; } catch (e) { toast(e.message); }
  }

  /* ---------- Vues ---------- */
  function render() {
    if (!S.user) return renderAuth();
    const counts = { all: S.reels.length, pending: 0, validated: 0, rejected: 0, mine: 0, tovote: 0 };
    for (const r of S.reels) { counts[r.status]++; if (r.proposers.some((p) => p.pseudo === S.user.pseudo)) counts.mine++; if (!r.votes.voters.includes(S.user.pseudo)) counts.tovote++; }
    let list = S.reels.filter((r) => S.filter === 'all' ? true : S.filter === 'mine' ? r.proposers.some((p) => p.pseudo === S.user.pseudo) : S.filter === 'tovote' ? !r.votes.voters.includes(S.user.pseudo) : r.status === S.filter);
    if (S.sort === 'score') list = [...list].sort((a, b) => b.votes.score - a.votes.score);
    const chip = (k, l) => `<button class="chip ${S.filter === k ? 'on' : ''}" data-a="filter" data-v="${k}">${l}<span class="n">${counts[k]}</span></button>`;

    $app.innerHTML = `
      ${S.demo ? `<div class="banner">Mode démo : aucune base de données connectée, les données s’effacent. Connecte Upstash Redis sur Vercel (voir README).</div>` : ''}
      <div class="top">
        <div><h1>Chorés du mariage</h1><div class="sub">${S.reels.length} proposition${S.reels.length > 1 ? 's' : ''} · ${S.members.length} membre${S.members.length > 1 ? 's' : ''}</div></div>
        <div class="row">
          <button class="pill" data-a="install">📲 Installer</button>
          <button class="pill" data-a="me" title="Se déconnecter">${at(S.user.pseudo)}${S.user.admin ? ' · admin' : ''}</button>
        </div>
      </div>
      <form class="panel add" data-form="add">
        <div class="row">
          <input class="grow" type="text" name="url" placeholder="Colle un lien de reel Instagram…" autocomplete="off" required>
          <button class="btn" ${S.busy ? 'disabled' : ''}>Ajouter</button>
        </div>
        <div class="row" style="margin-top:8px">
          <input class="grow" type="text" name="music" placeholder="🎵 Musique (facultatif)" autocomplete="off">
          <input class="grow" type="text" name="note" placeholder="💬 Un mot ? (ex. pour l’entrée)" autocomplete="off">
        </div>
        <div class="hint">Sur ton téléphone : dans Instagram, touche <b>Partager</b> puis <b>Chorés</b>. Configuration : bouton 📲 Installer.</div>
      </form>
      <div class="row" style="justify-content:space-between;align-items:center">
        <div class="chips grow">${chip('all', 'Tout')}${chip('tovote', 'À voter')}${chip('pending', 'En attente')}${chip('validated', 'Validés')}${chip('rejected', 'Refusés')}${chip('mine', 'Mes propositions')}</div>
      </div>
      <div class="row" style="justify-content:flex-end;margin:-4px 0 10px">
        <div class="seg"><button class="chip ${S.sort === 'recent' ? 'on' : ''}" data-a="sort" data-v="recent">Récents</button><button class="chip ${S.sort === 'score' ? 'on' : ''}" data-a="sort" data-v="score">Mieux notés</button></div>
      </div>
      <div class="list">${list.map(card).join('') || `<div class="empty-state">Rien ici pour l’instant.<br>Partage un premier reel depuis Instagram 💃</div>`}</div>
    `;
    if (S.modal === 'install') renderInstall();
  }

  function embedUrl(r) {
    if (r.platform === 'instagram') return `https://www.instagram.com/reel/${r.code}/embed/`;
    if (r.platform === 'tiktok') return `https://www.tiktok.com/embed/v2/${r.code}`;
    if (r.platform === 'youtube') return `https://www.youtube.com/embed/${r.code}`;
  }

  function voteBox(r, kind, label) {
    const v = r.votes[kind], mine = r.votes.mine[kind];
    const names = [...v.up.map((p) => '👍' + p), ...v.down.map((p) => '👎' + p)].join(' · ');
    return `<div class="vote"><div class="lbl">${label}</div><div class="bts">
      <button class="vb up ${mine === 1 ? 'on' : ''}" data-a="vote" data-id="${r.id}" data-k="${kind}" data-v="${mine === 1 ? 0 : 1}">👍 <span class="c">${v.up.length}</span></button>
      <button class="vb down ${mine === -1 ? 'on' : ''}" data-a="vote" data-id="${r.id}" data-k="${kind}" data-v="${mine === -1 ? 0 : -1}">👎 <span class="c">${v.down.length}</span></button>
    </div><div class="names">${esc(names)}</div></div>`;
  }

  function card(r) {
    const st = { pending: 'En attente', validated: 'Validé ✓', rejected: 'Refusé' }[r.status];
    const dup = r.proposers.length > 1;
    const notVoted = S.members.filter((m) => !r.votes.voters.includes(m));
    const open = S.open[r.id];
    const media = open && !MOCK
      ? `<iframe src="${embedUrl(r)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
      : `${r.thumbnail && !MOCK ? `<img src="${esc(r.thumbnail)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : (open && MOCK ? `<div class="ph">Sur le vrai site, la vidéo se lit ici (lecteur ${esc(r.platform)})</div>` : '')}
         <button class="play" data-a="open" data-id="${r.id}">▶ ${open ? 'Masquer' : 'Voir la vidéo'}</button>`;
    const editing = S.editing === r.id;
    const others = S.reels.filter((x) => x.id !== r.id);
    const noimg = !(open && !MOCK) && !(r.thumbnail && !MOCK);
    return `<article class="card">
      <div class="media ${noimg ? 'noimg' : ''}">${media}<span class="plat">${esc(r.platform)}</span></div>
      <div class="body">
        <div class="title">
          <div class="grow"><div class="who">${r.author ? at(r.author) : 'Reel ' + esc(r.platform)} <a href="${esc(r.url)}" target="_blank" rel="noopener" style="font-weight:400;font-size:13px">ouvrir ↗</a></div>
          ${r.caption ? `<div class="cap">${esc(r.caption)}</div>` : ''}</div>
          <span class="status ${r.status}">${st}</span>
        </div>
        ${editing
          ? `<form class="music" data-form="music" data-id="${r.id}"><span>🎵</span><input class="grow" type="text" name="music" value="${esc(r.music || '')}" placeholder="Titre — Artiste" autofocus style="padding:4px 8px"><button class="btn small">OK</button></form>`
          : `<div class="music ${r.music ? '' : 'empty'}"><span>🎵</span><span class="t">${r.music ? esc(r.music) : 'Musique inconnue'}</span><button class="linkbtn" data-a="editmusic" data-id="${r.id}">${r.music ? 'Modifier' : 'Indiquer'}</button></div>`}
        <div class="props">${dup ? `<span class="dup">DOUBLON ×${r.proposers.length}</span>` : ''}Proposé par ${r.proposers.map((p) => `<b>${at(p.pseudo)}</b>`).join(' et ')} · ${ago(r.proposers[0].at)}</div>
        ${r.proposers.filter((p) => p.note).map((p) => `<div class="note"><b>${at(p.pseudo)}</b> : ${esc(p.note)}</div>`).join('')}
        ${r.sameMusic?.length ? `<div class="same">🎶 Même musique que ${r.sameMusic.length} autre${r.sameMusic.length > 1 ? 's' : ''} proposition${r.sameMusic.length > 1 ? 's' : ''}</div>` : ''}
        <div class="votes">${voteBox(r, 'dance', '💃 La danse')}${voteBox(r, 'music', '🎵 La musique')}</div>
        ${notVoted.length ? `<div class="missing">Pas encore voté : ${notVoted.map(at).join(', ')}</div>` : ''}
        ${S.user.admin ? `<div class="admin"><span class="lab">Admin</span>
          ${r.status !== 'validated' ? `<button class="btn small" style="background:var(--ok)" data-a="status" data-id="${r.id}" data-v="validated">Valider</button>` : ''}
          ${r.status !== 'rejected' ? `<button class="btn small" style="background:var(--ko)" data-a="status" data-id="${r.id}" data-v="rejected">Refuser</button>` : ''}
          ${r.status !== 'pending' ? `<button class="btn small ghost" data-a="status" data-id="${r.id}" data-v="pending">Remettre en attente</button>` : ''}
          ${others.length ? `<select data-a="merge" data-id="${r.id}"><option value="">Fusionner avec…</option>${others.map((o) => `<option value="${o.id}">${esc((o.author ? '@' + o.author : o.code) + (o.music ? ' · ' + o.music : ''))}</option>`).join('')}</select>` : ''}
          <button class="btn small ghost" data-a="delete" data-id="${r.id}">🗑</button>
        </div>` : ''}
      </div>
    </article>`;
  }

  function renderAuth() {
    const reg = S.authTab === 'register';
    $app.innerHTML = `<div class="auth">
      <h1>Chorés du mariage</h1>
      <div class="sub">Les reels qu’on propose, ce qu’on en pense, ce qu’on garde.</div>
      ${S.demo ? `<div class="banner">Mode démo : aucune base connectée.</div>` : ''}
      <div class="panel">
        <div class="tabs"><button class="${!reg ? 'on' : ''}" data-a="tab" data-v="login">Connexion</button><button class="${reg ? 'on' : ''}" data-a="tab" data-v="register">Créer mon compte</button></div>
        <form data-form="auth">
          <label>Ton pseudo Instagram</label><input type="text" name="pseudo" placeholder="@pseudo" autocapitalize="none" autocomplete="username" required>
          <label>Mot de passe</label><input type="password" name="password" autocomplete="${reg ? 'new-password' : 'current-password'}" required>
          ${reg ? `<label>Code d’invitation</label><input type="text" name="invite" placeholder="donné par l’admin" autocapitalize="none">` : ''}
          <div class="err" id="err"></div>
          <button class="btn" style="width:100%">${reg ? 'Créer mon compte' : 'Se connecter'}</button>
        </form>
      </div></div>`;
  }

  function renderInstall() {
    const base = location.origin;
    const tok = S.user.token;
    const m = document.createElement('div'); m.className = 'modal'; m.dataset.a = 'closemodal';
    m.innerHTML = `<div class="sheet">
      <div class="row" style="justify-content:space-between"><h2>Ajouter « Chorés » au menu Partager</h2><button class="btn small ghost" data-a="closemodal">Fermer</button></div>
      <h3>🤖 Samsung / Android</h3>
      <ol><li>Ouvre ce site dans <b>Chrome</b> (ou Samsung Internet).</li>
      <li>Menu ⋮ → <b>Ajouter à l’écran d’accueil</b> → <b>Installer</b>.</li>
      <li>Dans Instagram : <b>Partager</b> → <b>Plus</b>/<b>Partager via</b> → <b>Chorés</b>. C’est tout.</li></ol>
      <h3>🍎 iPhone (app Raccourcis, déjà installée)</h3>
      <p style="margin:4px 0;font-size:13px;color:var(--muted)">iOS ne laisse pas un site apparaître dans le menu Partager : un Raccourci le fait à sa place, sans App Store.</p>
      <ol>
        <li>App <b>Raccourcis</b> → <b>+</b> → nomme-le <b>Chorés</b>.</li>
        <li>Touche ⓘ (en bas) → active <b>Afficher dans la feuille de partage</b>. Types acceptés : <b>URL</b> et <b>Texte</b>.</li>
        <li>Ajoute l’action <b>Obtenir le contenu de l’URL</b> :<br>
          URL : <div class="code"><span>${esc(base)}/api/submit</span><button class="btn small ghost" data-a="copy" data-v="${esc(base)}/api/submit">Copier</button></div>
          Méthode <b>POST</b>, Corps de requête <b>JSON</b>, 2 champs :<br>
          • <code>text</code> = variable <b>Entrée du raccourci</b><br>
          • <code>token</code> = <div class="code"><span>${esc(tok)}</span><button class="btn small ghost" data-a="copy" data-v="${esc(tok)}">Copier</button></div></li>
        <li>Ajoute <b>Obtenir la valeur du dictionnaire</b> : clé <code>message</code>, puis <b>Afficher la notification</b> avec cette valeur.</li>
        <li>Dans Instagram : <b>Partager</b> → <b>Chorés</b>. Une notif confirme l’ajout (ou te dit que c’est un doublon).</li>
      </ol>
      <p style="font-size:12px;color:var(--muted)">Ce jeton est personnel : il signe tes propositions à ton nom. Ne le partage pas.</p>
    </div>`;
    document.body.appendChild(m);
  }

  /* ---------- Actions ---------- */
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-a]');
    if (!el || el.tagName === 'SELECT') return;
    const a = el.dataset.a, id = el.dataset.id, v = el.dataset.v;
    if (a === 'closemodal') { if (e.target !== el) return; S.modal = null; document.querySelector('.modal')?.remove(); return; }
    try {
      if (a === 'tab') { S.authTab = v; return renderAuth(); }
      if (a === 'filter') { S.filter = v; return render(); }
      if (a === 'sort') { S.sort = v; return render(); }
      if (a === 'open') { S.open[id] = !S.open[id]; return render(); }
      if (a === 'editmusic') { S.editing = id; render(); document.querySelector('[data-form=music] input')?.focus(); return; }
      if (a === 'install') { S.modal = 'install'; return renderInstall(); }
      if (a === 'copy') { try { await navigator.clipboard.writeText(v); toast('Copié ✓'); } catch { toast('Copie impossible : sélectionne le texte'); } return; }
      if (a === 'me') {
        if (el.dataset.confirm) { await api('/api/auth?action=logout', { method: 'POST' }); S.user = null; return render(); }
        el.dataset.confirm = '1'; el.textContent = 'Se déconnecter ?'; setTimeout(() => render(), 3000); return;
      }
      if (a === 'vote') {
        const r = S.reels.find((x) => x.id === id);
        await api('/api/vote', { method: 'POST', data: { id, kind: el.dataset.k, value: Number(v) } });
        if (r) { // mise à jour optimiste locale
          const k = el.dataset.k, p = S.user.pseudo, t = r.votes[k];
          t.up = t.up.filter((x) => x !== p); t.down = t.down.filter((x) => x !== p);
          if (+v === 1) t.up.push(p); if (+v === -1) t.down.push(p);
          r.votes.mine[k] = +v;
          const other = r.votes.mine[k === 'dance' ? 'music' : 'dance'];
          r.votes.voters = r.votes.voters.filter((x) => x !== p); if (+v || other) r.votes.voters.push(p);
          r.votes.score = r.votes.dance.up.length - r.votes.dance.down.length + (r.votes.music.up.length - r.votes.music.down.length) * 0.5;
          render();
        }
        return;
      }
      if (a === 'status') { await api('/api/admin', { method: 'POST', data: { action: 'status', id, status: v } }); toast(v === 'validated' ? 'Validé ✓' : v === 'rejected' ? 'Refusé' : 'Remis en attente'); return refresh(); }
      if (a === 'delete') {
        if (!el.dataset.confirm) { el.dataset.confirm = '1'; el.textContent = 'Confirmer ?'; return; }
        await api('/api/admin', { method: 'POST', data: { action: 'delete', id } }); toast('Supprimé'); return refresh();
      }
    } catch (err) { toast(err.message); }
  });

  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.dataset.a === 'merge' && el.value) {
      try { await api('/api/admin', { method: 'POST', data: { action: 'merge', id: el.dataset.id, into: el.value } }); toast('Fusionné ✓'); refresh(); } catch (err) { toast(err.message); }
    }
  });

  document.addEventListener('submit', async (e) => {
    const f = e.target; e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    try {
      if (f.dataset.form === 'auth') {
        const r = await api(`/api/auth?action=${S.authTab}`, { method: 'POST', data: d });
        S.user = r.user; return load();
      }
      if (f.dataset.form === 'add') {
        S.busy = true; render();
        const r = await api('/api/submit', { method: 'POST', data: { text: d.url, music: d.music, note: d.note } });
        S.busy = false; toast(r.message); return refresh();
      }
      if (f.dataset.form === 'music') {
        await api('/api/reels', { method: 'PATCH', data: { id: f.dataset.id, music: d.music } });
        S.editing = null; return refresh();
      }
    } catch (err) {
      S.busy = false;
      const box = document.getElementById('err');
      if (box) box.textContent = err.message; else { toast(err.message); render(); }
    }
  });

  window.__choreoReload = () => load(); window.__choreoToast = toast; // utilisés par la maquette de test
  load().catch((e) => { $app.innerHTML = `<div class="empty-state">Impossible de charger : ${esc(e.message)}</div>`; });
})();
