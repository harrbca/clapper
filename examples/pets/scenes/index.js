// Biscuit and Miso: two cut-out pets in a flat living-room set, on twos, keyed to a narrator's
// lines. They react to each other: wags, a play bow, a head tilt, a nose in the air and a slow blink.
import { on, onTwos } from '/@kit/core.js';
import { view } from '/@kit/camera.js';
import { caption } from '/@kit/captions.js';
import { requires } from '/@kit/character.js';
import { cat } from '/@kit/characters/cat.js';
import { dog } from '/@kit/characters/dog.js';
import { CAT, CAT_MOVES, CAT_TAIL, camera, catExtra, catSway, DOG, DOG_MOVES, DOG_TAIL, dogExtra, dogWag } from './acting.js';
import { grounded, wag } from './pets.js';
import { cushion, room, shadow } from './room.js';
import { TL } from '/@kit/timeline.js';

requires({ dog: 1, cat: 1 });                     // made for Biscuit and Miso version 1

export function render({ ctx, W, H }, t) {
  const cam = camera(t), tq = onTwos(t);
  view(ctx, cam, 0.9, () => room(ctx, W));
  // paws kept on the floor between poses; tails swung on twos too, as their drawings change
  const d = wag(dog, grounded(dog, dog.pose(t, DOG_MOVES, { speaker: 'dog', extra: dogExtra })), tq, dogWag, DOG_TAIL);
  const m = wag(cat, grounded(cat, cat.pose(t, CAT_MOVES, { speaker: 'cat', extra: catExtra })), tq, catSway, CAT_TAIL);
  view(ctx, cam, 1, () => {
    shadow(ctx, DOG.x, DOG.y, 190);
    dog.draw(ctx, d, DOG);
    cushion(ctx, CAT.x - 10, CAT.y - 6);
    cat.draw(ctx, m, CAT);
  });
  caption(ctx, t, { bottom: 1052, size: 34, lineH: 44 });
  const black = Math.max(1 - on(t, 0, 0.4), on(t, TL.dur - 0.9, 0.6));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
