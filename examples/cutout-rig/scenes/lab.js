// Dex's model sheet: the turnaround, every angle, and the hand library.
//   clap still 0 --entry scenes/lab.js
import { gradient, text } from '/@kit/draw.js';
import { ANGLES, hand, HANDS } from '/@kit/cutout.js';
import { dex, PAL, pose } from '/@kit/characters/dex.js';

const still = p => pose(0, [{ t: -1, dur: 0.001, pose: p }], { still: true, twos: false });
const label = (ctx, s, x, y) => text(ctx, s, x, y, { size: 22, weight: 500, color: '#4A4640' });

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#F1EEE7', '#DDD8CC');
  [-2, -1, 0, 1, 2, 3, 4].forEach((n, i) => {
    const x = 170 + i * 263;
    dex.draw(ctx, still({ 'body.view': n, 'eyes.blink': 0 }), { x, y: 560, scale: 0.52 });
    label(ctx, `${n} ${ANGLES[Math.abs(n)]}`, x, 600);
  });
  HANDS.forEach((name, i) => {
    const x = 150 + i * 180, y = 720;
    ctx.save(); ctx.translate(x, y); ctx.scale(2, 2);
    hand(ctx, {}, 1, 'hand', { skin: PAL.skin, name });
    ctx.restore();
    label(ctx, name, x, 1000);
  });
}
