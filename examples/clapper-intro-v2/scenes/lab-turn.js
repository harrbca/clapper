// Pip's head turning, from left to right:  clap still 0 --entry scenes/lab-turn.js
import { gradient, text } from '/@kit/draw.js';
import { pip, REST } from '../characters/pip.js';

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#FFF6EA', '#F6DCC2');
  [-1, -0.5, 0, 0.5, 1].forEach((turn, i) => {
    const x = 220 + i * 370;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 180, 60, 360, 820); ctx.clip();
    pip.draw(ctx, { ...REST, 'head.turn': turn, 'eyes.x': turn * 0.9, 'mood.smile': 0.5 }, { x, y: 1480, scale: 1.2 });
    ctx.restore();
    text(ctx, `turn ${turn}`, x, 930, { size: 30, weight: 500, color: '#6B5A4E' });
  });
}
