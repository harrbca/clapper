// The pets' poses, at 3/4 and side on (facing right, as they're keyed). The wag is the tail's chain
// swung by trailChain about the wag pose, a moment into a wag.
//   clap still 0 --entry scenes/lab-poses.js
import { gradient, text } from '/@kit/draw.js';
import { cat } from '/@kit/characters/cat.js';
import { dog } from '/@kit/characters/dog.js';
import { floor, still, sway, wag } from './pets.js';

const label = (ctx, s, x, y, size = 20) => text(ctx, s, x, y, { size, weight: 500, color: '#4A4640' });
const FACES = { stand: 'neutral', sit: 'happy', lie: 'happy', pawUp: 'delighted', beg: 'happy', bow: 'delighted', wag: 'happy' };

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#F4EFE4', '#E2DACB');
  const rows = [[dog, 1, 250], [dog, 2, 510], [cat, 1, 790], [cat, 2, 1050]];
  rows.forEach(([who, n, y], r) => {
    const names = Object.keys(who.poses).filter(k => k !== 'tilt');
    if (n === 1) label(ctx, who.name, 60, y - 225, 24);
    names.forEach((name, i) => {
      const x = 150 + i * 268;
      floor(ctx, x, y, 125);
      let p = still(who, { ...who.poses[name], ...who.expressions[FACES[name]], 'body.view': n, 'eyes.blink': 0 });
      if (name === 'wag') p = wag(who, p, 1.12, sway({ hz: who === cat ? 1.5 : 3 }), { key: `${who.id}.wag${r}` });
      who.draw(ctx, p, { x, y, scale: 0.52 });
      if (n === 1) label(ctx, name, x, y + 26, 18);
    });
  });
}
