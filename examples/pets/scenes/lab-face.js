// The pets' faces: the kit's mouth chart from the front, 3/4 and side on, and a row of the kit's
// expressions at 3/4, for each of them.
//   clap still 0 --entry scenes/lab-face.js
import { gradient, text } from '/@kit/draw.js';
import { MOUTH, MOUTH_NAMES } from '/@kit/cutout.js';
import { cat } from '/@kit/characters/cat.js';
import { dog } from '/@kit/characters/dog.js';
import { still } from './pets.js';

const label = (ctx, s, x, y, size = 18) => text(ctx, s, x, y, { size, weight: 500, color: '#4A4640' });

// A pet drawn so its head's middle is at (x, y), `s` times its size, clipped to a box round its head.
function head(ctx, who, x, y, p, s, box) {
  const pose = still(who, { ...who.poses.stand, 'eyes.blink': 0, ...p });
  const [hx, hy] = who.where('head', pose, [16, -86]);
  ctx.save(); ctx.beginPath(); ctx.rect(x - box / 2, y - box / 2, box, box); ctx.clip();
  who.draw(ctx, pose, { x: x - hx * s, y: y - hy * s, scale: s });
  ctx.restore();
}

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#F4EFE4', '#E2DACB');
  [dog, cat].forEach((who, row) => {
    const y0 = 70 + row * 530;
    label(ctx, who.name, 60, y0 - 40, 22);
    MOUTH_NAMES.forEach((name, i) => {
      const x = 60 + i * 106;
      head(ctx, who, x, y0 + 30, { 'mouth.shape': MOUTH[name] }, 0.4, 104);
      head(ctx, who, x, y0 + 134, { 'mouth.shape': MOUTH[name], 'body.view': 1 }, 0.4, 104);
      head(ctx, who, x, y0 + 238, { 'mouth.shape': MOUTH[name], 'body.view': 2 }, 0.4, 104);
      label(ctx, name, x, y0 + 300, 15);
    });
    Object.entries(who.expressions).forEach(([name, p], i) => {
      const x = 70 + i * 136;
      head(ctx, who, x, y0 + 390, { ...p, 'body.view': 1 }, 0.56, 132);
      label(ctx, name, x, y0 + 466, 16);
    });
  });
}
