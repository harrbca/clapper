// Each person from every angle: ?group=office for the office.
//   clap still 0 --entry scenes/lab-turn.js      clap still 0 --entry "scenes/lab-turn.js?group=office"
import { text } from '/@kit/draw.js';
import { OFFICE, still, WAREHOUSE } from './cast.js';

const group = new URL(import.meta.url).searchParams.get('group') === 'office' ? OFFICE : WAREHOUSE;
export function render({ ctx, W, H }) {
  ctx.fillStyle = '#EDE9E0'; ctx.fillRect(0, 0, W, H);
  const rows = group.length, rh = H / rows;
  group.forEach((c, r) => {
    [0, 1, 2, 3, 4, -1, -2].forEach((view, i) => c.draw(ctx, still(c, { 'body.view': view }), { x: 190 + i * 250, y: (r + 1) * rh - 8, scale: rh / 1000 }));
    text(ctx, c.name, 60, (r + 0.5) * rh, { size: 20, weight: 700, color: '#4A4640' });
  });
}
