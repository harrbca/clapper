// The kit's named shots (camera.js framing) on Dex in the warehouse, each as the frame it would give.
//   clap still 0 --entry scenes/lab-shots.js
import { framing, SHOTS } from '/@kit/camera.js';
import { gradient, text } from '/@kit/draw.js';
import { dex, EXPR, pose } from '/@kit/characters/dex.js';
import { DEX, FLOOR } from './acting.js';
import { set } from './warehouse.js';

const STAND = { x: 960, y: FLOOR, scale: DEX.scale };
const P = pose(0, [{ t: -1, dur: 0.01, pose: { ...EXPR.happy, 'body.view': 1, 'head.view': -1 } }], { still: true });

// What the camera would show, drawn into a small frame at (tx, ty), `tw` wide.
function frame(ctx, W, H, tx, ty, tw, cam) {
  const th = (tw * H) / W, k = (tw / W) * cam.zoom;
  ctx.save();
  ctx.beginPath(); ctx.rect(tx, ty, tw, th); ctx.clip();
  ctx.translate(tx + tw / 2, ty + th / 2); ctx.scale(k, k); ctx.translate(-cam.x, -cam.y);
  set(ctx, W, FLOOR);
  dex.draw(ctx, P, STAND);
  ctx.restore();
  ctx.strokeStyle = '#4A4640'; ctx.lineWidth = 2; ctx.strokeRect(tx, ty, tw, th);
}

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#F1EEE7', '#DDD8CC');
  Object.entries(SHOTS).forEach(([kind, s], i) => {
    const tw = 580, tx = 50 + (i % 3) * 620, ty = 60 + Math.floor(i / 3) * 500;
    frame(ctx, W, H, tx, ty, tw, framing(kind, { x: STAND.x, y: STAND.y, height: dex.height * STAND.scale, third: kind === 'medium' ? 1 : 0 }));
    text(ctx, `${kind}${kind === 'medium' ? ', on the right third' : ''}: ${s.note}`, tx + tw / 2, ty + (tw * H) / W + 34, { size: 22, weight: 500, color: '#4A4640' });
  });
}
