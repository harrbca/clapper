// Copy an ElevenLabs cache made by the older Python pipeline (el.py) into a Clapper project's audio/
// folder, under Clapper's cache keys, so nothing has to be generated again.
//   node tools/import-el-cache.mjs <old audio folder> <project folder> [music length in ms]
// Speech files carry their request in a .json beside them. A music file does not, so its request is
// rebuilt from the project's script.json and the given length, and checked against the old key.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cacheKey } from '../lib/eleven.js';

const [from, project, musicLength] = process.argv.slice(2);
if (!from || !project) { console.error('usage: node tools/import-el-cache.mjs <old audio folder> <project folder> [music length ms]'); process.exit(1); }
const to = path.join(project, 'audio');
fs.mkdirSync(to, { recursive: true });
const OLD = /^(.*)_([0-9a-f]{10})\.(mp3|json)$/;
let n = 0;

for (const f of fs.readdirSync(from).filter(f => f.endsWith('.json'))) {
  const meta = JSON.parse(fs.readFileSync(path.join(from, f), 'utf8'));
  if (!meta.request) continue;
  const [, label] = OLD.exec(f), key = cacheKey(meta.request);
  fs.copyFileSync(path.join(from, f.replace(/\.json$/, '.mp3')), path.join(to, `${label}_${key}.mp3`));
  fs.writeFileSync(path.join(to, `${label}_${key}.json`), JSON.stringify(meta, null, 1));
  n++;
}

// Python's json.dumps(sort_keys=True) of {"prompt", "length_ms"}, to recognise the old music file.
const music = fs.existsSync(path.join(project, 'script.json')) && JSON.parse(fs.readFileSync(path.join(project, 'script.json'), 'utf8')).music;
if (music && musicLength) {
  const request = { prompt: music.prompt, length_ms: Number(musicLength) };
  const pyKey = crypto.createHash('sha1').update(`{"length_ms": ${request.length_ms}, "prompt": ${JSON.stringify(request.prompt)}}`).digest('hex').slice(0, 10);
  const old = path.join(from, `music_${pyKey}.mp3`);
  if (fs.existsSync(old)) {
    const mp3 = path.join(to, `music_${cacheKey(request)}.mp3`);
    fs.copyFileSync(old, mp3);
    fs.writeFileSync(mp3.replace(/\.mp3$/, '.json'), JSON.stringify({ request }, null, 1));
    console.log(`  music: ${path.basename(old)} -> ${path.basename(mp3)}`);
    n++;
  } else console.log(`  music: no music_${pyKey}.mp3 for that prompt and length`);
}
console.log(`  ${n} files imported into ${to}`);
