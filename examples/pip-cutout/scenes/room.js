// The acting test's living room, redrawn flat, as a cut-out show's background: flat colours and the
// cut-out kit's one ink line (no shadow tones or gradients). A blue wall with wainscoting, a window
// on a sunset, a framed clapperboard, a plant, and a wooden floor. At depth 0.85, so camera moves
// slide it a little less than Pip.
import { view } from '/@kit/camera.js';
import { ink, line, P, stroke } from '/@kit/cutout.js';

const C = {
  wall: '#8FC3D4', panel: '#6FA2B6', rail: '#F4EBDD', floor: '#C98F5A', plank: '#B07A48', sky: '#FFC99A', sun: '#FFF1CF',
  cloud: '#FFFFFF', frame: '#C98A4B', mat: '#FFF7EA', board: '#1B2330', stripe: '#FF8A1F', leaf: '#4DAA6A', leafDark: '#3A8A55', pot: '#E9774B', rim: '#F08A5D',
};
export const FLOOR = 880;            // where the wall meets the floor

const box = (x, y, w, h, r = 0) => { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; };

function windowOnSunset(ctx, t) {
  const win = box(1300, 120, 440, 440, 12);
  ink(ctx, win, C.sky);
  ctx.save(); ctx.clip(win);
  ink(ctx, P('M 1590 470 m -70 0 a 70 70 0 1 0 140 0 a 70 70 0 1 0 -140 0 Z'), C.sun, 0);
  for (const [cx, cy, s] of [[1370, 240, 1], [1660, 320, 0.8], [1480, 390, 0.6]]) {
    const x = cx + ((t * 9 * s) % 600) - 100;
    ink(ctx, P(`M ${x - 60 * s} ${cy} C ${x - 64 * s} ${cy - 26 * s} ${x - 30 * s} ${cy - 40 * s} ${x - 12 * s} ${cy - 24 * s} C ${x - 4 * s} ${cy - 56 * s} ${x + 46 * s} ${cy - 56 * s} ${x + 50 * s} ${cy - 22 * s} C ${x + 76 * s} ${cy - 26 * s} ${x + 86 * s} ${cy} ${x + 70 * s} ${cy} Z`), C.cloud, 3);
  }
  ctx.restore();
  line(ctx, [[1520, 120], [1520, 560]], 14, C.rail); line(ctx, [[1300, 340], [1740, 340]], 14, C.rail);
  ink(ctx, box(1513, 120, 14, 440), null, 2.5); ink(ctx, box(1300, 333, 440, 14), null, 2.5);
  stroke(ctx, win, 20); stroke(ctx, win, 13, C.rail);                          // the frame
  ink(ctx, box(1276, 556, 488, 28, 6), C.rail);                               // the sill
}

function clapperboard(ctx) {
  ink(ctx, box(170, 170, 250, 200, 6), C.frame);
  ink(ctx, box(190, 190, 210, 160, 3), C.mat);
  ink(ctx, box(235, 245, 120, 80, 4), C.board, 3);
  ctx.save(); ctx.beginPath(); ctx.rect(235, 222, 120, 22); ctx.clip();
  for (let i = -1; i < 6; i++) ink(ctx, P(`M ${235 + i * 24} 244 h 24 l 12 -22 h -24 Z`), i % 2 ? '#FFFFFF' : C.stripe, 0);
  ctx.restore();
  ink(ctx, box(235, 222, 120, 22, 3), null, 3);
}

function plant(ctx, t) {
  const sway = Math.sin(t * 0.9) * 0.03;
  ctx.save(); ctx.translate(250, FLOOR - 150);
  for (const [a, len, w, c] of [[-0.9, 190, 46, C.leafDark], [-0.55, 250, 60, C.leaf], [0.7, 220, 50, C.leafDark], [0.3, 270, 58, C.leaf], [-0.15, 300, 64, C.leaf]]) {
    ctx.save(); ctx.rotate(a + sway);
    ink(ctx, P(`M 0 0 Q ${w} ${-len * 0.55} 0 ${-len} Q ${-w} ${-len * 0.55} 0 0 Z`), c, 3.4);
    line(ctx, [[0, -8], [2, -len * 0.5], [0, -len * 0.88]], 2.4);
    ctx.restore();
  }
  ink(ctx, P('M -90 -10 L 90 -10 L 70 150 L -70 150 Z'), C.pot);
  ink(ctx, box(-100, -26, 200, 30, 6), C.rim);
  ctx.restore();
}

export function room(ctx, cam, t, W, H) {
  view(ctx, cam, 0.85, () => {
    ctx.fillStyle = C.wall; ctx.fillRect(-400, -300, W + 800, FLOOR + 300);
    ctx.fillStyle = C.panel; ctx.fillRect(-400, 640, W + 800, FLOOR - 640);
    for (let x = -300; x < W + 400; x += 260) ink(ctx, box(x, 680, 200, FLOOR - 720, 8), null, 3);
    ink(ctx, box(-400, 626, W + 800, 18), C.rail);                              // the chair rail
    windowOnSunset(ctx, t);
    clapperboard(ctx);
    ctx.fillStyle = C.floor; ctx.fillRect(-400, FLOOR, W + 800, H + 300);
    for (const [y, lw] of [[FLOOR + 40, 2.4], [FLOOR + 100, 2.6], [FLOOR + 190, 2.8], [FLOOR + 320, 3]]) line(ctx, [[-400, y], [W + 400, y]], lw, C.plank);
    ink(ctx, box(-400, FLOOR - 26, W + 800, 26), C.rail);                        // the skirting
    plant(ctx, t);
  });
}

// A soft shadow on the floor under her.
export function shadow(ctx, x, y, w) {
  ctx.save(); ctx.fillStyle = 'rgba(70, 40, 20, 0.18)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, w, w * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
