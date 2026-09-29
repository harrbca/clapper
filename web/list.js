// clap list: what a character understands, for the command line. clap loads this page as the stage's
// entry with ?character=<a kit character's name, or a path in the project> and reads window.clapList:
// the character's registry (see Character.registry), and the kit's named shots and easings.
import { SHOTS } from './camera.js';
import { Character } from './character.js';
import { E } from './core.js';

const want = new URL(import.meta.url).searchParams.get('character') || '';
const src = /[/\\]|\.js$/.test(want) ? '/' + want.replace(/\\/g, '/').replace(/^\/+/, '') : `/@kit/characters/${want}.js`;
let found;
try {
  const mod = await import(src);
  found = { characters: Object.values(mod).filter(v => v instanceof Character).map(c => c.registry()) };
} catch (e) {
  found = { error: String(e?.message || e) };
}
window.clapList = { src, ...found, easings: Object.keys(E), shots: Object.fromEntries(Object.entries(SHOTS).map(([k, s]) => [k, s.note])) };

export function render({ ctx, W, H }) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); }
