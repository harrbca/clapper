// ElevenLabs: speech with word timings, and music. Every result is cached in the project's audio/
// folder under a hash of its request, so a rebuild never spends credits on audio that already exists.
// The key is read from %USERPROFILE%\elevenlabs-key.txt (or ELEVENLABS_KEY_FILE) and never copied.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const API = 'https://api.elevenlabs.io';
const KEY_FILE = process.env.ELEVENLABS_KEY_FILE || path.join(os.homedir(), 'elevenlabs-key.txt');

const key = () => fs.readFileSync(KEY_FILE, 'utf8').trim();

async function call(route, body, accept = 'application/json') {
  const headers = { 'xi-api-key': key(), Accept: accept };
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(API + route, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`ElevenLabs ${route.split('?')[0]} -> HTTP ${r.status}: ${(await r.text()).slice(0, 500)}`);
  return Buffer.from(await r.arrayBuffer());
}

// JSON with its keys sorted at every level, so equal requests always hash the same.
const canonical = v => (Array.isArray(v) ? `[${v.map(canonical).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`
    : JSON.stringify(v ?? null));
export const cacheKey = request => crypto.createHash('sha1').update(canonical(request)).digest('hex').slice(0, 10);
const cached = (dir, label, request, ext) => path.join(dir, `${label}_${cacheKey(request)}${ext}`);

// Character timings to [{ w, start, end }], punctuation kept on its word.
export function wordsFromAlignment(al) {
  const words = [];
  let cur = '', t0 = null, t1 = null;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push({ w: cur, start: t0, end: t1 });
      cur = ''; t0 = t1 = null;
      return;
    }
    if (!cur) t0 = al.character_start_times_seconds[i];
    cur += ch;
    t1 = al.character_end_times_seconds[i];
  });
  if (cur) words.push({ w: cur, start: t0, end: t1 });
  return words;
}

export const speechRequest = ({ text, voice, model, settings, previousText = null, nextText = null, seed = 7 }) =>
  ({ text, voice, model, settings, previous_text: previousText, next_text: nextText, seed });

// One line of narration: { mp3, words, fresh }. Word timings are seconds from the clip's start.
export async function speech(dir, label, request) {
  const mp3 = cached(dir, label, request, '.mp3'), meta = mp3.replace(/\.mp3$/, '.json');
  if (fs.existsSync(mp3) && fs.existsSync(meta)) return { mp3, words: JSON.parse(fs.readFileSync(meta, 'utf8')).words, fresh: false };
  const body = { text: request.text, model_id: request.model, voice_settings: request.settings, seed: request.seed };
  if (request.previous_text) body.previous_text = request.previous_text;
  if (request.next_text) body.next_text = request.next_text;
  const data = JSON.parse(await call(`/v1/text-to-speech/${request.voice}/with-timestamps?output_format=mp3_44100_128`, body));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(mp3, Buffer.from(data.audio_base64, 'base64'));
  const words = wordsFromAlignment(data.alignment || data.normalized_alignment);
  fs.writeFileSync(meta, JSON.stringify({ request, words }, null, 1));
  return { mp3, words, fresh: true };
}

export async function music(dir, prompt, lengthMs) {
  const request = { prompt, length_ms: lengthMs };
  const mp3 = cached(dir, 'music', request, '.mp3');
  if (fs.existsSync(mp3)) return { mp3, fresh: false };
  const raw = await call('/v1/music?output_format=mp3_44100_128',
    { prompt, music_length_ms: lengthMs, force_instrumental: true }, 'audio/mpeg');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(mp3, raw);
  fs.writeFileSync(mp3.replace(/\.mp3$/, '.json'), JSON.stringify({ request }, null, 1));
  return { mp3, fresh: true };
}

export async function usage() {
  const s = JSON.parse(await call('/v1/user/subscription'));
  return { used: s.character_count ?? 0, limit: s.character_limit ?? 0 };
}
