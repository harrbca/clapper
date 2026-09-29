// The whole cast in a line, from the front and at three-quarters.
//   clap still 0 --entry scenes/lab.js
import { text } from '/@kit/draw.js';
import { ALL, still } from './cast.js';

export function render({ ctx, W, H }) {
  ctx.fillStyle = '#EDE9E0'; ctx.fillRect(0, 0, W, H);
  ALL.forEach((c, i) => {
    const x = 90 + i * 158;
    c.draw(ctx, still(c, { 'mood.smile': 0.35 }), { x, y: 500, scale: 0.42 });
    c.draw(ctx, still(c, { 'body.view': 1, 'mood.smile': 0.2 }), { x, y: 1020, scale: 0.42 });
    text(ctx, c.name, x, 530, { size: 20, weight: 700, color: '#4A4640' });
  });
}
