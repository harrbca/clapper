// Moving type: text typed on, words that land as they are said, highlighter swipes, counters.
import { clamp, E, inv, lerp, on } from './core.js';
import { fillRR, font, text, THEME, withAlpha } from './draw.js';

// Text typed on from t0, `cps` characters a second, with a blinking caret while it types.
export function typeOn(ctx, s, x, y, t, t0, o = {}) {
  const cps = o.cps || 28, n = Math.floor(clamp((t - t0) * cps, 0, s.length));
  if (t < t0 - 0.3) return;
  const shown = s.slice(0, n);
  text(ctx, shown, x, y, { align: 'left', ...o });
  const done = n >= s.length, blinkOn = Math.floor(t * 2.2) % 2 === 0;
  if (o.caret !== false && (!done || (blinkOn && t < t0 + s.length / cps + (o.caretHold ?? 1.2)))) {
    font(ctx, o.size || 32, o.weight || 400, o.family);
    const w = ctx.measureText(shown).width, size = o.size || 32;
    ctx.fillStyle = o.caretColor || o.color || '#FFFFFF';
    ctx.fillRect(x + w + size * 0.08, y - size * 0.5, Math.max(2, size * 0.07), size);
  }
}

// A line of narration as big words, each landing (rising and popping in) as it is said.
// Words wrap to maxW; `line` is a timeline line ({ words: [{ w, s, e }] }).
export function sayWords(ctx, line, cx, cy, t, o = {}) {
  const size = o.size || 72, weight = o.weight || 800, lineH = o.lineH || size * 1.18, maxW = o.maxW || 1400;
  font(ctx, size, weight, o.family);
  const space = ctx.measureText(' ').width, rows = [[]];
  let rowW = 0;
  for (const w of line.words) {
    const ww = ctx.measureText(w.w).width;
    if (rowW && rowW + space + ww > maxW) { rows.push([]); rowW = 0; }
    rows.at(-1).push({ ...w, width: ww });
    rowW += (rowW ? space : 0) + ww;
  }
  rows.forEach((row, r) => {
    const total = row.reduce((a, w) => a + w.width, 0) + space * (row.length - 1);
    let x = cx - total / 2;
    const y = cy + (r - (rows.length - 1) / 2) * lineH;
    for (const w of row) {
      const k = on(t, w.s - 0.05, 0.28), hot = t >= w.s && t < w.e;
      withAlpha(ctx, k, () => {
        ctx.save();
        ctx.translate(x + w.width / 2, y + (1 - E.out(k)) * size * 0.5);
        const s = 0.6 + 0.4 * E.back(k);
        ctx.scale(s, s);
        text(ctx, w.w, 0, 0, { size, weight, family: o.family, color: hot && o.hot ? o.hot : o.color || '#FFFFFF', ...(o.shadow ? { shadow: o.shadow, sdx: 0, sdy: size * 0.06 } : {}) });
        ctx.restore();
      });
      x += w.width + space;
    }
  });
}

// A highlighter swipe across a box, drawn under text: k runs 0 -> 1 as it sweeps.
export function marker(ctx, x, y, w, h, k, col = 'rgba(255,214,10,0.75)') {
  if (k <= 0) return;
  const e = E.out(clamp(k));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - 6, y + h * 0.1);
  ctx.lineTo(x + w * e + 6, y);
  ctx.lineTo(x + w * e + 2, y + h);
  ctx.lineTo(x - 2, y + h * 0.94);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.restore();
}

// A number counting from `from` to `to` over [t0, t0 + d], eased.
export const count = (t, t0, d, from, to) => Math.round(lerp(from, to, E.out(inv(t0, t0 + d, t))));

// A label on a rounded tag: returns its width.
export function tag(ctx, s, x, y, o = {}) {
  const size = o.size || 28, weight = o.weight || 700, padX = o.padX ?? size * 0.6, h = o.h || size * 1.7;
  font(ctx, size, weight, o.family);
  const w = ctx.measureText(s).width + padX * 2, left = o.align === 'left' ? x : x - w / 2;
  fillRR(ctx, left, y - h / 2, w, h, o.r ?? h / 2, o.fill || THEME.hi);
  text(ctx, s, left + w / 2, y + 1, { size, weight, family: o.family, color: o.color || '#FFFFFF' });
  return w;
}
