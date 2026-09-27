// Lip-sync from the narration: each word's letters spread over the time it is said, as mouth
// shapes, blended into each other, and opened wider or narrower by how loud the voice really is.
// mouth(t) gives the parameters a character's mouth drawing uses:
//   open 0-1, wide 0-1, round 0-1, press 0-1 (lips together), teeth 0-1, tongue 0-1, tuck 0-1 (F/V)
import { clamp, lerp } from './core.js';
import { TL } from './timeline.js';

export const SHAPES = {
  rest: { open: 0, wide: 0.5, round: 0.15, press: 0.3, teeth: 0, tongue: 0, tuck: 0 },
  mbp: { open: 0, wide: 0.42, round: 0.1, press: 1, teeth: 0, tongue: 0, tuck: 0 },
  ai: { open: 0.9, wide: 0.72, round: 0.08, press: 0, teeth: 0.55, tongue: 0.3, tuck: 0 },
  e: { open: 0.48, wide: 0.95, round: 0, press: 0, teeth: 1, tongue: 0.2, tuck: 0 },
  uh: { open: 0.5, wide: 0.58, round: 0.2, press: 0, teeth: 0.4, tongue: 0.25, tuck: 0 },
  o: { open: 0.72, wide: 0.32, round: 0.95, press: 0, teeth: 0.15, tongue: 0.2, tuck: 0 },
  u: { open: 0.3, wide: 0.14, round: 1, press: 0, teeth: 0, tongue: 0, tuck: 0 },
  fv: { open: 0.14, wide: 0.6, round: 0, press: 0, teeth: 1, tongue: 0, tuck: 1 },
  l: { open: 0.46, wide: 0.62, round: 0.1, press: 0, teeth: 0.8, tongue: 1, tuck: 0 },
  th: { open: 0.26, wide: 0.62, round: 0, press: 0, teeth: 1, tongue: 0.85, tuck: 0 },
  r: { open: 0.28, wide: 0.4, round: 0.55, press: 0, teeth: 0.5, tongue: 0.2, tuck: 0 },
  etc: { open: 0.28, wide: 0.66, round: 0.1, press: 0, teeth: 0.85, tongue: 0.3, tuck: 0 },
  sh: { open: 0.3, wide: 0.34, round: 0.7, press: 0, teeth: 1, tongue: 0, tuck: 0 },
};
const KEYS = Object.keys(SHAPES.rest);
const VOWEL = new Set(['ai', 'e', 'uh', 'o', 'u']);

// Spelling to mouth shapes: good enough for English narration, which is all it has to be.
const RULES = [
  ['tch', 'sh'], ['th', 'th'], ['sh', 'sh'], ['ch', 'sh'], ['ph', 'fv'], ['wh', 'u'], ['qu', 'u'], ['ck', 'etc'], ['ng', 'etc'],
  ['oo', 'u'], ['ee', 'e'], ['ea', 'e'], ['ai', 'e'], ['ay', 'e'], ['ou', 'o'], ['ow', 'o'], ['oa', 'o'], ['aw', 'o'], ['oi', 'o'],
  ['a', 'ai'], ['e', 'e'], ['i', 'e'], ['o', 'o'], ['u', 'uh'], ['y', 'e'],
  ['m', 'mbp'], ['b', 'mbp'], ['p', 'mbp'], ['f', 'fv'], ['v', 'fv'], ['w', 'u'], ['l', 'l'], ['r', 'r'],
  ['s', 'etc'], ['z', 'etc'], ['t', 'etc'], ['d', 'etc'], ['n', 'etc'], ['k', 'etc'], ['g', 'etc'], ['c', 'etc'],
  ['j', 'sh'], ['x', 'etc'], ['h', 'uh'],
];

export function shapesOf(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return [];
  if (w.length > 3 && /[^aeiou]e$/.test(w)) w = w.slice(0, -1);            // a silent final e
  const out = [];
  for (let i = 0; i < w.length;) {
    const [g, s] = RULES.find(([g]) => w.startsWith(g, i)) || [w[i], 'etc'];
    // "i" at the end of a word, or before a consonant and a final e, is said "eye".
    const shape = g === 'i' && (i === w.length - 1 || /^[^aeiou]e$/.test(word.toLowerCase().replace(/[^a-z]/g, '').slice(i + 1))) ? 'ai' : s;
    if (out.at(-1)?.s !== shape || VOWEL.has(shape)) out.push({ s: shape });
    i += g.length;
  }
  return out;
}

// Segments { t0, t1, s } for a set of lines, with rests in the gaps between words.
const built = new Map();
function segments(lines) {
  const key = lines.map(l => l.id).join(',');
  if (built.has(key)) return built.get(key);
  const segs = [];
  for (const line of lines) {
    for (const w of line.words) {
      const parts = shapesOf(w.w);
      if (!parts.length) continue;
      const weight = p => (VOWEL.has(p.s) ? 1.6 : p.s === 'mbp' ? 1.15 : 1);
      const total = parts.reduce((a, p) => a + weight(p), 0);
      let t = w.s;
      for (const p of parts) {
        const d = ((w.e - w.s) * weight(p)) / total;
        segs.push({ t0: t, t1: t + d, s: p.s });
        t += d;
      }
    }
  }
  segs.sort((a, b) => a.t0 - b.t0);
  const out = [];
  for (const s of segs) {
    const prev = out.at(-1);
    if (prev && s.t0 - prev.t1 > 0.09) out.push({ t0: prev.t1, t1: s.t0, s: 'rest' });
    else if (prev) prev.t1 = s.t0;
    out.push(s);
  }
  built.set(key, out);
  return out;
}

// How loud the narration is, 0-1, from build/voice.json (made by clap build). 1 when there is none.
let LEVEL = null;
try {
  const r = await fetch('/build/voice.json', { cache: 'no-store' });
  if (r.ok) LEVEL = await r.json();
} catch { /* a draft has no voice */ }
export function loudness(t) {
  if (!LEVEL) return 1;
  const f = t * LEVEL.rate, i = Math.floor(f), a = LEVEL.level[i] ?? 0, b = LEVEL.level[i + 1] ?? 0;
  return a + (b - a) * (f - i);
}

const mixShape = (a, b, k) => Object.fromEntries(KEYS.map(n => [n, lerp(a[n], b[n], k)]));

// The mouth at t, for the lines a character says (all of them by default, or those with a matching
// `speaker`). `energy` scales how wide it opens.
export function mouth(t, { speaker, lines, energy = 1 } = {}) {
  const ls = lines || TL.lines.filter(l => !speaker || l.speaker === speaker);
  const segs = segments(ls);
  let lo = 0, hi = segs.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (segs[m].t0 <= t) { i = m; lo = m + 1; } else hi = m - 1; }
  if (i < 0 || t > segs[segs.length - 1].t1 + 0.12) {
    const last = segs[segs.length - 1];
    const k = last ? clamp((t - last.t1) / 0.12) : 1;
    return last && t > last.t1 ? mixShape(SHAPES[last.s], SHAPES.rest, k) : { ...SHAPES.rest };
  }
  const cur = segs[i], prev = segs[i - 1];
  const attack = Math.min(0.065, (cur.t1 - cur.t0) * 0.7);
  const k = attack > 0 ? clamp((t - cur.t0) / attack) : 1;
  const from = prev ? SHAPES[prev.s] : SHAPES.rest;
  const target = t > cur.t1 ? mixShape(SHAPES[cur.s], SHAPES.rest, clamp((t - cur.t1) / 0.12)) : SHAPES[cur.s];
  const m = mixShape(from, target, k * k * (3 - 2 * k));
  const loud = LEVEL ? clamp(0.45 + 0.8 * loudness(t)) : 1;
  m.open *= loud * energy;
  return m;
}
