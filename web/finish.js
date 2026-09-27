// The finishing pass, over the whole frame: a colour grade, a vignette, and depth of field for layers
// drawn far away. Cheap enough to leave on.
import { vignette } from './draw.js';
import { H, W } from './timeline.js';

// Grade the frame so far: contrast, saturation and warmth, as CSS filter amounts (1 = unchanged).
let copy = null;
export function grade(ctx, { contrast = 1.04, saturate = 1.07, warmth = 0.02, edges = 0.22 } = {}) {
  const c = ctx.canvas;
  copy ??= Object.assign(document.createElement('canvas'), { width: c.width, height: c.height });
  const g = copy.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.filter = 'none';
  g.drawImage(c, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = `contrast(${contrast}) saturate(${saturate}) sepia(${warmth})`;
  ctx.drawImage(copy, 0, 0);
  ctx.restore();
  if (edges > 0) vignette(ctx, W, H, edges, '60,30,10');
}

// Depth of field: draw fn with a blur that grows the further the layer is from the focus (depth 1,
// the scene's plane) and the tighter the camera is framed. A layer at depth 0.3 under a 1.5x zoom
// is softer than the same layer in a wide shot.
export function focus(ctx, cam, depth, fn, { strength = 5 } = {}) {
  const blur = Math.max(0, (1 - depth) * strength * (0.6 + (cam.zoom - 1) * 2.2));
  if (blur < 0.3) return fn();
  ctx.save();
  ctx.filter = `blur(${blur.toFixed(2)}px)`;
  fn();
  ctx.restore();
}
