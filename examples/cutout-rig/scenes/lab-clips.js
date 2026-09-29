// The kit's clips on Dex: each one as a strip of five moments, from its start to its end.
//   clap still 0 --entry scenes/lab-clips.js
import { gradient, text } from '/@kit/draw.js';
import { dex, pose } from '/@kit/characters/dex.js';

const CLIPS = [
  ['wave', {}], ['point', {}], ['shrug', {}],
  ['thumbsUp', {}], ['take', {}], ['turn', { from: 0, to: 2 }],
];
const label = (ctx, s, x, y, size = 22) => text(ctx, s, x, y, { size, weight: 500, color: '#4A4640' });

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#F1EEE7', '#DDD8CC');
  CLIPS.forEach(([name, opts], i) => {
    const moves = dex.play(name, 0.1, opts), end = Math.max(...moves.map(m => m.t + m.dur)) + 0.05;
    const x0 = 40 + (i % 2) * 960, y0 = 20 + Math.floor(i / 2) * 355;
    label(ctx, `${name}${opts.to !== undefined ? ` (from ${opts.from} to ${opts.to})` : ''}`, x0 + 440, y0 + 26, 26);
    for (let k = 0; k < 5; k++) {
      const t = (end * k) / 4;
      dex.draw(ctx, pose(t, moves, { still: true, twos: false }), { x: x0 + 90 + k * 180, y: y0 + 318, scale: 0.28 });
      label(ctx, `${t.toFixed(2)} s`, x0 + 90 + k * 180, y0 + 346, 17);
    }
  });
}
