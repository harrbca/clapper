// The pets' model sheet: each one turned all the way round, every angle the kit draws, standing.
//   clap still 0 --entry scenes/lab.js
import { gradient, text } from '/@kit/draw.js';
import { ANGLES } from '/@kit/cutout.js';
import { cat } from '/@kit/characters/cat.js';
import { dog } from '/@kit/characters/dog.js';
import { rabbit } from '/@kit/characters/rabbit.js';
import { facing, floor, still } from './pets.js';

const TURN = [0, 1, 2, 3, 4, -3, -2, -1];
const label = (ctx, s, x, y, size = 20) => text(ctx, s, x, y, { size, weight: 500, color: '#4A4640' });

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#F4EFE4', '#E2DACB');
  for (const [who, y] of [[dog, 300], [cat, 648], [rabbit, 1010]]) {
    label(ctx, `${who.name} (${who.id})`, 100, y - 262, 24);
    TURN.forEach((n, i) => {
      const x = 130 + i * 237;
      floor(ctx, x, y, 110);
      who.draw(ctx, still(who, { ...facing(who, who.poses.stand, n), 'body.view': n, 'eyes.blink': 0 }), { x, y, scale: 0.5 });
      label(ctx, `${n} ${ANGLES[Math.abs(n)]}`, x, y + 24, 17);
    });
  }
}
