// The stunt's key poses, with their contacts.
//   clap still 0 --entry scenes/lab-keys.js
import { gradient, text } from '/@kit/draw.js';
import { line } from '/@kit/cutout.js';
import { dex, pose, REST } from '/@kit/characters/dex.js';
import { contacts, KEY } from './keys.js';

const still = p => pose(0, [{ t: -1, dur: 0.001, pose: p }], { still: true, twos: false });
const label = (ctx, s, x, y) => text(ctx, s, x, y, { size: 22, weight: 500, color: '#4A4640' });

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#F1EEE7', '#DDD8CC');
  const row = [['stand', 'stand'], ['crouch', 'stand'], ['takeoff'], ['tuck', 'tuck'], ['open']];
  const S = 0.42;
  row.forEach(([k, c], i) => {
    const x = 170 + i * 390, y = 470;
    let p = still({ ...REST, ...KEY.stand, ...KEY[k] });
    if (c) p = contacts(p, c);
    line(ctx, [[x - 180, y], [x + 180, y]], 3, '#8A857A');
    dex.draw(ctx, p, { x, y, scale: S });
    label(ctx, k, x, y + 34);
  });
  [['impact', 'impact'], ['hero', 'hero'], ['look', 'hero']].forEach(([k, c], i) => {
    const x = 300 + i * 620, y = 980;
    let p = still({ ...REST, ...KEY.stand, ...KEY.hero, ...(k === 'impact' ? KEY.impact : k === 'look' ? KEY.look : {}) });
    p = contacts(p, c);
    line(ctx, [[x - 280, y], [x + 280, y]], 3, '#8A857A');
    dex.draw(ctx, p, { x, y, scale: 0.6 });
    label(ctx, k, x, y + 34);
  });
}
