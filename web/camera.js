// A virtual camera over the scene: pan, zoom and roll around the point it looks at, with parallax,
// so near things move more than far ones.
import { track } from './core.js';
import { H, W } from './timeline.js';

// The view at rest: looking at the middle of the frame, 1:1.
export const REST = { x: W / 2, y: H / 2, zoom: 1, rot: 0 };

// A camera move from keyframes: shot(t, [[t0, { x, y, zoom, rot }], ...]). Missing fields stay at rest.
export function shot(t, keys, ease) {
  const k = keys.map(([at, v]) => [at, [v.x ?? REST.x, v.y ?? REST.y, v.zoom ?? 1, v.rot ?? 0]]);
  const [x, y, zoom, rot] = track(t, k, ease);
  return { x, y, zoom, rot };
}

// Draw fn through the camera. depth 1 is the scene's own plane; 0.5 is twice as far away (it moves
// and scales half as much), 0 is fixed to the screen, above 1 is nearer than the scene.
export function view(ctx, cam, depth, fn) {
  const z = 1 + (cam.zoom - 1) * depth, fx = W / 2 + (cam.x - W / 2) * depth, fy = H / 2 + (cam.y - H / 2) * depth;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  if (cam.rot) ctx.rotate(cam.rot * depth);
  ctx.scale(z, z);
  ctx.translate(-fx, -fy);
  fn();
  ctx.restore();
}

// Where a point in the scene (at a depth) lands on screen.
export function toScreen(cam, [x, y], depth = 1) {
  const z = 1 + (cam.zoom - 1) * depth, fx = W / 2 + (cam.x - W / 2) * depth, fy = H / 2 + (cam.y - H / 2) * depth;
  const r = (cam.rot || 0) * depth, dx = (x - fx) * z, dy = (y - fy) * z;
  return [W / 2 + dx * Math.cos(r) - dy * Math.sin(r), H / 2 + dx * Math.sin(r) + dy * Math.cos(r)];
}
