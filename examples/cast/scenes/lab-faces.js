// Faces and poses: each person's expressions (happy, surprised, talking, angry, from the front, 3/4 and
// facing left), each in a cell of its own, then the stock poses, to check beards, glasses and headsets
// against every face.
//   clap still 0 --entry scenes/lab-faces.js
import { MOUTH } from '/@kit/cutout.js';
import { text } from '/@kit/draw.js';
import { ALL, still } from './cast.js';

const CELL = 150, TOP = 40, S = 0.62;
export function render({ ctx, W, H }) {
  ctx.fillStyle = '#EDE9E0'; ctx.fillRect(0, 0, W, H);
  ALL.forEach((c, i) => {
    const x = 90 + i * 158, E = c.expressions;
    [[E.happy, 0], [E.surprised, 1], [{ ...E.neutral, 'mouth.shape': MOUTH.ai }, 1], [E.angry, -1]].forEach(([face, view], r) => {
      const y = TOP + r * CELL;
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 74, y, 148, CELL - 6); ctx.clip();
      ctx.fillStyle = r % 2 ? '#E4DFD4' : '#E9E4DA'; ctx.fillRect(x - 74, y, 148, CELL - 6);
      c.draw(ctx, still(c, { ...face, 'body.view': view }), { x, y: y + CELL * 0.1 + c.height * S - 30, scale: S });
      ctx.restore();
    });
    const poses = ['wave', 'point', 'shrug', 'cheer', 'thumbsUp', 'hips'];
    c.draw(ctx, still(c, { ...c.poses[poses[i % poses.length]], ...E.happy }), { x, y: 1050, scale: 0.36 });
    text(ctx, c.name, x, 24, { size: 18, weight: 700, color: '#4A4640' });
  });
}
