// Dex's face sheet: the mouth chart from the front, 3/4 and in profile, and his expressions.
//   clap still 0 --entry scenes/lab-face.js
import { gradient, text } from '/@kit/draw.js';
import { MOUTH, MOUTH_NAMES } from '/@kit/cutout.js';
import { dex, EXPR, pose } from '/@kit/characters/dex.js';

const still = p => pose(0, [{ t: -1, dur: 0.001, pose: p }], { still: true, twos: false });
const label = (ctx, s, x, y) => text(ctx, s, x, y, { size: 18, weight: 500, color: '#4A4640' });

function head(ctx, x, y, p, s = 0.58) {
  ctx.save(); ctx.beginPath(); ctx.rect(x - 70, y - 150 * s / 0.58, 140, 170 * s / 0.58); ctx.clip();
  dex.draw(ctx, still({ 'eyes.blink': 0, ...p }), { x, y: y + 700 * s, scale: s });
  ctx.restore();
}

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#F1EEE7', '#DDD8CC');
  MOUTH_NAMES.forEach((name, i) => {
    const x = 70 + i * 104;
    head(ctx, x, 170, { 'mouth.shape': MOUTH[name] });
    head(ctx, x, 390, { 'mouth.shape': MOUTH[name], 'body.view': 1 });
    head(ctx, x, 610, { 'mouth.shape': MOUTH[name], 'body.view': 2 });
    label(ctx, name, x, 640);
  });
  Object.entries(EXPR).forEach(([name, p], i) => {
    const x = 80 + i * 134;
    head(ctx, x, 880, p, 0.72);
    label(ctx, name, x, 925);
  });
}
