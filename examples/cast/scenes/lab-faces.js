// Faces and poses: each person's expressions (neutral, happy, surprised, angry, a talking mouth), and
// the stock poses, to check beards, glasses and headsets against every face.
//   clap still 0 --entry scenes/lab-faces.js
import { HAND, MOUTH } from '/@kit/cutout.js';
import { text } from '/@kit/draw.js';
import { ALL, still } from './cast.js';

export function render({ ctx, W, H }) {
  ctx.fillStyle = '#EDE9E0'; ctx.fillRect(0, 0, W, H);
  ALL.forEach((c, i) => {
    const x = 90 + i * 158, E = c.expressions;
    [[E.happy, 0], [E.surprised, 1], [{ ...E.neutral, 'mouth.shape': MOUTH.ai }, 1], [E.angry, -1]].forEach(([face, view], r) => {
      c.draw(ctx, still(c, { ...face, 'body.view': view }), { x, y: 200 + r * 190, scale: 0.72, clip: true });
    });
    const poses = ['wave', 'point', 'shrug', 'cheer'];
    c.draw(ctx, still(c, { ...c.poses[poses[i % 4]], ...E.happy }), { x, y: 1060, scale: 0.3 });
    text(ctx, c.name, x, 22, { size: 18, weight: 700, color: '#4A4640' });
  });
}
