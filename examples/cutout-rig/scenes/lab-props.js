// Baked props beside Dex: racking and a label printer from three angles, and a desk, made from the
// kit's 3D props with clap bake at the scale Dex is drawn at here, so their ink matches his lines.
// ?zoom=1.75 is the same set with the camera 1.75x closer: the sprites were baked at 2x, so they stay
// sharp, and their lines thicken as his do. ?push=1 moves the camera in from 1x to 1.75x over 3 s.
//   clap still 0 --entry scenes/lab-props.js
//   clap still 0 --entry "scenes/lab-props.js?zoom=1.75"
//   clap frames 0 4 --every 1 --entry "scenes/lab-props.js?push=1"
// The bakes, in assets/baked/. Dex is drawn at 0.6, where his line (3.4) is 2.04 px. The desk and the
// printer are in millimetres, and Dex (950 units) is about 1780 mm tall: 0.6 x 950 / 1780 = 0.32 px per mm.
//   clap bake @kit/props3d.js#rack3d --args '{"bays":1,"bayW":720,"depth":560,"height":1670,"levels":[830,1500]}' --scale 0.6 --line 2.04 --no-shadow --name rack
//   clap bake @kit/printers3d.js#desk3d --args '{"w":1500}' --scale 0.32 --line 2.04 --angles 0 --name desk
//   clap bake @kit/printers3d.js#labelPrinter3d --scale 0.32 --line 2.04 --name printer
import { clamp, E } from '/@kit/core.js';
import { gradient, text } from '/@kit/draw.js';
import { dex, EXPR, pose } from '/@kit/characters/dex.js';
import { loadSprite } from '/@kit/sprite.js';

const q = new URL(import.meta.url).searchParams, ZOOM = Number(q.get('zoom') || 1), PUSH = q.has('push');
const [rack, desk, printer] = await Promise.all(['rack', 'desk', 'printer'].map(n => loadSprite(`/assets/baked/${n}/`)));
const S = 0.6, FLOOR = 1040;
// the desk's top above the floor, as the bake's camera (8 degrees down) sees it
const TOP = 740 * 0.32 * Math.cos((desk.elevation * Math.PI) / 180);
const still = p => pose(0, [{ t: -1, dur: 0.001, pose: p }], { still: true, twos: false });
const label = (ctx, s, x, y) => text(ctx, s, x, y, { size: 20, weight: 500, color: '#4A4640' });

export function render({ ctx, W, H }, t = 0) {
  gradient(ctx, 0, 0, W, H, '#F1EEE7', '#DDD8CC');
  ctx.save();
  // the camera, zoomed about Dex and the desk
  const k = PUSH ? E.io(clamp((t - 0.5) / 3)) : ZOOM === 1 ? 0 : 1, zoom = PUSH ? 1 + 0.75 * k : ZOOM;
  const cx = W / 2 + (1440 - W / 2) * k, cy = H / 2 + (745 - H / 2) * k;
  ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
  ctx.fillStyle = '#CFC8BA'; ctx.fillRect(-2000, FLOOR, 6000, 400);
  rack.draw(ctx, 0, { x: 240, y: FLOOR });
  rack.draw(ctx, 45, { x: 750, y: FLOOR });
  rack.draw(ctx, 90, { x: 1250, y: FLOOR });
  dex.draw(ctx, still({ ...EXPR.happy, 'body.view': 1, 'head.view': 0, 'eyes.blink': 0, 'armR.r': -0.5, 'foreR.r': -1.2, 'handR.shape': 5 }), { x: 1250, y: FLOOR, scale: S });
  desk.draw(ctx, 0, { x: 1650, y: FLOOR });
  printer.draw(ctx, 0, { x: 1470, y: FLOOR - TOP });
  printer.draw(ctx, 45, { x: 1622, y: FLOOR - TOP });
  printer.draw(ctx, 90, { x: 1805, y: FLOOR - TOP });
  if (k === 0) {
    for (const [s, x] of [['rack 0°', 240], ['rack 45°', 750], ['rack 90°, Dex', 1250], ['printer 0°, 45°, 90° on a desk', 1650]]) label(ctx, s, x, FLOOR + 28);
  }
  ctx.restore();
  label(ctx, `camera zoom ${zoom.toFixed(2)}x: baked at 2x, ink ${printer.line} px at 1x, Dex drawn at ${S}`, W / 2, 30);
}
