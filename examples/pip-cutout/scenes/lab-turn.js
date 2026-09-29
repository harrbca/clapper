// Pip's turnaround: every angle, then her head close up from each of its five drawings, to check the
// fringe, the locks and the ponytail against every face.
//   clap still 0 --entry scenes/lab-turn.js
import { text } from '/@kit/draw.js';
import { pip } from '/@kit/characters/pip-cutout.js';

const ANGLES = [0, 1, 2, 3, 4, -3, -2, -1];
const still = p => pip.pose(0, [{ t: -1, dur: 0.001, pose: { 'eyes.blink': 0, ...pip.expressions.happy, ...p } }], { still: true, twos: false });
const HEAD = -673;                                        // where her head is, in her own space

export function render({ ctx, W, H }) {
  ctx.fillStyle = '#EDE9E0'; ctx.fillRect(0, 0, W, H);
  ANGLES.forEach((n, i) => {
    const x = 130 + i * 237;
    pip.draw(ctx, still({ 'body.view': n }), { x, y: 470, scale: 0.46 });
    text(ctx, `body.view ${n}`, x, 500, { size: 18, weight: 500, color: '#4A4640' });
  });
  [0, 1, 2, 3, 4].forEach((n, i) => {
    const x = 200 + i * 380, y = 560, s = 1.3;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 180, y, 360, 500); ctx.clip();
    ctx.fillStyle = i % 2 ? '#E4DFD4' : '#E9E4DA'; ctx.fillRect(x - 180, y, 360, 500);
    pip.draw(ctx, still({ 'body.view': n }), { x, y: y + 300 - HEAD * s, scale: s });
    ctx.restore();
  });
}
