// The pets turning, the head leading the body, for clap frames:
//   clap frames 0 2.4 --entry scenes/lab-turn.js      standing, all the way round
//   clap frames 2.4 4.4 --entry scenes/lab-turn.js    sitting (Clover crouching), from 3/4 to side on to 3/4 from behind
// Their poses are keyed facing right; passing the back to face left, the stand is played mirrored.
// Poses that tip the body (sit, lie, bow) are for the side views: from the front and back they stand.
import { gradient, text } from '/@kit/draw.js';
import { cat } from '/@kit/characters/cat.js';
import { dog } from '/@kit/characters/dog.js';
import { rabbit } from '/@kit/characters/rabbit.js';
import { facing, floor } from './pets.js';

const label = (ctx, s, x, y, size = 22) => text(ctx, s, x, y, { size, weight: 500, color: '#4A4640' });

// a turn to angle `to` at time t: the head gets there first, then the body
const turn = (t, from, to) => [
  { t, dur: 0.16, pose: { 'head.view': to - from } },
  { t: t + 0.12, dur: 0.3, pose: { 'body.view': to, 'head.view': 0 } },
];
const moves = (who, sit = who.poses.sit) => [
  { t: -1, dur: 0.01, pose: { ...who.poses.stand, 'body.view': 0 } },
  ...turn(0.2, 0, 2), ...turn(0.8, 2, 4),
  { t: 1.3, dur: 0.3, pose: facing(who, who.poses.stand, -1) },
  ...turn(1.35, 4, 6), ...turn(1.9, 6, 8),
  { t: 2.4, dur: 0.01, pose: { ...sit, 'body.view': 1 } },
  ...turn(2.7, 1, 2), ...turn(3.3, 2, 3), ...turn(3.9, 3, 1),
];
const M = { dog: moves(dog), cat: moves(cat), rabbit: moves(rabbit, rabbit.poses.crouch) };

export function render({ ctx, W, H }, t) {
  gradient(ctx, 0, 0, W, H, '#F4EFE4', '#E2DACB');
  label(ctx, `t = ${t.toFixed(2)}`, 110, 60, 28);
  [[dog, 360], [cat, 960], [rabbit, 1560]].forEach(([who, x]) => {
    floor(ctx, x, 820, 260);
    const p = who.pose(t, M[who.id], { twos: false, springy: false, speaker: who.id });
    who.draw(ctx, p, { x, y: 820, scale: 0.95 });
    label(ctx, `${who.name}: body ${p['body.view'].toFixed(2)}, head ${(p['head.view'] ?? 0).toFixed(2)}`, x, 866, 20);
  });
}
