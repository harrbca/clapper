// The preview's review routes: /@stills lists the renders in out/ (newest first) for the stills page
// (web/stills.html), and /@notes lists the notes (GET), takes a note typed in the player (POST), and
// changes one (PATCH ?id=3: its words, its frame, or whether it's done) or deletes it (DELETE ?id=3).
// Notes are read by whoever works on the video next, so they're changed only with JSON from the
// preview's own pages: a browser won't send JSON from another site without asking first, and the
// page's origin must be the preview's.
import fs from 'node:fs';
import path from 'node:path';
import { addNote, editNote, readNotes, removeNote, setNote } from './notes.js';

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

// onNote(note, what) hears of each change: what is 'new', 'edited', 'moved', 'done', 'open' or
// 'deleted'.
export function reviewRoutes(P, { onNote } = {}) {
  return {
    '/@stills': (req, res) => json(res, 200, stillsList(P)),
    '/@notes': (req, res, url) => {
      if (req.method === 'GET') return json(res, 200, readNotes(P));
      if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return json(res, 405, { error: 'notes are read with GET, written with POST, changed with PATCH and deleted with DELETE' });
      const origin = req.headers.origin, own = `http://${req.headers.host}`;
      if (!/^application\/json\b/.test(req.headers['content-type'] || '') || (origin && origin !== own)) {
        return json(res, 403, { error: 'notes come from the preview page itself, as JSON' });
      }
      let body = '';
      req.on('data', b => { body += b; if (body.length > 20000) req.destroy(); });
      req.on('end', () => {
        try {
          const ask = JSON.parse(body || '{}'), id = url.searchParams.get('id');
          let note, what;
          if (req.method === 'POST') [note, what] = [addNote(P, ask), 'new'];
          else if (req.method === 'DELETE') [note, what] = [removeNote(P, id), 'deleted'];
          else if (ask.status !== undefined) [note, what] = [setNote(P, id, ask.status, ask.reply), ask.status];
          else if (ask.text !== undefined || ask.t !== undefined) [note, what] = [editNote(P, id, ask), ask.t !== undefined ? 'moved' : 'edited'];
          else throw new Error('a change to a note gives its text, its time (t), or its status');
          onNote?.(note, what);
          json(res, 200, note);
        } catch (e) { json(res, 400, { error: e.message }); }
      });
    },
  };
}
