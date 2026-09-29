// Clover's sheet: her poses at 3/4 and side on (a twitch of her tail in the last, trailChain about
// the pose), and the kit's expressions on her at 3/4.
//   clap still 0 --entry scenes/lab-rabbit.js
import { gradient, text } from '/@kit/draw.js';
import { rabbit } from '/@kit/characters/rabbit.js';
import { floor, still, sway, wag } from './pets.js';

const label = (ctx, s, x, y, size = 20) => text(ctx, s, x, y, { size, weight: 500, color: '#4A4640' });
const FACES = { stand: 'neutral', crouch: 'happy', sit: 'surprised', lie: 'happy', hop: 'delighted', wag: 'happy' };

// A pet drawn so its head's middle is at (x, y), `s` times its size, clipped to a box round its head.
function head(ctx, who, x, y, p, s, box) {
  const pose = still(who, { ...who.poses.stand, 'eyes.blink': 0, ...p });
  const [hx, hy] = who.where('head', pose, [12, -70]);
  ctx.save(); ctx.beginPath(); ctx.rect(x - box / 2, y - box / 2 - 30, box, box + 30); ctx.clip();
  who.draw(ctx, pose, { x: x - hx * s, y: y - hy * s, scale: s });
  ctx.restore();
}

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#F4EFE4', '#E2DACB');
  label(ctx, rabbit.name, 60, 34, 24);
  const names = Object.keys(rabbit.poses).filter(k => k !== 'tilt');
  [[1, 320], [2, 668]].forEach(([n, y]) => names.forEach((name, i) => {
    const x = 170 + i * 310;
    floor(ctx, x, y, 140);
    let p = still(rabbit, { ...rabbit.poses[name], ...rabbit.expressions[FACES[name]], 'body.view': n, 'eyes.blink': 0 });
    if (name === 'wag') p = wag(rabbit, p, 1.05, sway({ hz: 5, amp: 30 }), { key: `rabbit.lab${n}`, stiffness: 500, damping: 20 });
    rabbit.draw(ctx, p, { x, y, scale: 0.56 });
    if (n === 1) label(ctx, name, x, y + 26, 18);
  }));
  Object.entries(rabbit.expressions).forEach(([name, p], i) => {
    const x = 70 + i * 136;
    head(ctx, rabbit, x, 870, { ...p, 'body.view': 1 }, 0.6, 132);
    label(ctx, name, x, 960, 16);
  });
}
