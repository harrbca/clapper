// The set, drawn flat like a cut-out show's background: a back wall, pallet racking with cartons,
// and the floor. And Dex's scanner, a pistol-grip barcode scanner, drawn in his hand's space.
import { ink, INK, line, P, stroke } from '/@kit/cutout.js';

const C = { wall: '#C9D3D6', wallLow: '#B7C2C6', floor: '#9AA2A4', floorLine: '#8A9294', upright: '#2F5E9E', beam: '#E9832E', box: '#C99A63', boxDark: '#B0834F', tape: '#E3C58E', label: '#F3F1EA' };

function carton(ctx, x, y, w, h) {
  ink(ctx, P(`M ${x} ${y} h ${w} v ${-h} h ${-w} Z`), C.box, 3);
  ctx.fillStyle = C.tape; ctx.fillRect(x + w / 2 - 6, y - h + 1.5, 12, h - 3);
  ink(ctx, P(`M ${x + 10} ${y - 14} h 26 v -16 h -26 Z`), C.label, 2);
}

// A bay of racking, `x` its left upright, three levels; `seed` varies the cartons.
function bay(ctx, x, w, floorY, seed) {
  const levels = [floorY, floorY - 260, floorY - 520, floorY - 780];
  levels.slice(1).forEach(y => { ink(ctx, P(`M ${x} ${y} h ${w} v 22 h ${-w} Z`), C.beam, 3); });
  levels.slice(0, 3).forEach((y, i) => {
    let cx = x + 18;
    for (let k = 0; k < 3; k++) {
      const bw = 110 + ((seed * 7 + i * 3 + k * 5) % 4) * 22, bh = 120 + ((seed + i + k * 2) % 3) * 40;
      if (cx + bw > x + w - 14) break;
      carton(ctx, cx, y, bw, bh);
      cx += bw + 12;
    }
  });
  for (const ux of [x, x + w - 22]) {
    ink(ctx, P(`M ${ux} ${floorY + 4} v -830 h 22 v 830 Z`), C.upright, 3);
    for (let y = floorY - 40; y > floorY - 800; y -= 48) { ctx.fillStyle = '#244C82'; ctx.fillRect(ux + 8, y, 6, 12); }
  }
}

export function set(ctx, W, floorY) {
  ctx.fillStyle = C.wall; ctx.fillRect(-400, -400, W + 800, floorY + 400);
  ctx.fillStyle = C.wallLow; ctx.fillRect(-400, floorY - 120, W + 800, 120);
  line(ctx, [[-400, floorY - 120], [W + 400, floorY - 120]], 3);
  for (const [x, s] of [[-360, 1], [300, 2], [1320, 3], [1980, 4]]) bay(ctx, x, 600, floorY, s);
  ctx.fillStyle = C.floor; ctx.fillRect(-400, floorY, W + 800, 800);
  line(ctx, [[-400, floorY], [W + 400, floorY]], 3.4);
  ctx.fillStyle = '#E8C640'; ctx.fillRect(-400, floorY + 34, W + 800, 12);
}

// The scanner in a 'grip' hand: its handle across the palm, the head over the thumb, pointing along
// the hand (+y). `laser` 0-1 draws the red scan line; `light` colours the window ('ok', 'bad').
export function scanner(ctx, { laser = 0, light } = {}) {
  ink(ctx, P('M -30 14 h 62 v 20 q 0 6 -6 6 h -50 q -6 0 -6 -6 Z'), '#3A3F47', 3);
  ink(ctx, P('M -58 -16 h 34 v 92 q 0 10 -10 10 h -14 q -10 0 -10 -10 Z'), '#FFC21A', 3);
  ink(ctx, P('M -58 50 h 34 v 26 q 0 10 -10 10 h -14 q -10 0 -10 -10 Z'), '#3A3F47', 3);
  const glass = light === 'ok' ? '#5BE36A' : light === 'bad' ? '#FF4A3D' : '#7A2230';
  ink(ctx, P('M -52 78 h 22 v 6 h -22 Z'), glass, 2);
  if (laser > 0) {
    ctx.save(); ctx.globalAlpha = laser;
    line(ctx, [[-41, 86], [-41, 330]], 10, 'rgba(255,60,50,0.35)');
    line(ctx, [[-41, 86], [-41, 330]], 3, '#FF3B30');
    ctx.restore();
  }
  stroke(ctx, 'M 12 40 q 4 10 -2 16', 3, INK);
}
