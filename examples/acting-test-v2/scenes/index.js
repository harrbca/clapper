// Pip's acting test: a toon room, Pip waist-up, on twos, keyed to four lines of dialogue.
import { on } from '/@kit/core.js';
import { view } from '/@kit/camera.js';
import { caption } from '/@kit/captions.js';
import { grade } from '/@kit/finish.js';
import { TL } from '/@kit/timeline.js';
import { pip, pose } from '/@kit/characters/pip.js';
import { camera, PIP, PIP_MOVES, pipExtra } from './acting.js';
import { room } from './room.js';


export function render({ ctx, W, H }, t) {
  const cam = camera(t);
  room(ctx, cam, t, W, H);
  view(ctx, cam, 1, () => pip.draw(ctx, pose(t, PIP_MOVES, { extra: pipExtra }), PIP));
  grade(ctx, { edges: 0.26 });
  caption(ctx, t, { bottom: 1052, size: 34, lineH: 44 });
  const black = Math.max(1 - on(t, 0, 0.4), on(t, TL.dur - 0.6, 0.6));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
