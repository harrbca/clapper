// Dex's poses, from the front and at 3/4, and heads that lead the body.
//   clap still 0 --entry scenes/lab-poses.js
import { gradient, text } from '/@kit/draw.js';
import { dex, EXPR, POSES, pose } from '/@kit/characters/dex.js';

const still = p => pose(0, [{ t: -1, dur: 0.001, pose: p }], { still: true, twos: false });
const label = (ctx, s, x, y) => text(ctx, s, x, y, { size: 20, weight: 500, color: '#4A4640' });
const FACE = { wave: EXPR.happy, point: EXPR.neutral, shrug: EXPR.worried, thumbsUp: EXPR.delighted, stop: EXPR.angry, hips: EXPR.smug, cheer: EXPR.laugh, ok: EXPR.happy, peace: EXPR.happy };

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#F1EEE7', '#DDD8CC');
  const names = Object.keys(POSES).filter(n => n !== 'rest');
  names.forEach((n, i) => {
    const x = 120 + i * 210;
    dex.draw(ctx, still({ ...POSES[n], ...FACE[n], 'eyes.blink': 0 }), { x, y: 500, scale: 0.46 });
    dex.draw(ctx, still({ ...POSES[n], ...FACE[n], 'eyes.blink': 0, 'body.view': 1 }), { x, y: 1000, scale: 0.46 });
    label(ctx, n, x, 530);
  });
}
