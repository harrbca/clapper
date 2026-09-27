// Captions lit word by word as the narrator says them: said words white, the current one in the
// highlight colour, the rest dim. A line shows from just before it is said until `hold` seconds after,
// or until the next line. One row if it fits, otherwise the most even split into two.
import { on } from './core.js';
import { fillRR, font, text, THEME, withAlpha } from './draw.js';
import { TL, W } from './timeline.js';

export const CAPTION = {
  cx: W / 2,            // centre of the bar
  bottom: 1048,         // bottom edge of the bar
  maxW: W - 400,        // widest row of text
  size: 36, weight: 500, lineH: 46,
  padX: 30, padY: 11, radius: 18,
  bar: 'rgba(12,18,26,0.74)', said: '#FFFFFF', saying: null, unsaid: 'rgba(255,255,255,0.5)',
  lead: 0.15, hold: 0.9,
};

export function lineAt(t, lines = TL.lines, o = CAPTION) {
  let cur = null, until = 0;
  for (let i = 0; i < lines.length; i++) {
    const u = Math.min(lines[i + 1] ? lines[i + 1].start - 0.1 : Infinity, lines[i].end + o.hold);
    if (t >= lines[i].start - o.lead && t < u) { cur = lines[i]; until = u; }
  }
  return cur && { line: cur, until };
}

export function caption(ctx, t, opts = {}) {
  const o = { ...CAPTION, ...opts };
  const up = lineAt(t, o.lines || TL.lines, o);
  if (!up) return;
  const cur = up.line, until = up.until;
  const a = Math.min(on(t, cur.start - o.lead, o.lead), 1 - on(t, until - o.lead, o.lead));
  const { size, lineH, maxW } = o;
  font(ctx, size, o.weight);
  const space = ctx.measureText(' ').width;
  const widths = cur.words.map(w => ctx.measureText(w.w).width);
  const span = (i, j) => widths.slice(i, j).reduce((s, w) => s + w, 0) + space * Math.max(0, j - i - 1);
  let rows = [[0, widths.length]];
  if (span(0, widths.length) > maxW) {
    let best = 1, bestW = Infinity;
    for (let k = 1; k < widths.length; k++) {
      const w = Math.max(span(0, k), span(k, widths.length));
      if (w < bestW) { bestW = w; best = k; }
    }
    rows = [[0, best], [best, widths.length]];
  }
  const barW = Math.max(...rows.map(([i, j]) => span(i, j))) + o.padX * 2, barH = rows.length * lineH + o.padY * 2;
  const cx = o.cx, bottom = o.bottom, saying = o.saying || THEME.hi;
  withAlpha(ctx, a, () => {
    fillRR(ctx, cx - barW / 2, bottom - barH, barW, barH, o.radius, o.bar);
    rows.forEach(([i, j], r) => {
      let x = cx - span(i, j) / 2;
      const y = bottom - barH + o.padY + lineH * r + lineH / 2 + 1;
      for (let k = i; k < j; k++) {
        const w = cur.words[k];
        const col = t >= w.e ? o.said : t >= w.s ? saying : o.unsaid;
        text(ctx, w.w, x, y, { size, weight: o.weight, color: col, align: 'left' });
        x += widths[k] + space;
      }
    });
  });
}
