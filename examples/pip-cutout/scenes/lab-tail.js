// Pip's ponytail swinging on its own (its chain's trail, run by her pose function): a nod, a hop, a
// turn to side on and back, the take clip, and a dash across (the pose's motion option), each on a
// spring of its own (key). Look at it frame by frame:
//   clap frames 0 3.2 --entry scenes/lab-tail.js
import { clamp, E } from '/@kit/core.js';
import { text } from '/@kit/draw.js';
import { pip } from '/@kit/characters/pip-cutout.js';

const S = 0.5, Y = 800;
const at = (t0, dur, pose, ease = E.io) => ({ t: t0, dur, pose, ease });
const hold = { t: -1, dur: 0.001, pose: { 'eyes.blink': 0, ...pip.expressions.happy } };
const TESTS = [
  ['nod', [hold, at(0.3, 0.18, { 'head.r': 0.22 }), at(0.5, 0.2, { 'head.r': -0.12 }), at(0.72, 0.25, { 'head.r': 0 })]],
  ['hop', [hold, at(0.3, 0.12, { 'hips.y': 30 }), at(0.42, 0.18, { 'hips.y': -110 }, E.out), at(0.6, 0.18, { 'hips.y': 0 }, E.in), at(0.78, 0.1, { 'hips.y': 18 }), at(0.88, 0.2, { 'hips.y': 0 })]],
  ['turn', [hold, ...pip.play('turn', 0.3, { from: 0, to: 2 }), ...pip.play('turn', 1.6, { from: 2, to: 0 })]],
  ['take', [hold, ...pip.play('take', 0.3)]],
  ['dash', [hold, at(0, 0.001, { 'body.view': 2 })]],
];
// the dash: across to the right from 0.3 s to 1.1 s, then a stop
const dashX = u => 1500 + clamp((u - 0.3) / 0.8, 0, 1) ** 1.5 * 260;

export function render({ ctx, W, H }, t) {
  ctx.fillStyle = '#EDE9E0'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#D9D2C4'; ctx.fillRect(0, Y, W, 8);
  TESTS.forEach(([name, moves], i) => {
    const x = name === 'dash' ? dashX(t) : 170 + i * 330;
    const p = pip.pose(t, moves, { key: `pip.lab.${name}`, motion: name === 'dash' ? u => [dashX(u) / S, 0] : undefined });
    pip.draw(ctx, p, { x, y: Y, scale: S });
    text(ctx, name, name === 'dash' ? 1630 : x, Y + 40, { size: 22, weight: 700, color: '#4A4640' });
  });
  text(ctx, `t = ${t.toFixed(2)}`, 100, 60, { size: 26, weight: 500, color: '#4A4640' });
}
