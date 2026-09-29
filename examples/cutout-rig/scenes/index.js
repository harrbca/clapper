// Dex's rig test: a cut-out character in a flat warehouse set, on twos, keyed to four lines, then
// walking off.
import { on, onTwos } from '/@kit/core.js';
import { view } from '/@kit/camera.js';
import { caption } from '/@kit/captions.js';
import { TL } from '/@kit/timeline.js';
import { dex, pose } from '/@kit/characters/dex.js';
import { walk2d, walkPose } from '/@kit/walk2d.js';
import { camera, DEX, DEX_MOVES, dexExtra, done, FLOOR, scanState, WALK } from './acting.js';
import { scanner, set } from './warehouse.js';

export function render({ ctx, W, H }, t) {
  const cam = camera(t);
  view(ctx, cam, 0.85, () => set(ctx, W, FLOOR));
  // he moves on twos: his walk and his place too, so planted feet stay put between drawings
  const tq = onTwos(t), w = walk2d(tq, WALK);
  let p = pose(t, DEX_MOVES, { extra: dexExtra });
  if (tq >= WALK.t0) p = walkPose(dex, p, w, { scale: DEX.scale });
  const sc = scanState(t);
  const held = { handL: c => { c.save(); c.scale(-1.05, 1.05); scanner(c, sc); c.restore(); } };   // the scanner, in his left hand
  view(ctx, cam, 1, () => dex.draw(ctx, p, { ...DEX, x: w.x, held }));
  caption(ctx, t, { bottom: 1052, size: 34, lineH: 44 });
  const black = Math.max(1 - on(t, 0, 0.4), done(t));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
