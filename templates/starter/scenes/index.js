// What the video looks like at time t. Draw everything from t and the cues, never from the last
// frame, so any frame can be drawn on its own, in any order.
import { E, inOut, on, pop } from '/@kit/core.js';
import { dot, fillRR, gradient, text, T } from '/@kit/draw.js';
import { caption } from '/@kit/captions.js';
import { cue, H, TL, W } from '/@kit/timeline.js';

export function render({ ctx }, t) {
  gradient(ctx, 0, 0, W, H, '#1B2A3A', '#0E151D');

  // The title pops in when the narrator says "Clapper".
  T(ctx, W / 2, H / 2 - 80, pop(t, cue.title, 0.5), 0, 1, () => {
    fillRR(ctx, -360, -100, 720, 200, 36, '#FFFFFF');
    text(ctx, 'Clapper', 0, 4, { size: 104, weight: 700, color: '#1B2330' });
  });

  // An orange dot slides across on "move", with a little squash as it lands.
  const k = on(t, cue.move, 0.8), land = inOut(t, cue.move + 0.75, 0.08, cue.move + 0.83, 0.25);
  T(ctx, 460 + 1000 * E.io(k), H / 2 + 160, 1, 0, on(t, cue.move - 0.4, 0.3), () => {
    ctx.scale(1 + 0.25 * land, 1 - 0.2 * land);
    dot(ctx, 0, 0, 34, '#FF8A1F');
  });

  caption(ctx, t);

  // Fade in from black, and out at the end.
  const black = Math.max(1 - on(t, 0, 0.5), on(t, TL.dur - 0.8, 0.8));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
