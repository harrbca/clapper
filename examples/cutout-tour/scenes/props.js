// The tour's 2D props, drawn in cut-out ink: the handheld scanner and the shipping label.
import { INK, ink, line, LW, P, stroke } from '/@kit/cutout.js';

// A rugged handheld scanner, in a hand's space (the nose down the fingers). laser: 0..1, reaching `reach`.
export function scanner(ctx, { laser = 0, reach = 420, light } = {}) {
  ink(ctx, P('M -30 14 h 62 v 20 q 0 6 -6 6 h -50 q -6 0 -6 -6 Z'), '#3A3F47', LW * 0.9);
  ink(ctx, P('M -58 -16 h 34 v 92 q 0 10 -10 10 h -14 q -10 0 -10 -10 Z'), '#FFC21A', LW * 0.9);
  ink(ctx, P('M -58 50 h 34 v 26 q 0 10 -10 10 h -14 q -10 0 -10 -10 Z'), '#3A3F47', LW * 0.9);
  ink(ctx, P('M -52 78 h 22 v 6 h -22 Z'), light === 'ok' ? '#5BE36A' : '#7A2230', LW * 0.6);
  if (laser > 0) {
    ctx.save(); ctx.globalAlpha = laser;
    line(ctx, [[-41, 86], [-41, Math.max(90, reach)]], 10, 'rgba(255,60,50,0.35)');
    line(ctx, [[-41, 86], [-41, Math.max(90, reach)]], 3, '#FF3B30');
    ctx.restore();
  }
  stroke(ctx, 'M 12 40 q 4 10 -2 16', LW * 0.9, INK);
}

// The shipping label, w x h, hanging from the middle of its top edge at the origin; `shown` of it
// (from the top) is there, for as it prints.
export function label(ctx, img, w, h, { shown = 1 } = {}) {
  const hh = h * shown;
  if (hh <= 0.5) return;
  ctx.save();
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-w / 2, 0, w, hh);
  ctx.beginPath(); ctx.rect(-w / 2, 0, w, hh); ctx.clip();
  ctx.drawImage(img, -w / 2 + w * 0.04, h * 0.03, w * 0.92, h * 0.94);
  ctx.restore();
  ink(ctx, P(`M ${-w / 2} 0 h ${w} v ${hh} h ${-w} Z`), null, LW * 0.7);
}
