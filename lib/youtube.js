// clap upload: a rendered video to YouTube, private unless asked, to watch it there. Signs in with
// Google once, as a desktop app (OAuth with a loopback redirect), and keeps the refresh token. Both
// files stay in the home folder, never in a project or this repo, and are never printed:
//   %USERPROFILE%\youtube-client.json   the OAuth client, from Google Cloud Console (or YOUTUBE_CLIENT_FILE)
//   %USERPROFILE%\youtube-token.json    written on sign-in (or YOUTUBE_TOKEN_FILE)
// YouTube keeps videos uploaded by an API project it hasn't audited private, whatever is asked for.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { run } from './ffmpeg.js';
import { writeJSON } from './project.js';

export const CLIENT_FILE = process.env.YOUTUBE_CLIENT_FILE || path.join(os.homedir(), 'youtube-client.json');
export const TOKEN_FILE = process.env.YOUTUBE_TOKEN_FILE || path.join(os.homedir(), 'youtube-token.json');
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const CHUNK = 16 << 20;                        // resumable uploads go in multiples of 256 KiB
export const PRIVACY = ['private', 'unlisted', 'public'];

function client() {
  if (!fs.existsSync(CLIENT_FILE)) throw new Error(`no ${CLIENT_FILE}: make a Desktop app OAuth client in Google Cloud Console and save its JSON there (README, "YouTube")`);
  const c = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8')).installed;
  if (!c?.client_id) throw new Error(`${CLIENT_FILE} is not a Desktop app OAuth client`);
  return c;
}

async function token(params) {
  const { client_id, client_secret } = client();
  const r = await fetch(TOKEN_URL, { method: 'POST', body: new URLSearchParams({ client_id, client_secret, ...params }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(`Google sign-in -> HTTP ${r.status}: ${j.error ?? ''} ${j.error_description ?? ''}`), { code: j.error });
  return j;
}

function openBrowser(url) {
  const [cmd, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
    : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
}

// Signs in through the browser and keeps the refresh token. Returns an access token.
export async function login() {
  const { client_id } = client();
  const verifier = crypto.randomBytes(48).toString('base64url'), state = crypto.randomBytes(16).toString('hex');
  const server = http.createServer();
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const redirect = `http://127.0.0.1:${server.address().port}`;
  const url = `${AUTH_URL}?${new URLSearchParams({
    client_id, redirect_uri: redirect, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', state,
    code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
  })}`;
  let code;
  try {
    code = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no answer from the Google sign-in within 5 minutes')), 300e3);
      server.on('request', (req, res) => {
        const q = new URL(req.url, redirect).searchParams;
        if (!q.has('code') && !q.has('error')) return res.writeHead(404).end();
        const ok = q.has('code') && q.get('state') === state;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', Connection: 'close' });
        res.end(`<p style="font:18px sans-serif;margin:3em">${ok ? 'Clapper can upload to YouTube now. You can close this tab.' : 'Sign-in failed: see the terminal.'}</p>`);
        clearTimeout(timer);
        if (ok) resolve(q.get('code'));
        else reject(new Error(`Google sign-in: ${q.get('error') ?? 'the answer was not for this sign-in'}`));
      });
      console.log(`  signing in to YouTube in the browser. If it doesn't open, go to:\n  ${url}`);
      openBrowser(url);
    });
  } finally { server.close(); server.closeAllConnections(); }
  const t = await token({ code, code_verifier: verifier, redirect_uri: redirect, grant_type: 'authorization_code' });
  if (!t.refresh_token) throw new Error('Google sent no refresh token');
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ refresh_token: t.refresh_token }) + '\n');
  console.log(`  signed in; the token is kept in ${TOKEN_FILE}`);
  return t.access_token;
}

async function accessToken() {
  if (!fs.existsSync(TOKEN_FILE)) return login();
  const { refresh_token } = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  try { return (await token({ refresh_token, grant_type: 'refresh_token' })).access_token; }
  catch (e) {
    if (e.code !== 'invalid_grant') throw e;
    console.log('  the YouTube sign-in has expired or was taken back; signing in again');
    return login();
  }
}

async function apiError(r) {
  const j = await r.json().catch(() => null), e = j?.error;
  const reason = e?.errors?.[0]?.reason ?? (typeof e === 'string' ? e : '');
  return new Error(`YouTube -> HTTP ${r.status}${reason ? ' ' + reason : ''}: ${e?.message ?? ''}`);
}

// Sends the file in chunks. After a dropped connection or a server error it asks YouTube how much
// arrived and carries on from there. Returns the video resource.
async function send(session, file, auth) {
  const size = fs.statSync(file).size, fd = fs.openSync(file, 'r'), buf = Buffer.alloc(Math.min(CHUNK, size));
  const started = Date.now();
  let offset = 0, query = false, tries = 0;
  try {
    for (;;) {
      const n = query ? 0 : fs.readSync(fd, buf, 0, Math.min(CHUNK, size - offset), offset);
      const range = query ? `bytes */${size}` : `bytes ${offset}-${offset + n - 1}/${size}`;
      let r = null, err = null;
      try { r = await fetch(session, { method: 'PUT', headers: { Authorization: `Bearer ${auth}`, 'Content-Range': range }, body: buf.subarray(0, n) }); }
      catch (e) { err = e; }
      if (r?.ok) { if (offset) process.stdout.write('\n'); return r.json(); }
      if (r?.status === 308) {                   // "resume incomplete": Range says what has arrived
        offset = Number(r.headers.get('range')?.match(/-(\d+)$/)?.[1] ?? -1) + 1;
        query = false; tries = 0;
        process.stdout.write(`\r  ${(offset / 2 ** 20).toFixed(1)}/${(size / 2 ** 20).toFixed(1)} MB, ` +
          `${(offset / 2 ** 20 / ((Date.now() - started) / 1000)).toFixed(1)} MB/s   `);
        continue;
      }
      if (r && r.status !== 401 && r.status < 500) throw await apiError(r);
      if (++tries > 6) throw err ?? await apiError(r);
      console.log(`\n  upload interrupted (${err ? err.cause?.code ?? err.message : 'HTTP ' + r.status}); trying again`);
      await new Promise(res => setTimeout(res, 1000 * 2 ** tries));
      if (r?.status === 401) auth = await accessToken();
      query = true;
    }
  } finally { fs.closeSync(fd); }
}

// The file's chapters as YouTube reads them from a description: "0:00 Title" lines.
export function chapterLines(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_chapters', '-of', 'json', file], { quiet: true });
  const clock = s => {
    const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = String(Math.floor(s) % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
  };
  return (JSON.parse(r.stdout.toString()).chapters ?? []).map(c => `${clock(Number(c.start_time))} ${c.tags?.title ?? ''}`.trim());
}

// Uploads file with its title and a description (the given text, then the chapters). P is the project,
// or null for a file on its own; a project keeps a list of its uploads in out/youtube.json.
export async function upload(P, file, { title, description = '', privacy = 'private' } = {}) {
  if (!PRIVACY.includes(privacy)) throw new Error(`--privacy is one of ${PRIVACY.join(', ')}`);
  const size = fs.statSync(file).size;
  const clean = s => s.replace(/[<>]/g, '').trim();   // YouTube refuses both in titles and descriptions
  const snippet = {
    title: clean(title).slice(0, 100) || 'Untitled',
    description: clean([description, chapterLines(file).join('\n')].filter(Boolean).join('\n\n')).slice(0, 4900),
    categoryId: '22',
  };
  const auth = await accessToken();
  const r = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(size), 'X-Upload-Content-Type': 'video/mp4' },
    body: JSON.stringify({ snippet, status: { privacyStatus: privacy, selfDeclaredMadeForKids: false } }),
  });
  if (!r.ok) throw await apiError(r);
  console.log(`  uploading ${path.basename(file)} (${(size / 2 ** 20).toFixed(1)} MB) as "${snippet.title}", ${privacy}`);
  const v = await send(r.headers.get('location'), file, auth);
  const url = `https://youtu.be/${v.id}`, got = v.status?.privacyStatus ?? privacy;
  console.log(`  on ${v.snippet?.channelTitle ?? 'YouTube'}, ${got}: ${url}\n  studio: https://studio.youtube.com/video/${v.id}/edit`);
  if (got !== privacy) console.log(`  YouTube made it ${got}: uploads from an API project it hasn't audited stay private (README, "YouTube")`);
  console.log('  YouTube is processing it now; HD takes a few minutes longer than SD.');
  if (P) {
    const log = P.file('out', 'youtube.json'), list = fs.existsSync(log) ? JSON.parse(fs.readFileSync(log, 'utf8')) : [];
    list.push({ id: v.id, url, title: snippet.title, privacy: got, file: path.relative(P.root, file).replace(/\\/g, '/'), at: new Date().toISOString() });
    writeJSON(log, list);
  }
  return v;
}
