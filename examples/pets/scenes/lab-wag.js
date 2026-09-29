// Tails in motion: trailChain swinging each pet's tail about its pose (posed: true), a wag for
// Biscuit, a slower sway for Miso and a quick twitch for Clover, from the side, the front and behind.
//   clap frames 0.2 1.5 --entry scenes/lab-wag.js
import { gradient, text } from '/@kit/draw.js';
import { cat } from '/@kit/characters/cat.js';
import { dog } from '/@kit/characters/dog.js';
import { rabbit } from '/@kit/characters/rabbit.js';
import { facing, floor, still, sway, wag } from './pets.js';

const label = (ctx, s, x, y, size = 18) => text(ctx, s, x, y, { size, weight: 500, color: '#4A4640' });
const MOTION = {
  dog: [sway({ hz: 3, amp: 40, t0: 0.2 }), { lag: 0.04, stiffness: 320, damping: 16 }],
  cat: [sway({ hz: 0.8, amp: 26, t0: 0.2 }), { lag: 0.09, stiffness: 140, damping: 11 }],
  rabbit: [sway({ hz: 5, amp: 26, t0: 0.2 }), { lag: 0.02, stiffness: 500, damping: 20 }],
};
const SHOW = { dog: [['wag', 2], ['wag', 0], ['wag', 4], ['sit', 1], ['sit', -2]], cat: [['wag', 2], ['wag', 0], ['wag', 4], ['sit', 1], ['sit', -2]],
  rabbit: [['wag', 2], ['wag', 1], ['wag', 4], ['crouch', 1], ['crouch', -2]] };

export function render({ ctx, W, H }, t) {
  gradient(ctx, 0, 0, W, H, '#F4EFE4', '#E2DACB');
  label(ctx, `t = ${t.toFixed(2)}`, 110, 40, 26);
  [dog, cat, rabbit].forEach((who, row) => {
    const y = 330 + row * 350, [motion, opts] = MOTION[who.id];
    SHOW[who.id].forEach(([name, n], i) => {
      const x = 200 + i * 380;
      floor(ctx, x, y, 160);
      const p = still(who, { ...facing(who, who.poses[name], n), ...who.expressions.happy, 'body.view': n, 'eyes.blink': 0 }, t);
      who.draw(ctx, wag(who, p, t, motion, { ...opts, key: `${who.id}.lab${i}` }), { x, y, scale: 0.56 });
      label(ctx, `${who.name}, ${name} ${n}`, x, y + 24);
    });
  });
}
