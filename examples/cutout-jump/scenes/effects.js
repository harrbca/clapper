// The stunt's effects, drawn flat like the rest: the table, a trail along the jump, the swoosh of
// the flip, and the landing's flash, dust and cracks.
import { hash, inv, wiggle } from '/@kit/core.js';
import { burstPath, puff } from '/@kit/draw.js';
import { ink, line, P } from '/@kit/cutout.js';
import { cue as c } from '/@kit/timeline.js';
import { FLOOR, LANDED, place, SCALE, spin, TABLE } from './acting.js';

// A work table, rocking after he leaves it.
export function table(ctx, t) {
  const { x0, x1, h } = TABLE, rock = wiggle(t, c.leave, 0.9, 0.025, 4);
  ctx.save(); ctx.translate(x0, FLOOR); ctx.rotate(-Math.max(0, rock)); ctx.translate(-x0, -FLOOR);
  for (const x of [x0 + 24, x1 - 48]) ink(ctx, P(`M ${x} ${FLOOR} v ${-h + 20} h 24 v ${h - 20} Z`), '#6B7480', 3);
  ink(ctx, P(`M ${x0 + 36} ${FLOOR - 80} h ${x1 - x0 - 72} v 14 h ${-(x1 - x0 - 72)} Z`), '#6B7480', 3);
  ink(ctx, P(`M ${x0} ${FLOOR - h} h ${x1 - x0} v 24 h ${-(x1 - x0)} Z`), '#B98B57', 3.4);
  line(ctx, [[x0 + 10, FLOOR - h + 8], [x1 - 10, FLOOR - h + 8]], 2, '#9C7141');
  ctx.restore();
}

// The middle of him, where the flip turns: his hips, drawn at the puppet's scale.
const middle = t => { const [x, y] = place(t); return [x, y - 400 * SCALE]; };
const inAir = t => t > c.leave && t < c.land + 0.02;

// Speed lines trailing the arc.
export function trail(ctx, t) {
  if (!inAir(t)) return;
  for (const off of [-70, 0, 70]) {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const u = t - i * 0.022; if (u < c.leave) break; const [x, y] = middle(u); pts.push([x, y + off * SCALE]); }
    if (pts.length > 2) line(ctx, pts.slice(2), 7, 'rgba(255,255,255,0.75)');
  }
}

// The swoosh: an arc round him, trailing his head as he turns.
export function swoosh(ctx, t) {
  const k = inv(c.tuck - 0.02, c.open + 0.06, t);
  if (k <= 0.05 || k >= 0.95) return;
  const [x, y] = middle(t), a = -Math.PI / 2 + spin(t), r = 300 * SCALE, strength = Math.sin(k * Math.PI);
  ctx.save(); ctx.globalAlpha = 0.85 * strength; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.arc(x, y, r, a - 2.3 + i * 0.3, a - 2.0 + i * 0.3 + 0.28);
    ctx.lineWidth = 4 + i * 3; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
  }
  ctx.restore();
}

// The landing: a flash behind him for a couple of frames, then dust and cracks.
const HIT = () => [place(c.land)[0], FLOOR];
export function flash(ctx, t) {
  if (t < LANDED || t > LANDED + 0.1) return;
  const [x, y] = HIT();
  burstPath(ctx, x + 20, y - 170, 330, 210, 16, 3); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  burstPath(ctx, x + 20, y - 170, 250, 160, 16, 5); ctx.fillStyle = '#FFE36B'; ctx.fill();
}
export function dust(ctx, t) {
  const k = inv(LANDED, LANDED + 0.8, t);
  if (k <= 0 || k >= 1) return;
  const [x, y] = HIT();
  for (const [dx, r] of [[-190, 60], [-110, 44], [150, 58], [230, 42]]) puff(ctx, x + dx * (0.6 + k), y - 12 - k * 30, r, k, '#EFE9DC');
}
export function cracks(ctx, t) {
  if (t < LANDED) return;
  const [x, y] = HIT(), k = Math.min(1, (t - LANDED) / 0.08), fx = x + 70 * SCALE;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + hash(i) * 0.5, len = (50 + hash(i * 3) * 90) * k;
    const pts = [[fx, y + 14]];
    for (let s = 1; s <= 3; s++) pts.push([fx + Math.cos(a + (hash(i * 7 + s) - 0.5) * 0.6) * len * s / 3, y + 14 + Math.sin(a) * len * 0.22 * s / 3]);
    line(ctx, pts, 3, '#3E4449');
  }
}
