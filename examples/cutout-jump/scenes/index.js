// Dex jumps off a table, flips, and lands like a superhero. Then his knee.
import { onTwos } from '/@kit/core.js';
import { view } from '/@kit/camera.js';
import { caption } from '/@kit/captions.js';
import { dex, pose } from '/@kit/characters/dex.js';
import { camera, extra, fade, FLOOR, MOVES, place, SCALE, withContacts } from './acting.js';
import { cracks, dust, flash, swoosh, table, trail } from './effects.js';
import { set } from './warehouse.js';

export function render({ ctx, W, H }, t) {
  const cam = camera(t);
  view(ctx, cam, 0.85, () => set(ctx, W, FLOOR));
  view(ctx, cam, 1, () => {
    table(ctx, t);
    cracks(ctx, t);
    flash(ctx, t);
    trail(ctx, t);
    swoosh(ctx, t);
    // he moves on twos, as his drawings change: his place and contacts too, so he lands on the frame
    // his landing pose does
    const tq = onTwos(t), [x, y] = place(tq);
    dex.draw(ctx, withContacts(pose(t, MOVES, { extra }), tq), { x, y, scale: SCALE });
    dust(ctx, t);
  });
  caption(ctx, t, { bottom: 1052, size: 34, lineH: 44 });
  const f = fade(t);
  if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, W, H); }
}
