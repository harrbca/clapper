// Meet the cast: the warehouse floor on the left, the office on the right. Each waves as they're named,
// and everyone waves at the end.
import { on } from '/@kit/core.js';
import { caption } from '/@kit/captions.js';
import { text } from '/@kit/draw.js';
import { cue as c, TL } from '/@kit/timeline.js';
import { OFFICE, WAREHOUSE } from './cast.js';

const FLOOR = 900, S = 0.5;
const wave = (who, t) => {
  const t0 = c[who.id] ?? Infinity;
  return [
    { t: -1, dur: 0.001, pose: { ...who.expressions.neutral, 'mood.smile': 0.3 } },
    { t: t0 - 0.15, dur: 0.25, pose: { ...who.poses.wave, ...who.expressions.happy } },
    { t: t0 + 1.1, dur: 0.35, pose: { ...who.rest, ...who.expressions.happy, 'mood.smile': 0.5 } },
    { t: c.all, dur: 0.3, pose: { ...who.poses.wave, ...who.expressions.delighted } },
  ];
};

export function render({ ctx, W, H }, t) {
  ctx.fillStyle = '#E8E2D4'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#D7CDB8'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = '#DCE4EA'; ctx.fillRect(W / 2, 0, W / 2, FLOOR);
  ctx.fillStyle = '#C9D3DB'; ctx.fillRect(W / 2, FLOOR, W / 2, H - FLOOR);
  text(ctx, 'the warehouse floor', W / 4, 110, { size: 34, weight: 700, color: '#6A5E48' });
  text(ctx, 'the office', (W * 3) / 4, 110, { size: 34, weight: 700, color: '#50606E' });
  [[WAREHOUSE.slice(1), 110], [OFFICE, W / 2 + 110]].forEach(([group, x0]) => group.forEach((who, i) => {
    const x = x0 + i * 180, pop = on(t, (c[who.id] ?? c.all) - 0.3, 0.25);
    const p = who.pose(t, wave(who, t), { extra: () => ({ 'body.view': i < 2 ? 1 : i > 2 ? -1 : 0, 'hips.y': (1 - pop) * 30 }) });
    who.draw(ctx, p, { x, y: FLOOR, scale: S * (0.94 + 0.06 * pop) });
    if (pop > 0) text(ctx, who.name, x, FLOOR + 40, { size: 26, weight: 700, color: `rgba(60,52,40,${pop})` });
  }));
  caption(ctx, t, { bottom: 1052, size: 34, lineH: 44 });
  const black = Math.max(1 - on(t, 0, 0.4), on(t, TL.dur - 0.5, 0.5));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
