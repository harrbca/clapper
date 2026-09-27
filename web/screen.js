// Web captures (clap capture) played back: the page's screenshots in a browser window, a pointer that
// glides to each thing and clicks it, and typing a character at a time, all on the timeline's cues.
//
//   const cap = await loadCapture('capture/print');            // in setup()
//   screen(ctx, t, cap, { at: { search: cue.search, typed: cue.typed, open: cue.open }, x: 0, y: 0, w: W });
//
// `at` gives each step its moment: a click's press, a typing step's first key, when a shot or key
// press shows. The window's top-left is at (x, y) and it is w wide; its height follows from the page's
// (a 1600 x 816 page in a 1920-wide window fills a 1080p frame). onStage(cap, o, [px, py]) says where a
// point on the page lands, and target(cap, o, id) where a step pointed, to aim a camera at them.
import { clamp, E, inv } from './core.js';

const on01 = (x, a, b) => clamp((x - a) / (b - a));

export const BAR = 84;                   // the browser's tab strip and toolbar, in page pixels
export const TYPE_RATE = 0.085;          // seconds between typed characters
const ARRIVE = 0.16;                     // the pointer gets there this long before it presses

export async function loadCapture(dir) {
  const r = await fetch(`/${dir}/capture.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`/${dir}/capture.json: HTTP ${r.status} (run clap capture)`);
  const cap = { ...(await r.json()), dir, img: {} };
  const names = new Set(cap.steps.flatMap(s => [s.img, s.hover, ...(s.imgs || [])]).filter(Boolean));
  await Promise.all([...names].map(n => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { cap.img[n] = im; res(); };
    im.onerror = () => rej(new Error(`could not load /${dir}/${n}`));
    im.src = `/${dir}/${n}`;
  })));
  return cap;
}

// What shows when, and where the pointer goes: [time, image, fade, title] and { t (arrives), at, cursor, press }.
function plan(cap, at) {
  const shows = [], moves = [];
  for (const s of cap.steps) {
    const T = at[s.id];
    if (T === undefined) throw new Error(`screen: no time for the capture step ${s.id}`);
    if (s.kind === 'shot' || s.kind === 'key' || s.kind === 'act') shows.push([T, s.img, 0.22, s.title]);
    else if (s.kind === 'hover') { moves.push({ t: T, at: s.at, cursor: s.cursor }); shows.push([T, s.img, 0.1, s.title]); }
    else if (s.kind === 'click') {
      moves.push({ t: T - ARRIVE, at: s.at, cursor: s.cursor, press: T });
      shows.push([T - ARRIVE + 0.03, s.hover, 0.1, s.title], [T + 0.07, s.img, 0.15, s.title]);
    } else if (s.kind === 'type') s.imgs.forEach((img, i) => shows.push([T + i * TYPE_RATE, img, 0, s.title]));
  }
  shows.sort((a, b) => a[0] - b[0]);
  return { shows, moves };
}

// The pointer at t: { at, cursor, press (the last press's time) }. It rests, then glides to the next
// place on a slight curve, arriving ARRIVE before its press.
function pointerAt(cap, moves, t) {
  let from = cap.pointer, cursor = 'default', press = -1e9, prev = -1e9;
  for (const m of moves) {
    const d = Math.hypot(m.at[0] - from[0], m.at[1] - from[1]);
    const t0 = Math.max(m.t - clamp(0.3 + d / 1500, 0.35, 0.95), prev + 0.1);
    if (t < t0) break;
    if (t < m.t) {
      const k = E.io(inv(t0, m.t, t)), bend = Math.sin(Math.PI * k) * d * 0.07;
      const nx = -(m.at[1] - from[1]) / (d || 1), ny = (m.at[0] - from[0]) / (d || 1);
      return { at: [from[0] + (m.at[0] - from[0]) * k + nx * bend, from[1] + (m.at[1] - from[1]) * k + ny * bend], cursor: k > 0.92 ? m.cursor : 'default', press };
    }
    from = m.at; cursor = m.cursor; prev = m.t;
    if (m.press !== undefined && m.press <= t) press = m.press;
  }
  return { at: from, cursor, press };
}

// ---------- the browser ----------
function browserBar(ctx, cap, vw, title) {
  const tab = '#DFE3E8', ink = '#202124', grey = '#5F6368';
  ctx.fillStyle = tab; ctx.fillRect(0, 0, vw, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.roundRect(8, 6, 250, 40, [9, 9, 0, 0]); ctx.fill();
  ctx.fillStyle = cap.accent || '#1A73E8';
  ctx.beginPath(); ctx.roundRect(20, 16, 15, 15, 4); ctx.fill();
  ctx.font = '400 13px Roboto, "Segoe UI", sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = ink;
  ctx.save(); ctx.beginPath(); ctx.rect(42, 6, 186, 34); ctx.clip(); ctx.fillText(title || '', 44, 24); ctx.restore();
  ctx.strokeStyle = grey; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  const line = (...p) => { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.stroke(); };
  line(240, 19, 250, 29); line(250, 19, 240, 29);                                   // close the tab
  line(276, 18, 276, 30); line(270, 24, 282, 24);                                   // a new tab
  line(vw - 138, 22, vw - 126, 22);                                                 // the window's buttons
  ctx.strokeRect(vw - 88, 16, 11, 11);
  line(vw - 40, 16, vw - 29, 27); line(vw - 29, 16, vw - 40, 27);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 40, vw, BAR - 40);
  ctx.lineWidth = 1.8;
  line(30, 62, 20, 62); line(25, 57, 20, 62, 25, 67);                               // back
  ctx.strokeStyle = '#BDC1C6'; line(56, 62, 66, 62); line(61, 57, 66, 62, 61, 67); // forward (none)
  ctx.strokeStyle = grey;
  ctx.beginPath(); ctx.arc(96, 62, 6, -Math.PI * 0.35, Math.PI * 1.45); ctx.stroke(); // reload
  line(99, 55, 101, 57.5, 98, 59.5);
  ctx.fillStyle = '#F1F3F4'; ctx.beginPath(); ctx.roundRect(120, 47, vw - 240, 30, 15); ctx.fill();
  ctx.lineWidth = 1.3;                                                              // the padlock
  ctx.strokeRect(137, 60, 9, 7); ctx.beginPath(); ctx.arc(141.5, 59.5, 3, Math.PI, 0); ctx.stroke();
  ctx.font = '400 14px Roboto, "Segoe UI", sans-serif'; ctx.fillStyle = ink;
  ctx.fillText(cap.address || '', 158, 62.5);
  ctx.fillStyle = cap.accent || '#1A73E8'; ctx.beginPath(); ctx.arc(vw - 74, 62, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = grey; for (const dy of [-6, 0, 6]) { ctx.beginPath(); ctx.arc(vw - 36, 62 + dy, 1.8, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#DADCE0'; ctx.fillRect(0, BAR - 1, vw, 1);
}

// ---------- the pointer ----------
// Drawn in page pixels with its hot spot at the origin, as Windows draws it: white edged in black (the
// text cursor the other way round). Each shape is a list of parts; all are edged first, then all
// filled, so where parts overlap there is no seam.
const poly = pts => g => { pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
const rrect = (x, y, w, h, r, rot = 0, ox = 0, oy = 0) => g => {
  if (!rot) return g.roundRect(x, y, w, h, r);
  const c = Math.cos(rot), s = Math.sin(rot), P = (px, py) => [ox + px * c - py * s, oy + px * s + py * c];
  poly([P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)])(g);
};
const CURSORS = {
  default: { parts: [poly([[0, 0], [0, 17], [4.3, 13.1], [7.2, 19.8], [10, 18.6], [7.1, 12], [12.4, 12]])], fill: '#FFF', edge: '#111' },
  pointer: {
    parts: [
      rrect(-2, 0, 4.6, 14, 2.3),                                               // the pointing finger
      rrect(2.2, 6.2, 3.6, 8, 1.8), rrect(5.4, 7, 3.6, 7.5, 1.8), rrect(8.6, 8.2, 3.2, 7, 1.6),   // curled fingers
      rrect(-2, 10.5, 13.8, 10, 4),                                             // the palm
      rrect(-6, -1.6, 7, 3.4, 1.6, -0.75, -1.6, 14),                            // the thumb
    ],
    fill: '#FFF', edge: '#111',
  },
  text: { parts: [rrect(-0.7, -8.5, 1.4, 17, 0), rrect(-3.2, -9, 6.4, 1.3, 0), rrect(-3.2, 7.7, 6.4, 1.3, 0)], fill: '#111', edge: '#FFF' },
};
function drawCursor(ctx, kind, scale) {
  const c = CURSORS[kind] || CURSORS.default;
  ctx.save(); ctx.scale(scale, scale); ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1.2;
  ctx.strokeStyle = c.edge; ctx.lineWidth = 2.2;
  for (const p of c.parts) { ctx.beginPath(); p(ctx); ctx.stroke(); }
  ctx.shadowColor = 'transparent'; ctx.fillStyle = c.fill;
  for (const p of c.parts) { ctx.beginPath(); p(ctx); ctx.fill(); }
  ctx.restore();
}
function drawPointer(ctx, p, t, accent, touch) {
  const since = t - p.press;
  if (touch) {                             // a touch screen: no pointer, a fingertip's mark where it taps
    if (since < 0 || since > 0.55) return;
    const k = since / 0.55;
    ctx.save(); ctx.fillStyle = accent;
    ctx.globalAlpha = 0.28 * (1 - k); ctx.beginPath(); ctx.arc(p.at[0], p.at[1], 16 + 30 * E.out(k), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.35 * (1 - on01(since, 0.12, 0.3)); ctx.beginPath(); ctx.arc(p.at[0], p.at[1], 15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  if (since >= 0 && since < 0.5) {         // a ring spreads out from the click
    const k = since / 0.5;
    ctx.save(); ctx.globalAlpha = (1 - k) * 0.55; ctx.strokeStyle = accent; ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(p.at[0], p.at[1], 6 + 26 * E.out(k), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  const squash = since >= 0 && since < 0.2 ? 1 - 0.14 * Math.sin((since / 0.2) * Math.PI) : 1;
  ctx.save(); ctx.translate(p.at[0], p.at[1]);
  drawCursor(ctx, p.cursor, 1.25 * squash);
  ctx.restore();
}

// ---------- the whole screen ----------
// o: { at, x, y, w, bar (the browser's bars, default true), pointer (true; 'touch' for a touch screen's
// taps and no pointer; false for neither) }. Steps may also be acts (s.act), which show like shots.
export function screen(ctx, t, cap, o) {
  const { shows, moves } = plan(cap, o.at);
  const vw = cap.viewport.width, vh = cap.viewport.height, bar = o.bar === false ? 0 : BAR;
  const s = o.w / vw;
  let i = -1;
  while (i + 1 < shows.length && shows[i + 1][0] <= t) i++;
  const cur = shows[Math.max(0, i)], prev = i > 0 ? shows[i - 1] : null;
  const fade = i >= 0 && cur[2] > 0 ? clamp((t - cur[0]) / cur[2]) : 1;
  ctx.save();
  ctx.translate(o.x ?? 0, o.y ?? 0); ctx.scale(s, s);
  ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, vw, vh + bar, bar ? 8 : 0); ctx.clip();
  if (bar) browserBar(ctx, cap, vw, cur[3]);
  ctx.imageSmoothingQuality = 'high';
  if (prev && fade < 1) ctx.drawImage(cap.img[prev[1]], 0, bar, vw, vh);
  ctx.globalAlpha = prev ? fade : 1;
  ctx.drawImage(cap.img[cur[1]], 0, bar, vw, vh);
  ctx.globalAlpha = 1;
  ctx.restore();
  if (o.pointer !== false) { ctx.translate(0, bar); drawPointer(ctx, pointerAt(cap, moves, t), t, cap.accent || '#1A73E8', o.pointer === 'touch'); }
  ctx.restore();
}

// Where a point on the page lands on the stage, for a window drawn with options o.
export const onStage = (cap, o, [px, py]) => {
  const s = o.w / cap.viewport.width;
  return [(o.x ?? 0) + px * s, (o.y ?? 0) + ((o.bar === false ? 0 : BAR) + py) * s];
};
// The middle of what a step pointed at (or the page's middle, for a shot), on the stage.
export function target(cap, o, id) {
  const st = cap.steps.find(s => s.id === id);
  if (!st) throw new Error(`screen: no capture step ${id}`);
  return onStage(cap, o, st.box ? [st.box[0] + st.box[2] / 2, st.box[1] + st.box[3] / 2] : st.at ?? [cap.viewport.width / 2, cap.viewport.height / 2]);
}
