// The set, drawn flat like a cut-out show's background: a living room wall with a window and a
// plant, the skirting, a wooden floor and a rug; and Miso's cushion and the pets' shadows.
import { ink, line, P } from '/@kit/cutout.js';

const C = {
  wall: '#F1E2C6', stripe: '#EBD8B7', skirting: '#FBF6EC', floor: '#D8A468', plank: '#C48F55', rug: '#C8604A', rugIn: '#DE8468',
  sky: '#BFE2F1', cloud: '#FFFFFF', frame: '#FFFDF8', pot: '#C9744A', leaf: '#6FA35A', leafDark: '#5A8C49', cushion: '#6B8FB6', cushionTop: '#86A7CB',
};
export const WALL = 720;          // where the wall meets the floor

function windowFrame(ctx, x, y, w, h) {
  ink(ctx, P(`M ${x - 16} ${y - 16} h ${w + 32} v ${h + 32} h ${-w - 32} Z`), C.frame, 3.4);
  ink(ctx, P(`M ${x} ${y} h ${w} v ${h} h ${-w} Z`), C.sky, 3.4);
  for (const [cx, cy, s] of [[x + w * 0.3, y + h * 0.32, 1], [x + w * 0.74, y + h * 0.56, 0.7]]) {
    ink(ctx, P(`M ${cx - 46 * s} ${cy + 12 * s} C ${cx - 50 * s} ${cy - 10 * s} ${cx - 20 * s} ${cy - 18 * s} ${cx - 8 * s} ${cy - 8 * s} C ${cx} ${cy - 30 * s} ${cx + 38 * s} ${cy - 26 * s} ${cx + 36 * s} ${cy - 2 * s} C ${cx + 56 * s} ${cy - 4 * s} ${cx + 56 * s} ${cy + 14 * s} ${cx + 40 * s} ${cy + 14 * s} Z`), C.cloud, 3);
  }
  line(ctx, [[x + w / 2, y], [x + w / 2, y + h]], 12, C.frame); line(ctx, [[x, y + h / 2], [x + w, y + h / 2]], 12, C.frame);
  ink(ctx, P(`M ${x + w / 2 - 6} ${y} h 12 v ${h} h -12 Z`), null, 3);
  ink(ctx, P(`M ${x} ${y + h / 2 - 6} h ${w} v 12 h ${-w} Z`), null, 3);
  ink(ctx, P(`M ${x - 30} ${y + h + 16} h ${w + 60} v 18 h ${-w - 60} Z`), C.frame, 3.4);        // the sill
}

function plant(ctx, x, y) {
  for (const [a, l, c] of [[-0.9, 70, C.leafDark], [-0.35, 92, C.leaf], [0.15, 84, C.leafDark], [0.7, 66, C.leaf], [-1.5, 50, C.leaf], [1.3, 52, C.leafDark]]) {
    ctx.save(); ctx.translate(x, y - 40); ctx.rotate(a);
    ink(ctx, P(`M 0 0 C -18 ${-l * 0.4} -12 ${-l * 0.85} 0 ${-l} C 12 ${-l * 0.85} 18 ${-l * 0.4} 0 0 Z`), c, 3);
    ctx.restore();
  }
  ink(ctx, P(`M ${x - 34} ${y - 50} h 68 l -8 50 h -52 Z`), C.pot, 3.4);
  ink(ctx, P(`M ${x - 38} ${y - 58} h 76 v 12 h -76 Z`), C.pot, 3.4);
}

export function room(ctx, W) {
  ctx.fillStyle = C.wall; ctx.fillRect(-500, -500, W + 1000, WALL + 500);
  ctx.fillStyle = C.stripe;
  for (let x = -480; x < W + 500; x += 110) ctx.fillRect(x, -500, 44, WALL + 500);
  windowFrame(ctx, 790, 150, 340, 290);
  plant(ctx, 1060, 456);
  ink(ctx, P(`M -500 ${WALL - 44} h ${W + 1000} v 44 h ${-W - 1000} Z`), C.skirting, 3.4);
  ctx.fillStyle = C.floor; ctx.fillRect(-500, WALL, W + 1000, 900);
  for (const [y, lw] of [[WALL + 46, 2.4], [WALL + 110, 2.6], [WALL + 196, 2.8], [WALL + 310, 3]]) line(ctx, [[-500, y], [W + 500, y]], lw, C.plank);
  line(ctx, [[-500, WALL], [W + 500, WALL]], 3.4);
  ink(ctx, P('M 960 862 m -600 0 a 600 76 0 1 0 1200 0 a 600 76 0 1 0 -1200 0 Z'), C.rug, 3.4);
  ink(ctx, P('M 960 862 m -540 0 a 540 60 0 1 0 1080 0 a 540 60 0 1 0 -1080 0 Z'), C.rugIn, 2.4);
}

// Miso's cushion: its top at y, `w` wide.
export function cushion(ctx, x, y, w = 330) {
  const h = w / 2;
  ink(ctx, P(`M ${x - h} ${y + 6} C ${x - h - 10} ${y + 40} ${x - h + 30} ${y + 56} ${x} ${y + 56} C ${x + h - 30} ${y + 56} ${x + h + 10} ${y + 40} ${x + h} ${y + 6} Z`), C.cushion, 3.4);
  ink(ctx, P(`M ${x} ${y + 6} m ${-h} 0 a ${h} 26 0 1 0 ${w} 0 a ${h} 26 0 1 0 ${-w} 0 Z`), C.cushionTop, 3.4);
}

// A soft shadow on the floor, under a pet.
export function shadow(ctx, x, y, w) {
  ctx.save(); ctx.fillStyle = 'rgba(60, 36, 20, 0.16)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, w, w * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
