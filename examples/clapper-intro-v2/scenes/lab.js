// A character sheet, for looking at Pip without the video around it:
//   clap still 0 --entry scenes/lab.js
import { SHAPES } from '/@kit/lipsync.js';
import { gradient, text } from '/@kit/draw.js';
import { add } from '/@kit/puppet.js';
import { pip, POSES, REST } from '../characters/pip.js';

const shape = s => Object.fromEntries(Object.entries(SHAPES[s]).map(([k, v]) => [`mouth.${k}`, v]));

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#FFF6EA', '#F6DCC2');
  const bodies = [['rest', {}], ['wave', POSES.wave], ['point', POSES.point], ['shrug', POSES.shrug], ['cheer', POSES.cheer]];
  bodies.forEach(([name, p], i) => {
    const x = 200 + i * 380;
    pip.draw(ctx, add({ ...REST, ...p }, {}), { x, y: 520, scale: 0.5 });
    text(ctx, name, x, 552, { size: 26, weight: 500, color: '#6B5A4E' });
  });
  const heads = [['rest', shape('rest')], ['ai', shape('ai')], ['o', shape('o')], ['e', shape('e')], ['m b p', shape('mbp')],
    ['f v', shape('fv')], ['blink', { ...shape('rest'), 'eyes.blink': 1 }], ['surprised', { ...shape('o'), 'brows.up': 1, 'mood.smile': 0 }]];
  heads.forEach(([name, p], i) => {
    const x = 125 + i * 238, y = 1030;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 115, 600, 230, 400); ctx.clip();
    pip.draw(ctx, { ...REST, ...p }, { x, y: y + 480 * 0.62, scale: 0.62 });
    ctx.restore();
    text(ctx, name, x, 1050, { size: 24, weight: 500, color: '#6B5A4E' });
  });
}
