// A video project is a folder with video.json in it. See README.md for the layout.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULTS = {
  title: 'Untitled',
  fps: 30,
  width: 1920,
  height: 1080,
  background: '#000000',
  entry: 'scenes/index.js',
  timeline: 'timeline.js',
  script: 'script.json',
  fonts: [],
  chapters: {},
  loudness: -16,
};

export function findProject(start = process.cwd()) {
  for (let dir = path.resolve(start); ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'video.json'))) return dir;
    if (path.dirname(dir) === dir) throw new Error(`no video.json in ${start} or any folder above it`);
  }
}

export function loadProject(dir) {
  const root = findProject(dir);
  const config = { ...DEFAULTS, ...readJSON(path.join(root, 'video.json')) };
  const file = (...p) => path.join(root, ...p);
  const P = {
    root,
    config,
    file,
    build: file('build'),
    out: file('out'),
    audio: file('audio'),                                    // the ElevenLabs cache: costs credits, keep it
    script: () => readJSON(file(config.script)),
    narration: () => readJSON(file('build', 'narration.json')),
    timeline: () => readJSON(file('build', 'timeline.json')),
    // A sound effect by name: the project's own first, then the kit's library.
    sfx: name => [file('assets', 'sfx', `${name}.wav`), path.join(KIT, 'sfx', `${name}.wav`)].find(f => fs.existsSync(f))
      ?? fail(`no sound effect called ${name} in assets/sfx or the kit's sfx folder`),
  };
  for (const d of [P.build, P.out]) fs.mkdirSync(d, { recursive: true });
  return P;
}

export const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
export const writeJSON = (f, data, indent = 1) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data, null, indent) + '\n');
};
function fail(msg) { throw new Error(msg); }
