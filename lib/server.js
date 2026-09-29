// A small local web server for the page: the project at /, the kit's page code at /@kit/, and
// /@events for live reload. Listens on 127.0.0.1 only. `routes` adds handlers, { '/@name': (req,
// res, url) => ... }, as the preview does for its stills listing and notes.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { KIT } from './project.js';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.srt': 'text/plain', '.vtt': 'text/vtt',
};

// onFrame(i, jpeg), when given, receives frames the page posts to /@frame?i=N while rendering.
export function serve(P, { port = 0, onFrame, routes = {} } = {}) {
  const web = path.join(KIT, 'web');
  const clients = new Set();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') { res.writeHead(302, { Location: '/@kit/stage.html' }); return res.end(); }
    if (pathname === '/@frame' && req.method === 'POST' && onFrame) {
      const parts = [];
      req.on('data', b => parts.push(b));
      req.on('end', () => { onFrame(Number(url.searchParams.get('i')), Buffer.concat(parts)); res.writeHead(204); res.end(); });
      return;
    }
    if (pathname === '/@events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(': hello\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (routes[pathname]) return routes[pathname](req, res, url);
    // three.js, for 3D layers, from the kit's node_modules; the page's import map points "three" here.
    // opentype.js reads fonts for 3D text; the import map sends three.js's CDN import of it here.
    const three = path.join(KIT, 'node_modules', 'three'), opentype = path.join(KIT, 'node_modules', 'opentype.js', 'dist');
    const [base, rel] = pathname.startsWith('/@kit/three/') ? [three, pathname.slice(12)]
      : pathname.startsWith('/@kit/opentype/') ? [opentype, pathname.slice(15)]
        : pathname.startsWith('/@kit/') ? [web, pathname.slice(6)] : [P.root, pathname.slice(1)];
    const file = path.resolve(base, rel);
    if (file !== base && !file.startsWith(base + path.sep)) { res.writeHead(403); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); return res.end(`not found: ${pathname}`); }
      const headers = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
      const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (range) {                                   // the player's <audio> seeks with ranges
        const a = range[1] ? +range[1] : 0, b = range[2] ? +range[2] : st.size - 1;
        res.writeHead(206, { ...headers, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 });
        return fs.createReadStream(file, { start: a, end: b }).pipe(res);
      }
      res.writeHead(200, { ...headers, 'Content-Length': st.size });
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${server.address().port}`,
    notify: (event, data = {}) => { for (const c of clients) c.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); },
    close: () => { for (const c of clients) c.end(); server.close(); },
  })));
}
