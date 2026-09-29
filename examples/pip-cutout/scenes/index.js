// Pip's acting test, cut out: the toon acting test's four lines (the same voice, so the same audio),
// performed by the cut-out Pip in a flat room, full length and on twos. Her ponytail swings by itself.
import { on } from '/@kit/core.js';
import { view } from '/@kit/camera.js';
import { caption } from '/@kit/captions.js';
import { requires } from '/@kit/character.js';
import { TL } from '/@kit/timeline.js';
import { pip } from '/@kit/characters/pip-cutout.js';
import { camera, hop, PIP, PIP_MOVES, pipExtra } from './acting.js';
import { room, shadow } from './room.js';

requires({ 'pip-cutout': 1 });                    // made for cut-out Pip version 1

export function render({ ctx, W, H }, t) {
  const cam = camera(t);
  room(ctx, cam, t, W, H);
  view(ctx, cam, 1, () => {
    shadow(ctx, PIP.x, PIP.y, 150 - hop(t) * 0.8);
    pip.draw(ctx, pip.pose(t, PIP_MOVES, { extra: pipExtra }), PIP);
  });
  caption(ctx, t, { bottom: 1052, size: 34, lineH: 44 });
  const black = Math.max(1 - on(t, 0, 0.4), on(t, TL.dur - 0.6, 0.6));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
