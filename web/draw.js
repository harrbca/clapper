// Canvas drawing: text, shapes and effects. Colours and the font come from THEME unless given.
import { clamp, hash, inv, lerp, TAU } from './core.js';

export const THEME = {
  font: 'Roboto, "Segoe UI", Arial, sans-serif',
  ink: '#1B2330',
  paper: '#FFFFFF',
  hi: '#FF8A1F',
  confetti: ['#F2B134', '#E8793A', '#C4452B', '#2E8C85', '#7A9A3A', '#F6E7C1', '#E98A8A'],
};
export const setTheme = t => Object.assign(THEME, t);

// ---------- text ----------
export function font(ctx, size, weight = 400, family = THEME.font) { ctx.font = `${weight} ${size.toFixed(1)}px ${family}`; }

// Options: size, weight, family, color, align, base; and stroke/lw (an outline), shadow (colour,
// with sdx/sdy), glow (colour, with glowR), maxW (squeezes wide text to fit).
export function text(ctx, s, x, y, o = {}) {
  font(ctx, o.size || 32, o.weight || 400, o.family);
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.base || 'middle';
  if (!(o.stroke || o.shadow || o.glow || o.maxW)) {
    ctx.fillStyle = o.color || '#FFFFFF';
    ctx.fillText(s, x, y);
    return;
  }
  ctx.save();
  ctx.lineJoin = 'round';
  if (o.maxW) {
    const w = ctx.measureText(s).width;
    if (w > o.maxW) { ctx.translate(x, y); ctx.scale(o.maxW / w, 1); ctx.translate(-x, -y); }
  }
  const lw = o.stroke ? o.lw || (o.size || 32) * 0.12 : 0, size = o.size || 32;
  if (o.shadow) {
    const dx = o.sdx ?? size * 0.07, dy = o.sdy ?? size * 0.08;
    ctx.fillStyle = ctx.strokeStyle = o.shadow;
    if (lw) { ctx.lineWidth = lw; ctx.strokeText(s, x + dx, y + dy); }
    ctx.fillText(s, x + dx, y + dy);
  }
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 16; }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
  ctx.fillStyle = o.color || '#FFFFFF';
  ctx.fillText(s, x, y);
  ctx.restore();
}

// Words wrapped to maxW: an array of rows.
export function wrap(ctx, s, maxW) {
  const rows = [];
  let row = '';
  for (const w of s.split(/\s+/)) {
    const next = row ? row + ' ' + w : w;
    if (row && ctx.measureText(next).width > maxW) { rows.push(row); row = w; } else row = next;
  }
  if (row) rows.push(row);
  return rows;
}

// ---------- shapes ----------
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
export function fillRR(ctx, x, y, w, h, r, fill) { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
export function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); }
export function dot(ctx, x, y, r, fill) { circ(ctx, x, y, r); ctx.fillStyle = fill; ctx.fill(); }
export function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }
export function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}
// A round-capped stroke, for limbs and lines.
export function limb(ctx, x1, y1, x2, y2, w, col) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.stroke();
}
// Fill and outline the current path.
export function paint(ctx, fill, lw = 6, stroke = THEME.ink) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}

export function withAlpha(ctx, a, fn) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha *= Math.min(1, a); fn(); ctx.restore();
}
// Draw fn translated to (x, y), scaled by s, rotated by r and faded to a. Skipped when invisible.
export function T(ctx, x, y, s, r, a, fn) {
  if (s !== undefined && Math.abs(s) < 1e-3) return;
  if (a !== undefined && a <= 0.002) return;
  ctx.save();
  ctx.translate(x, y);
  if (r) ctx.rotate(r);
  if (s !== undefined && s !== 1) ctx.scale(s, s);
  if (a !== undefined && a < 1) ctx.globalAlpha *= a;
  fn();
  ctx.restore();
}

export function starPath(ctx, x, y, r1, r2, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1, a = rot + (i * Math.PI) / n;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}
export function burstPath(ctx, x, y, r1, r2, n = 14, seed = 1) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TAU - Math.PI / 2;
    const r = i % 2 ? r2 * (0.88 + 0.24 * hash(seed + i)) : r1 * (0.9 + 0.2 * hash(seed * 3 + i));
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

// A curved arrow from (x1, y1) to (x2, y2), drawn up to `prog` (0-1). Options: bend (px the curve
// rises), cx/cy (the control point), lw, col, head, dash.
export function arrow(ctx, x1, y1, x2, y2, o = {}) {
  const k = o.prog ?? 1;
  if (k <= 0.001) return;
  const cx = o.cx ?? (x1 + x2) / 2, cy = o.cy ?? (y1 + y2) / 2 - (o.bend || 0);
  const q = (a, b, c, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
  const col = o.col || THEME.ink;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x1, y1);
  for (let i = 1; i <= 40 * k; i++) { const u = i / 40; ctx.lineTo(q(x1, cx, x2, u), q(y1, cy, y2, u)); }
  const ex = q(x1, cx, x2, k), ey = q(y1, cy, y2, k);
  ctx.lineTo(ex, ey);
  ctx.lineWidth = o.lw || 10; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.stroke();
  ctx.setLineDash([]);
  const dx = 2 * (1 - k) * (cx - x1) + 2 * k * (x2 - cx), dy = 2 * (1 - k) * (cy - y1) + 2 * k * (y2 - cy);
  const a = Math.atan2(dy, dx), hs = o.head || (o.lw || 10) * 2.6;
  poly(ctx, [
    [ex + Math.cos(a) * hs * 0.5, ey + Math.sin(a) * hs * 0.5],
    [ex + Math.cos(a + 2.4) * hs, ey + Math.sin(a + 2.4) * hs],
    [ex + Math.cos(a - 2.4) * hs, ey + Math.sin(a - 2.4) * hs],
  ]);
  ctx.fillStyle = col; ctx.fill();
  ctx.restore();
}

// A speech bubble centred on (x, y), its tail pointing at (tx, ty). Options: fill, r, lw, text
// (a string or rows), size, color, weight.
export function bubble(ctx, x, y, w, h, tx, ty, o = {}) {
  const fill = o.fill || THEME.paper, bx = x - w / 2, by = y - h / 2, lw = o.lw ?? 5;
  const cx = clamp(tx, bx + 50, bx + w - 50), below = ty > y, baseY = below ? by + h : by;
  poly(ctx, [[cx - 26, baseY], [tx, ty], [cx + 26, baseY]]);
  paint(ctx, fill, lw);
  rr(ctx, bx, by, w, h, o.r || 36);
  paint(ctx, fill, lw);
  poly(ctx, [[cx - 20, baseY + (below ? -lw * 2 : lw * 2)], [lerp(cx, tx, 0.72), lerp(baseY, ty, 0.72)], [cx + 20, baseY + (below ? -lw * 2 : lw * 2)]]);
  ctx.fillStyle = fill; ctx.fill();
  if (o.text) {
    const rows = Array.isArray(o.text) ? o.text : [o.text], size = o.size || 40;
    rows.forEach((s, i) => text(ctx, s, x, y + (i - (rows.length - 1) / 2) * size * 1.2, { size, weight: o.weight || 500, color: o.color || THEME.ink }));
  }
}

// ---------- effects ----------
// A puff of smoke or dust at (x, y), k running 0 -> 1 over its life.
export function puff(ctx, x, y, r, k, col = '#FFF8E8') {
  if (k <= 0 || k >= 1) return;
  ctx.save();
  ctx.globalAlpha *= 1 - k;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.4, d = r * (0.3 + k * 0.9);
    circ(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, r * (0.35 + 0.25 * hash(i + 3)) * (0.6 + k));
    ctx.fillStyle = col; ctx.fill();
  }
  ctx.restore();
}

export function speedLines(ctx, x, y, len, n, spread, alpha = 1, col = '#FFFFFF', lw = 7) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (let i = 0; i < n; i++) {
    const yy = y + (i - (n - 1) / 2) * spread, off = hash(i * 5.3) * len * 0.5;
    limb(ctx, x - off, yy, x - off - len * (0.5 + hash(i) * 0.5), yy, lw, col);
  }
  ctx.restore();
}

// Confetti thrown from (x0, y0) at t0. Options: n, life, speed, spread (radians around up), colors.
export function confetti(ctx, t, t0, x0, y0, o = {}) {
  const dt = t - t0, life = o.life || 2.6, n = o.n || 60, cols = o.colors || THEME.confetti;
  if (dt < 0 || dt > life) return;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i + t0 * 13.7), h2 = hash(i * 3.1 + t0), h3 = hash(i * 7.7 + t0 * 3);
    const ang = o.spread != null ? -Math.PI / 2 + (h1 - 0.5) * o.spread : h1 * TAU;
    const sp = (o.speed || 1100) * (0.3 + h2 * 0.9), drag = 1 / (1 + dt * 1.6);
    const x = x0 + Math.cos(ang) * sp * dt * drag, y = y0 + Math.sin(ang) * sp * dt * drag + 420 * dt * dt;
    T(ctx, x, y, 1, dt * (5 + h3 * 9), 1 - inv(life * 0.65, life, dt), () => {
      ctx.fillStyle = cols[i % cols.length];
      ctx.scale(1, Math.cos(dt * 7 + i));
      ctx.fillRect(-10, -5, 20, 10);
    });
  }
}

export function gradient(ctx, x, y, w, h, top, bottom) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}

// Darkened edges.
export function vignette(ctx, W, H, strength = 0.45, col = '20,14,8') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// A still paper grain. Moving grain looks nice but is noise H.264 cannot compress.
let grainPattern = null;
export function grain(ctx, W, H, alpha = 0.3) {
  if (!grainPattern) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), id = g.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = hash(i * 0.37) > 0.5 ? 255 : 0;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = Math.floor(hash(i * 1.13 + 7) * 20);
    }
    g.putImageData(id, 0, 0);
    grainPattern = ctx.createPattern(c, 'repeat');
  }
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = grainPattern; ctx.fillRect(0, 0, W, H); ctx.restore();
}
