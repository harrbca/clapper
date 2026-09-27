// The things Pip talks about: a code panel, a film strip, the script, the waveform, a bubble, the
// timeline, bouncing balls and the clapperboard. Each is a pure function of t and its cues.
import { clamp, E, hash, inv, lerp, on, TAU } from '/@kit/core.js';
import { burstPath, confetti, fillRR, font, poly, rr, text, withAlpha } from '/@kit/draw.js';
import { loudness, mouth } from '/@kit/lipsync.js';
import { spring } from '/@kit/spring.js';
import { marker, tag, typeOn } from '/@kit/text.js';
import { TL } from '/@kit/timeline.js';
import { BALLS, drop } from './physics.js';
import { FLOOR, shadow } from './set.js';

const INK = '#1B2330', PANEL = '#1B2330';

// A card that springs in from the right at t0 and out at t1, returning its x offset and alpha.
function slideIn(key, t, t0, t1, dist = 900) {
  const target = u => (u < t0 ? dist : u < t1 ? 0 : -dist * 0.4);
  return { dx: spring(key, t, target, { t0: t0 - 1, preset: 'gentle' }), a: Math.min(on(t, t0 - 0.05, 0.25), 1 - on(t, t1, 0.35)) };
}

function card(ctx, x, y, w, h, fill = '#FFFFFF', r = 28) {
  fillRR(ctx, x + 8, y + 14, w, h, r, 'rgba(120,70,40,0.16)');
  fillRR(ctx, x, y, w, h, r, fill);
}

// ---------- code ----------
const CODE = [
  'export function render({ ctx }, t) {',
  '  const p = pose(t, moves);',
  '  pip.draw(ctx, p, { x: 760, y: 880 });',
  '  bolt.draw(ctx, boltPose(t, path));',
  '  caption(ctx, t);',
  '}',
];
const KEYWORDS = /\b(export|function|const|return)\b/;
function codeLine(ctx, s, x, y, n) {
  let cx = x;
  const tokens = s.slice(0, n).match(/\s+|[A-Za-z_]\w*|\d+|[^\s\w]/g) || [];
  font(ctx, 26, 500, 'Consolas, "Cascadia Mono", monospace');
  tokens.forEach((tok, i) => {
    const next = tokens[i + 1];
    const col = KEYWORDS.test(tok) ? '#FF8A6B' : /^\d+$/.test(tok) ? '#FFC24A' : next === '(' ? '#61F0FF' : /^\w/.test(tok) ? '#E8EEF3' : '#8FA3B8';
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(tok, cx, y);
    cx += ctx.measureText(tok).width;
  });
}

export function codePanel(ctx, t, t0, t1) {
  const { dx, a } = slideIn('code', t, t0, t1);
  if (a <= 0) return;
  withAlpha(ctx, a, () => {
    const x = 1130 + dx, y = 190;
    card(ctx, x, y, 680, 330, PANEL, 24);
    for (const [i, c] of ['#FF6B6B', '#FFC24A', '#3DDC97'].entries()) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 34 + i * 26, y + 30, 8, 0, TAU); ctx.fill(); }
    text(ctx, 'scenes/index.js', x + 130, y + 31, { size: 20, weight: 500, color: '#8FA3B8', align: 'left' });
    let chars = Math.max(0, (t - t0 - 0.2) * 120);
    CODE.forEach((s, i) => {
      const n = Math.min(s.length, Math.floor(chars));
      chars -= s.length + 4;
      if (n > 0) codeLine(ctx, s, x + 34, y + 84 + i * 40, n);
    });
  });
}

// Pip's bones, drawn over her: lines from joint to joint and a dot at each.
export function skeleton(ctx, rig, pose, at, k) {
  if (k <= 0) return;
  const M = rig.matrices(pose), base = new DOMMatrix().translate(at.x, at.y).scale(at.scale);
  const pt = name => { const q = base.multiply(M[name]).transformPoint(new DOMPoint(0, 0)); return [q.x, q.y]; };
  withAlpha(ctx, k, () => {
    ctx.save();
    ctx.shadowColor = '#61F0FF'; ctx.shadowBlur = 10;
    ctx.strokeStyle = '#61F0FF'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const p of rig.parts) {
      if (!p.parent || ['tail', 'hairBack', 'fringe'].includes(p.name)) continue;
      const [ax, ay] = pt(p.parent), [bx, by] = pt(p.name);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.fillStyle = '#FFFFFF';
    for (const p of rig.parts) { if (['hairBack', 'fringe'].includes(p.name)) continue; const [x, y] = pt(p.name); ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); }
    ctx.restore();
  });
}

// ---------- a film strip of Pip, one frame at a time ----------
export function filmStrip(ctx, t, t0, t1, drawFrame) {
  const a = Math.min(on(t, t0 - 0.1, 0.3), 1 - on(t, t1, 0.3));
  if (a <= 0) return;
  withAlpha(ctx, a, () => {
    const y = 600, h = 200, cell = 230, scroll = (t - t0) * 140 - lerp(420, 0, E.out(on(t, t0 - 0.1, 0.6)));
    ctx.save();
    ctx.translate(0, y);
    ctx.rotate(-0.03);
    fillRR(ctx, 1040, 0, 900, h, 10, '#232A36');
    ctx.fillStyle = '#FFF4E6';
    for (let x = 1050 - (scroll % 38); x < 1940; x += 38) { ctx.fillRect(x, 10, 20, 14); ctx.fillRect(x, h - 24, 20, 14); }
    ctx.beginPath(); ctx.rect(1040, 30, 900, h - 60); ctx.clip();
    for (let i = -1; i < 6; i++) {
      const x = 1060 + i * cell - (scroll % cell), n = i + Math.floor(scroll / cell);
      fillRR(ctx, x, 34, cell - 16, h - 68, 6, '#FFF4E6');
      ctx.save(); ctx.beginPath(); ctx.rect(x, 34, cell - 16, h - 68); ctx.clip();
      drawFrame(ctx, x + (cell - 16) / 2, 34 + h - 68 + 58, n);
      ctx.restore();
      text(ctx, String(120 + n).padStart(4, '0'), x + 8, 46, { size: 14, weight: 700, color: '#B98A68', align: 'left' });
    }
    ctx.restore();
  });
}

// ---------- the script ----------
const SCRIPT = [['PIP', "Hi! I'm Pip."], ['PIP', 'Everything you’re watching right now'], ['', 'was drawn by code, one frame at a time.'],
  ['PIP', 'It starts with a script: just the'], ['', 'words I’m going to say.']];

export function scriptPage(ctx, t, t0, tWords, t1) {
  if (t < t0 - 0.05 || t > t1 + 1.2) return;
  const fly = u => (u < t0 ? 1 : u < t1 ? 0 : -1);
  const k = spring('page', t, fly, { t0: t0 - 1, stiffness: 150, damping: 15 });
  const x = 1360 + k * 900, y = 470 - Math.abs(k) * 120, r = -0.05 + k * 0.5;
  ctx.save(); ctx.translate(x, y); ctx.rotate(r);
  fillRR(ctx, -262 + 10, -330 + 16, 524, 660, 14, 'rgba(120,70,40,0.18)');
  fillRR(ctx, -262, -330, 524, 660, 14, '#FFFFFF');
  ctx.strokeStyle = '#F1D9C6'; ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(-222, -210 + i * 46); ctx.lineTo(222, -210 + i * 46); ctx.stroke(); }
  text(ctx, 'SCRIPT', -222, -282, { size: 24, weight: 700, color: '#FF8A1F', align: 'left' });
  text(ctx, 'script.json', 222, -282, { size: 18, weight: 500, color: '#B98A68', align: 'right' });
  // The lines already said type on as the page lands; the one Pip is saying now appears word by
  // word, each as she says it, from the narration's timings.
  const now = TL.lines.find(l => l.id === 'script');
  let at = t0 + 0.35, yy = -226, spoken = 0;
  SCRIPT.forEach(([who, s], i) => {
    if (who) { yy += i ? 34 : 0; text(ctx, who, -222, yy, { size: 16, weight: 700, color: '#B98A68', align: 'left' }); yy += 36; } else yy += 46;
    if (i >= 3) marker(ctx, -228, yy - 22, i === 3 ? 440 : 250, 42, (t - tWords + (i - 3) * 0.1) / 0.45);
    if (i < 3) { typeOn(ctx, s, -222, yy, t, at, { size: 27, weight: 500, color: INK, cps: 110, caret: false }); at += s.length / 110; return; }
    const words = s.split(' '), shown = [];
    for (const w of words) { const wd = now.words[spoken++]; if (wd && t >= wd.s - 0.04) shown.push(w); }
    text(ctx, shown.join(' '), -222, yy, { size: 27, weight: 500, color: INK, align: 'left' });
  });
  ctx.restore();
}

// ---------- the voice: a waveform, and every word pinned where it is said ----------
export function wavePanel(ctx, t, t0, t1, tMoment) {
  const { dx, a } = slideIn('wave', t, t0, t1);
  if (a <= 0) return;
  withAlpha(ctx, a, () => {
    const x = 1040 + dx, y = 170, w = 800, h = 380, mid = x + w / 2, base = y + 250, pps = 280;
    card(ctx, x, y, w, h, PANEL, 26);
    ctx.save(); ctx.beginPath(); ctx.rect(x + 20, y + 20, w - 40, h - 40); ctx.clip();
    // the waveform: how loud the voice is (or, in a draft, how open the mouth is), around now
    for (let bx = x + 26; bx < x + w - 26; bx += 9) {
      const u = t + (bx - mid) / pps;
      const v = u < 0 ? 0 : Math.max(loudness(u) < 1 ? loudness(u) : mouth(u).open, 0.03);
      const hh = 8 + v * 150 * (0.75 + 0.25 * hash(Math.round(bx - dx)));
      ctx.fillStyle = bx < mid ? '#61F0FF' : 'rgba(97,240,255,0.35)';
      ctx.beginPath(); ctx.roundRect(bx, base - hh / 2, 5, hh, 3); ctx.fill();
    }
    // the words, each at its moment, sliding past the playhead
    let n = 0;
    for (const line of TL.lines) {
      for (const wd of line.words) {
        const wx = mid + (wd.s - t) * pps, row = n++ % 2;          // two rows, so neighbours don't collide
        if (wx < x - 80 || wx > x + w + 80) continue;
        const now = t >= wd.s && t < wd.e, big = tMoment && bare(wd.w) === 'moment' && t > tMoment;
        const ty = y + 70 + row * 46;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(wx, ty + 18); ctx.lineTo(wx, base + 80); ctx.stroke();
        tag(ctx, wd.w.replace(/[.,!?:]$/, ''), wx, ty, { size: big ? 26 : 21, fill: now || big ? '#FF8A1F' : '#2D3950', color: '#FFFFFF', align: 'left', h: big ? 42 : 36 });
      }
    }
    ctx.restore();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(mid - 2, y + 60, 4, h - 90);
    poly(ctx, [[mid - 12, y + 52], [mid + 12, y + 52], [mid, y + 68]]); ctx.fill();
    text(ctx, `${t.toFixed(2)} s`, x + w - 30, y + h - 30, { size: 20, weight: 500, color: '#8FA3B8', align: 'right' });
  });
}
const bare = w => w.toLowerCase().replace(/[^a-z']/g, '');

// ---------- a bubble, blown up and popped ----------
export function bubble(ctx, t, tIn, tPop, x, y) {
  if (t < tIn) return;
  if (t < tPop) {
    const s = spring('bubble', t, u => (u < tIn + 0.05 ? 0.05 : 1), { t0: tIn - 0.5, preset: 'wobbly' });
    const r = 92 * Math.max(0.05, s), wob = Math.sin(t * 8.5) * 0.05, yy = y - (t - tIn) * 10 + Math.sin(t * 2) * 6;
    ctx.save(); ctx.translate(x, yy); ctx.scale(1 + wob, 1 - wob);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(0.55, 'rgba(190,235,255,0.22)'); g.addColorStop(0.85, 'rgba(255,170,220,0.3)'); g.addColorStop(1, 'rgba(120,200,255,0.55)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.72, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
    ctx.restore();
    return;
  }
  // popped: a ring, droplets, and the word itself
  const k = t - tPop;
  if (k > 1.2) return;
  const yy = y - (tPop - tIn) * 10;
  withAlpha(ctx, 1 - on(t, tPop + 0.05, 0.3), () => {
    ctx.strokeStyle = 'rgba(160,220,255,0.9)'; ctx.lineWidth = 6 * (1 - k * 2);
    ctx.beginPath(); ctx.arc(x, yy, 92 + k * 260, 0, TAU); ctx.stroke();
  });
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * TAU + hash(i) * 0.3, sp = 380 + hash(i * 3) * 320;
    const dx = Math.cos(ang) * sp * k, dy = Math.sin(ang) * sp * k + 900 * k * k;
    withAlpha(ctx, 1 - on(t, tPop + 0.3, 0.5), () => { ctx.fillStyle = 'rgba(150,215,255,0.9)'; ctx.beginPath(); ctx.arc(x + dx, yy + dy, 7 + hash(i * 5) * 5, 0, TAU); ctx.fill(); });
  }
  const s = E.back(on(t, tPop, 0.25)) * (1 - on(t, tPop + 0.8, 0.3));
  if (s > 0.01) {
    ctx.save(); ctx.translate(x, yy); ctx.scale(s, s); ctx.rotate(-0.1);
    burstPath(ctx, 0, 0, 120, 90, 12, 4); ctx.fillStyle = '#FFC24A'; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
    text(ctx, 'POP!', 0, 4, { size: 64, weight: 700, color: INK });
    ctx.restore();
  }
}

// ---------- the timeline: lines as blocks, cues pinned to their words ----------
export function timelinePanel(ctx, t, t0, t1, tStretch, tSlide) {
  const { dx, a } = slideIn('timeline', t, t0, t1);
  if (a <= 0) return;
  withAlpha(ctx, a, () => {
    const x = 1000 + dx, y = 200, w = 860, h = 400;
    card(ctx, x, y, w, h, '#FFFFFF', 26);
    text(ctx, 'timeline', x + 40, y + 46, { size: 26, weight: 700, color: INK, align: 'left' });
    text(ctx, 'lines, and the cues on their words', x + 160, y + 47, { size: 20, weight: 400, color: '#8A7A6E', align: 'left' });
    const grow = spring('stretch', t, u => (u < tStretch ? 1 : 1.55), { t0: tStretch - 1, preset: 'bouncy' });
    const blocks = [[150, '#23A89A', [0.3]], [170 * grow, '#FF8A1F', [0.25, 0.8]], [130, '#23A89A', [0.5]], [160, '#23A89A', [0.35, 0.75]]];
    let bx = x + 40;
    const trackY = y + 250;
    ctx.fillStyle = '#F4E6D8'; ctx.fillRect(x + 30, trackY + 60, w - 60, 4);
    blocks.forEach(([bw, col, pins], i) => {
      // the blocks after the stretched one follow it along, each a little behind the one before
      const shift = i > 1 ? spring(`slide${i}`, t, u => (u < tSlide ? 0 : 1), { t0: tSlide - 1, stiffness: 150 - i * 25, damping: 14 }) : 0;
      const left = i > 1 ? bx - 170 * 0.55 * (1 - shift) : bx;
      fillRR(ctx, left, trackY, bw, 56, 14, col);
      text(ctx, `line ${i + 1}`, left + 16, trackY + 29, { size: 20, weight: 700, color: '#FFFFFF', align: 'left' });
      for (const p of pins) {
        const px = left + bw * p;
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, trackY); ctx.lineTo(px, trackY - 70); ctx.stroke();
        fillRR(ctx, px, trackY - 86, 34, 24, [4, 10, 10, 4], INK);
        ctx.fillStyle = '#FFC24A'; ctx.beginPath(); ctx.arc(px, trackY - 70, 6, 0, TAU); ctx.fill();
      }
      bx += bw + 16;
    });
    withAlpha(ctx, on(t, tStretch + 0.2, 0.3), () => tag(ctx, 're-voiced', x + 40 + 150 + 16 + 170 * grow / 2, trackY + 104, { size: 20, fill: '#FFF1E0', color: '#C76A12' }));
  });
}

// "No dragging keyframes around by hand": a cursor tugging a keyframe, crossed out.
export function noDrag(ctx, t, t0, t1) {
  const a = Math.min(on(t, t0 - 0.2, 0.25), 1 - on(t, t1, 0.3));
  if (a <= 0) return;
  withAlpha(ctx, a, () => {
    const x = 1430, y = 700, drag = Math.sin((t - t0) * 5) * 40;
    ctx.save(); ctx.translate(x + drag, y); ctx.rotate(Math.PI / 4);
    fillRR(ctx, -22, -22, 44, 44, 6, '#FFC24A'); ctx.strokeStyle = INK; ctx.lineWidth = 4; rr(ctx, -22, -22, 44, 44, 6); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(x + drag + 18, y + 14);
    poly(ctx, [[0, 0], [0, 40], [11, 30], [20, 48], [28, 44], [19, 27], [33, 27]]);
    ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
    const k = E.back(on(t, t0 + 0.25, 0.3));
    if (k > 0.01) {
      ctx.save(); ctx.translate(x, y + 10); ctx.scale(k, k);
      ctx.strokeStyle = '#E5484D'; ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, 78, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-55, 55); ctx.lineTo(55, -55); ctx.stroke();
      ctx.restore();
    }
  });
}

// ---------- bouncing balls ----------
export function balls(ctx, t, t0, t1) {
  if (t < t0 || t > t1 + 0.6) return;
  withAlpha(ctx, 1 - on(t, t1, 0.5), () => {
    for (const b of BALLS) {
      const { y, impact } = drop(t, t0 + b.delay, b.h);
      const squash = impact !== null && impact < 0.12 ? Math.sin((impact / 0.12) * Math.PI) * 0.28 : 0;
      shadow(ctx, b.x, b.r * 1.3, y);
      ctx.save(); ctx.translate(b.x, FLOOR - y - b.r * (1 - squash)); ctx.scale(1 + squash, 1 - squash);
      const g = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.4, b.r * 0.1, 0, 0, b.r);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.25, b.col); g.addColorStop(1, b.col);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill();
      ctx.restore();
    }
  });
}

// ---------- the clapperboard: drops in, and snaps shut on the word ----------
export function clapperboard(ctx, t, tDrop, tClap, x, y) {
  if (t < tDrop) return;
  const fall = E.bounce(on(t, tDrop, 0.7)), yy = lerp(-400, y, fall);
  const open = t < tClap ? lerp(0.08, 0.5, E.out(on(t, tDrop + 0.2, 0.6))) : 0.5 * Math.pow(1 - E.in(on(t, tClap - 0.09, 0.09)), 1);
  const shut = t >= tClap ? Math.max(0, Math.sin((t - tClap) * 40) * 0.05 * Math.exp(-(t - tClap) * 10)) : 0;
  const ang = t < tClap - 0.09 ? -open : -Math.max(open, shut);
  ctx.save(); ctx.translate(x, yy); ctx.rotate(-0.06);
  fillRR(ctx, -250 + 12, -120 + 18, 500, 330, 18, 'rgba(120,70,40,0.2)');
  fillRR(ctx, -250, -120, 500, 330, 18, '#1B2330');
  // the stripes along the top of the board
  ctx.save(); rr(ctx, -250, -120, 500, 60, [18, 18, 0, 0]); ctx.clip();
  for (let i = -2; i < 12; i++) { ctx.fillStyle = i % 2 ? '#FFFFFF' : '#FF8A1F'; poly(ctx, [[-250 + i * 56, -60], [-250 + i * 56 + 56, -60], [-250 + i * 56 + 86, -120], [-250 + i * 56 + 30, -120]]); ctx.fill(); }
  ctx.restore();
  text(ctx, 'CLAPPER', 0, 34, { size: 92, weight: 700, color: '#FFFFFF' });
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-210, 104, 420, 3);
  text(ctx, 'words in, video out', 0, 150, { size: 30, weight: 500, color: '#8FA3B8' });
  // the stick, hinged at its left end
  ctx.save(); ctx.translate(-250, -124); ctx.rotate(ang);
  fillRR(ctx, 0, -58, 500, 58, [18, 18, 4, 4], '#1B2330');
  ctx.save(); rr(ctx, 0, -58, 500, 58, [18, 18, 4, 4]); ctx.clip();
  for (let i = -2; i < 12; i++) { ctx.fillStyle = i % 2 ? '#FFFFFF' : '#FF8A1F'; poly(ctx, [[i * 56, 0], [i * 56 + 56, 0], [i * 56 + 26, -58], [i * 56 - 30, -58]]); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#39414F'; ctx.beginPath(); ctx.arc(12, -8, 9, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
  confetti(ctx, t, tClap, x, yy - 120, { n: 90, spread: 2.4, speed: 1300 });
}
