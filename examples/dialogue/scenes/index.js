// Pip and Gus: a two-hander in the living room, cut between a two-shot and singles, on twos.
import { on } from '/@kit/core.js';
import { view } from '/@kit/camera.js';
import { caption } from '/@kit/captions.js';
import { grade } from '/@kit/finish.js';
import { TL } from '/@kit/timeline.js';
import * as Pip from '/@kit/characters/pip.js';
import * as Gus from '/@kit/characters/gus.js';
import { camera, GUS, GUS_MOVES, gusExtra, PIP, PIP_MOVES, pipExtra } from './acting.js';
import { room } from './room.js';

export function render({ ctx, W, H }, t) {
  const cam = camera(t);
  room(ctx, cam, t, W, H);
  view(ctx, cam, 1, () => {
    Gus.gus.draw(ctx, Gus.pose(t, GUS_MOVES, { speaker: 'gus', extra: gusExtra }), GUS);
    Pip.pip.draw(ctx, Pip.pose(t, PIP_MOVES, { speaker: 'pip', extra: pipExtra }), PIP);
  });
  grade(ctx, { edges: 0.24 });
  caption(ctx, t, { bottom: 1052, size: 34, lineH: 44 });
  const black = Math.max(1 - on(t, 0, 0.4), on(t, TL.dur - 0.6, 0.6));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
