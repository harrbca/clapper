// Pip 2's sheet: body poses, then a face for every expression and every mouth shape.
//   clap still 0 --entry scenes/lab.js
import { gradient, text } from '/@kit/draw.js';
import { SHAPES } from '/@kit/lipsync.js';
import { EXPR, pip, POSES, REST } from '/@kit/characters/pip.js';

const mouthOf = s => Object.fromEntries(Object.entries(SHAPES[s]).map(([k, v]) => [`mouth.${k}`, v]));
function head(ctx, x, y, p, label, s = 0.46) {
  ctx.save(); ctx.beginPath(); ctx.rect(x - 90, y - 150, 180, 170); ctx.clip();
  pip.draw(ctx, { ...REST, ...p }, { x, y: y + 555 * s, scale: s });
  ctx.restore();
  text(ctx, label, x, y + 36, { size: 20, weight: 500, color: '#3B4A58' });
}
export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#E9F4F7', '#CFE6EE');
  [['rest', {}], ['wave', POSES.wave], ['point', POSES.point], ['shrug', POSES.shrug], ['cheer', POSES.cheer], ['thumbs up', POSES.thumbsUp]]
    .forEach(([n, p], i) => { const x = 160 + i * 320; pip.draw(ctx, { ...REST, ...p }, { x, y: 420, scale: 0.4 }); text(ctx, n, x, 446, { size: 22, weight: 500, color: '#3B4A58' }); });
  Object.entries(EXPR).forEach(([n, p], i) => head(ctx, 90 + (i % 11) * 174, 640 + Math.floor(i / 11) * 210, { ...p, ...mouthOf(n === 'laugh' || n === 'surprised' || n === 'shocked' ? 'ai' : 'rest'), 'mouth.open': n === 'laugh' ? 0.8 : n === 'shocked' ? 0.6 : n === 'surprised' ? 0.3 : 0 }, n));
  ['rest', 'mbp', 'ai', 'e', 'o', 'u', 'fv', 'l', 'th'].forEach((s, i) => head(ctx, 1120 + i * 90, 850, mouthOf(s), s, 0.34));
}
