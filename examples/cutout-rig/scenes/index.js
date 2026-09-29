// Dex's rig test: a cut-out character in a flat warehouse set, on twos, keyed to four lines, then
// walking off.
import { on } from '/@kit/core.js';
import { view } from '/@kit/camera.js';
import { caption } from '/@kit/captions.js';
import { TL } from '/@kit/timeline.js';
import { dex, HELD, pose } from '/@kit/characters/dex.js';
import { camera, DEX, DEX_MOVES, dexExtra, done, FLOOR, scanState, walked } from './acting.js';
import { scanner, set } from './warehouse.js';

export function render({ ctx, W, H }, t) {
  const cam = camera(t);
  view(ctx, cam, 0.85, () => set(ctx, W, FLOOR));
  const p = pose(t, DEX_MOVES, { extra: dexExtra });
  const sc = scanState(t);
  HELD.L = c => { c.save(); c.scale(-1.05, 1.05); scanner(c, sc); c.restore(); };
  view(ctx, cam, 1, () => dex.draw(ctx, p, { ...DEX, x: DEX.x + walked(t) }));
  HELD.L = null;
  caption(ctx, t, { bottom: 1052, size: 34, lineH: 44 });
  const black = Math.max(1 - on(t, 0, 0.4), done(t));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
