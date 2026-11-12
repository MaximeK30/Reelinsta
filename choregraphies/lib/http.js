export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; this.expose = true; }
}

// Enveloppe commune : méthodes autorisées + gestion d'erreurs en JSON.
export function route(methods, fn) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) throw new HttpError(405, 'Méthode non autorisée');
      await fn(req, res);
    } catch (e) {
      if (!e.expose) console.error(e);
      const msg = e.expose ? e.message : 'Erreur serveur';
      // "message" aussi, pour que la notif du Raccourci iPhone affiche l'erreur
      res.status(e.status || 500).json({ error: msg, message: '⚠️ ' + msg });
    }
  };
}

export function body(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') { try { return JSON.parse(b); } catch { return { text: b }; } }
  return b;
}
