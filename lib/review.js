// The preview's review routes: /@stills lists the renders in out/ (newest first) for the stills page
// (web/stills.html), and /@notes takes a note typed in the player (POST) or lists the notes (GET).
// Notes are read by whoever works on the video next, so they're taken only as JSON from the
// preview's own pages: a browser won't send JSON from another site without asking first, and the
// page's origin must be the preview's.
import fs from 'node:fs';
import path from 'node:path';
import { addNote, readNotes } from './notes.js';

export const IMAGE = /\.(png|jpe?g|webp)$/i;

export function stillsList(P, limit = 240) {
  const root = P.file('out'), out = [];
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) walk(f);
      else if (IMAGE.test(e.name)) out.push({ path: path.relative(P.root, f).split(path.sep).join('/'), mtime: fs.statSync(f).mtimeMs });
    }
  };
  if (fs.existsSync(root)) walk(root);
  return out.sort((a, b) => b.mtime - a.mtime).slice(0, limit);
}

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

export function reviewRoutes(P, { onNote } = {}) {
  return {
    '/@stills': (req, res) => json(res, 200, stillsList(P)),
    '/@notes': (req, res) => {
      if (req.method === 'GET') return json(res, 200, readNotes(P));
      if (req.method !== 'POST') return json(res, 405, { error: 'notes are read with GET and written with POST' });
      const origin = req.headers.origin, own = `http://${req.headers.host}`;
      if (!/^application\/json\b/.test(req.headers['content-type'] || '') || (origin && origin !== own)) {
        return json(res, 403, { error: 'notes come from the preview page itself, as JSON' });
      }
      let body = '';
      req.on('data', b => { body += b; if (body.length > 20000) req.destroy(); });
      req.on('end', () => {
        try {
          const note = addNote(P, JSON.parse(body));
          onNote?.(note);
          json(res, 200, note);
        } catch (e) { json(res, 400, { error: e.message }); }
      });
    },
  };
}
