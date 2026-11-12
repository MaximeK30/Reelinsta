// Serveur local qui imite Vercel (fichiers de /public + fonctions /api), base en mémoire.
// Usage : npm run dev  →  http://localhost:3000
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const PORT = process.env.PORT || 3000;

http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  if (u.pathname.startsWith('/api/')) {
    const name = u.pathname.slice(5).replace(/[^a-z-]/g, '');
    let mod; try { mod = await import(pathToFileURL(path.join(root, 'api', name + '.js'))); } catch { res.writeHead(404); return res.end('{}'); }
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString();
    req.query = Object.fromEntries(u.searchParams);
    const ct = req.headers['content-type'] || '';
    req.body = !raw ? undefined : ct.includes('json') ? JSON.parse(raw) : ct.includes('urlencoded') ? Object.fromEntries(new URLSearchParams(raw)) : raw;
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); return res; };
    return mod.default(req, res);
  }
  let p = u.pathname === '/' ? '/index.html' : u.pathname === '/share' ? '/share.html' : u.pathname;
  try {
    const file = path.join(root, 'public', path.normalize(p));
    if (!file.startsWith(path.join(root, 'public'))) throw 0;
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(PORT, () => console.log(`Chorés en local : http://localhost:${PORT}`));
