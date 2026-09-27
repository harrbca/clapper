// The toon kit: what toon characters are made of. Ink and cel shading, bendy limbs, four-fingered
// hands, eyes, brows and a mouth built for acting, 2.5D head turns, 3/4 body turns, and toonPose(),
// which brings a character to life (on twos, joints on springs, breathing, blinking, glancing,
// lip-sync, eyes leading the head and the head leading the body, arms in the right order).
// characters/pip.js and characters/gus.js are made from it.
import { clamp, lerp, TAU } from './core.js';
import { add, choreo } from './puppet.js';
import { blink, breath, glance, sway } from './life.js';
import { loudness, mouth as lipsync } from './lipsync.js';
import { lag, springs } from './spring.js';

export const INK = '#2A1C33', LW = 4.4;
export const v = (pose, k, d = 0) => pose[k] ?? d;

// ---------- ink ----------
export function inked(ctx, path, fill, lw = LW, ink = INK) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(path); }
  ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(path);
}
export function within(ctx, path, fn) { ctx.save(); ctx.clip(path); fn(); ctx.restore(); }
export function line(ctx, pts, lw = LW, col = INK) {
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
// A path moved and scaled, so strokes on it stay even.
export const transformed = (path, m) => { const p = new Path2D(); p.addPath(path, m); return p; };

// ---------- limbs ----------
// A bendy limb: from the pivot down (+y) `a` long to the elbow or knee, then `b` more, turned by
// `bend`. One outlined stroke that tapers from w1 to w2, so the joint never shows a seam. `cuff`
// adds a band at the end (a sleeve's cuff), in that colour.
export function limb(ctx, a, b, bend, w1, w2, col, cuff) {
  const wx = -Math.sin(bend) * b, wy = a + Math.cos(bend) * b, k = 0.25;
  const upper = new Path2D(), lower = new Path2D();
  upper.moveTo(0, 0); upper.lineTo(0, a * (1 - k)); upper.quadraticCurveTo(0, a, wx * k, a + (wy - a) * k);
  lower.moveTo(wx * k * 0.5, a + (wy - a) * k * 0.5); lower.lineTo(wx, wy);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w1 + LW * 2; ctx.stroke(upper);
  ctx.lineWidth = w2 + LW * 2; ctx.stroke(lower);
  ctx.strokeStyle = col;
  ctx.lineWidth = w1; ctx.stroke(upper);
  ctx.lineWidth = w2; ctx.stroke(lower);
  if (cuff) {
    const dir = Math.atan2(wy - a, wx), dx = Math.cos(dir) * 16, dy = Math.sin(dir) * 16;
    const band = [[wx - dx * 1.2, wy - dy * 1.2], [wx - dx * 0.2, wy - dy * 0.2]];
    line(ctx, band, w2 + 4 + LW * 2);
    line(ctx, band, w2 + 4, cuff);
  }
}

// Four-fingered toon hands, along +y from the wrist. form: 0 open, 1 pointing, 2 fist, 3 thumbs
// up, 4 relaxed. side -1 is the left hand. Reads '<key>.form' from the pose.
export function hand(side, key, { skin, size = 1 }) {
  const fingers = (ctx, list, palm) => {
    for (const pass of [0, 1]) {
      const w = pass ? 0 : LW * 2;
      ctx.strokeStyle = pass ? skin : INK; ctx.fillStyle = ctx.strokeStyle;
      for (const [x, y, len, fw, r] of list) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(r);
        ctx.lineWidth = fw + w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke();
        ctx.restore();
      }
      const p = new Path2D(); p.roundRect(-27, palm[0], 54, palm[1], 20);
      if (w) { ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(p); }
      ctx.fill(p);
    }
  };
  return (ctx, pose) => {
    const form = Math.round(v(pose, `${key}.form`));
    ctx.save(); ctx.scale(side * size, size);
    if (form === 0) fingers(ctx, [[-17, 44, 32, 15, 0.16], [-5, 46, 38, 15, 0.04], [8, 46, 36, 15, -0.08], [24, 16, 32, 16, -0.95]], [0, 56]);
    else if (form === 1) fingers(ctx, [[-14, 44, 50, 16, -0.02], [24, 18, 24, 16, -1.3]], [0, 58]);
    else if (form === 2) fingers(ctx, [[21, 22, 18, 17, -1.6]], [0, 62]);
    else if (form === 3) fingers(ctx, [[20, 28, 34, 17, -2.6]], [0, 60]);
    else fingers(ctx, [[-14, 46, 30, 15, 0.05], [-2, 48, 34, 15, 0], [10, 47, 31, 15, -0.05], [22, 18, 26, 16, -0.7]], [0, 56]);
    if (form === 2 || form === 3) for (const x of [-12, 0, 12]) line(ctx, [[x, 44], [x, 58]], 2.2);
    ctx.restore();
  };
}

// ---------- turning ----------
// The head turns in 2.5D ('head.turn', -1..1): features slide round a curved face. at(x, depth)
// is where a feature at x lands, width(x) how wide it looks.
export function headTurn(pose, faceR = 115) {
  const th = clamp(v(pose, 'head.turn'), -1, 1) * 0.5, c = Math.cos(th), s = Math.sin(th);
  const at = (x, depth = 1) => x * c + s * faceR * depth;
  const width = x => Math.cos(th + x / faceR) / Math.cos(x / faceR);
  return { th, c, s, at, width };
}

// The body turns towards 3/4 ('body.turn', -1..1, positive towards the screen's right). A torso is an
// ellipse a wide and b deep: its silhouette narrows by k, a feature on its front at x moves to
// front(x), and the side facing away shows between the silhouette's edge and `edge`.
export function bodyTurn(pose, a = 100, b = 62) {
  const th = clamp(v(pose, 'body.turn'), -1, 1) * 0.8, c = Math.cos(th), s = Math.sin(th);
  const k = Math.sqrt(c * c + (b / a) ** 2 * s * s);
  const front = x => x * c + b * Math.sqrt(Math.max(0, 1 - (x / a) ** 2)) * s;
  return { th, c, s, k, front, side: s > 0 ? -1 : 1, edge: (s > 0 ? -1 : 1) * a * c, outer: (s > 0 ? -1 : 1) * a * k };
}

// A torso that turns: `path` drawn facing us (in torso space, y up from the hips), narrowed by the
// turn, with its turned-away side in shadow and a crease where front meets side. decorate(ctx, T)
// draws what is on the front (a neckline, buttons), placing things with T.front(x).
export function turningTorso(ctx, pose, { path, a, b, fill, shadow, decorate }) {
  const T = bodyTurn(pose, a, b);
  const p = transformed(path, new DOMMatrix().scale(T.k, 1));
  ctx.fillStyle = fill; ctx.fill(p);
  within(ctx, p, () => {
    ctx.fillStyle = shadow;
    if (Math.abs(T.s) > 0.05) {                                // turned: the side facing away, in shadow
      const x0 = T.edge, x1 = T.outer * 1.5;
      ctx.fillRect(Math.min(x0, x1), -400, Math.abs(x1 - x0), 500);
    } else {                                                   // facing us: shade down the left, away from the light
      ctx.beginPath(); ctx.moveTo(-a * 1.4, 40); ctx.lineTo(-a * 1.4, -280); ctx.lineTo(-a * 0.5, -280);
      ctx.bezierCurveTo(-a * 0.7, -200, -a * 0.74, -110, -a * 0.46, 40); ctx.fill();
    }
    decorate?.(ctx, T);
    if (Math.abs(T.s) > 0.05) line(ctx, [[T.edge, 18], [T.edge * 1.03, -120], [T.edge * 0.92, -240]], LW * 0.8);
  });
  inked(ctx, p);
  return T;
}

// A shoe that turns: facing us it is round; turned, it stretches to show its side and points that way.
export function turningShoe(side, { upper, sole, shade, seam = true }) {
  return (ctx, pose) => {
    const s = Math.sin(clamp(v(pose, 'body.turn'), -1, 1) * 0.8);
    ctx.save(); ctx.scale(side, 1);
    ctx.translate(side * s * 22, 0);
    ctx.scale(1 + Math.abs(s) * 0.55, 1);
    if (side * s < -0.05) ctx.scale(-1, 1);                    // point the toe the way the body turns
    const body = new Path2D('M -38 10 C -40 -8 -20 -14 8 -14 C 38 -14 56 0 56 16 C 56 30 40 36 8 36 C -24 36 -38 28 -38 10 Z');
    ctx.fillStyle = upper; ctx.fill(body);
    within(ctx, body, () => { ctx.fillStyle = shade; ctx.fillRect(-50, 16, 120, 8); ctx.fillStyle = sole; ctx.fillRect(-50, 24, 120, 20); });
    inked(ctx, body);
    if (seam) line(ctx, [[-36, 24], [54, 24]], 2.5);
    ctx.restore();
  };
}

// ---------- the face ----------
// Eyes: gaze (eyes.x, eyes.y), blink, open (1.3 wide), squint, pupil size, lids that drop and slant
// (+ angry, - sad), each eye on its own too (eyeL.open, lidL.drop, lidL.slant ...).
export function eye(ctx, pose, s, { rx: RX = 30, ry: RY = 37, iris = 16, pupil: P = 9, skin, irisCol = '#3F70B8', irisShade = '#2C5290', lash = 1.7 } = {}) {
  const S = s < 0 ? 'L' : 'R';
  const open = clamp(v(pose, 'eyes.open', 1) * v(pose, `eye${S}.open`, 1), 0, 1.5);
  const cover = clamp(Math.max(v(pose, 'eyes.blink'), v(pose, 'lids.drop') + v(pose, `lid${S}.drop`), 1 - Math.min(open, 1)), 0, 1);
  const slant = clamp(v(pose, 'lids.slant') + v(pose, `lid${S}.slant`), -1, 1), squint = clamp(v(pose, 'eyes.squint'));
  const big = Math.max(1, open), rx = RX * (1 + (big - 1) * 0.35), ry = RY * big;
  const gx = v(pose, 'eyes.x') * RX * 0.33, gy = v(pose, 'eyes.y') * RY * 0.27, pupil = v(pose, 'eyes.pupil', 1);
  const white = new Path2D(`M ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0 Z`);
  const inner = -s * rx, outer = s * rx;
  // the lower lid rises with a squint; the upper lid closes down onto it, not past it, so a
  // squinting eye shuts into a happy arc
  const low = ry - 2 * ry * squint * 0.5, corner = low + squint * 6;
  const lidY = -ry + 2 * ry * cover, tilt = slant * RY * 0.38 * (1 - cover * 0.6);
  const yIn = Math.min(lidY + tilt, corner), yOut = Math.min(lidY - tilt * 0.4, corner);
  const mid = Math.min((yIn + yOut) / 2 + RY * 0.16 * (1 - cover), low - squint * 26);
  ctx.fillStyle = '#FFFFFF'; ctx.fill(white);
  within(ctx, white, () => {
    ctx.fillStyle = irisShade; ctx.beginPath(); ctx.arc(gx, gy + 4, iris * 1.19, 0, TAU); ctx.fill();
    ctx.fillStyle = irisCol; ctx.beginPath(); ctx.arc(gx, gy + 6, iris, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1A1426'; ctx.beginPath(); ctx.arc(gx, gy + 4, P * pupil, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(gx + iris * 0.38, gy - 4, iris * 0.28, 0, TAU); ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.moveTo(inner * 1.2, -ry - 4); ctx.lineTo(outer * 1.2, -ry - 4); ctx.lineTo(outer * 1.2, yOut); ctx.quadraticCurveTo(0, mid, inner * 1.2, yIn); ctx.fill();
    ctx.beginPath(); ctx.moveTo(inner * 1.2, ry + 4); ctx.lineTo(outer * 1.2, ry + 4); ctx.lineTo(outer * 1.2, low + squint * 6); ctx.quadraticCurveTo(0, low - squint * 26, inner * 1.2, low + squint * 6); ctx.fill();
  });
  ctx.lineWidth = 2.2; ctx.strokeStyle = skin; ctx.stroke(white);   // hide the white's soft edge where the lids cover it
  within(ctx, white, () => {
    const shows = new Path2D();                               // the eye's outline, only between the lids
    shows.moveTo(inner * 1.2, yIn); shows.quadraticCurveTo(0, mid, outer * 1.2, yOut);
    shows.lineTo(outer * 1.2, low + squint * 6); shows.quadraticCurveTo(0, low - squint * 26, inner * 1.2, low + squint * 6); shows.closePath();
    ctx.clip(shows);
    ctx.lineWidth = LW * 0.9; ctx.strokeStyle = INK; ctx.stroke(white);
  });
  ctx.save(); ctx.beginPath(); ctx.rect(-rx - 12, -ry - 30, rx * 2 + 24, ry * 2 + 50); ctx.clip();
  line(ctx, [[inner, yIn], [0, mid - 2], [outer, yOut]], LW * lash);
  if (cover < 0.95 && lash > 1.2) line(ctx, [[outer * 0.92, yOut], [outer * 1.22, yOut - 10]], LW * 1.3);
  if (squint > 0.12 && cover < 0.9) line(ctx, [[inner * 0.9, low + squint * 6], [0, low - squint * 20], [outer * 0.9, low + squint * 6]], LW * 0.9);
  ctx.restore();
}

// Brows: brows.up, brows.in (a frown), and each on its own (browL.up, browL.slant: + angry, - worried).
export function brow(ctx, pose, s, { y = -202, len = 26, w = 11, color, rise = 14, arch = 8 } = {}) {
  const S = s < 0 ? 'L' : 'R';
  const up = (v(pose, 'brows.up') + v(pose, `brow${S}.up`)) * rise;
  const slant = clamp(v(pose, 'brows.in') + v(pose, `brow${S}.slant`), -1.2, 1.2);
  ctx.save(); ctx.translate(0, y - up); ctx.rotate(s * (0.1 - slant * 0.32));
  ctx.lineCap = 'round';
  const path = new Path2D(`M ${-len} 4 Q 0 ${-arch} ${len} 2`);
  ctx.strokeStyle = INK; ctx.lineWidth = w + LW * 1.4; ctx.stroke(path);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(path);
  ctx.restore();
}

// The mouth: an ink line when closed; open, a dark mouth with upper teeth, lower teeth when wide,
// gums on a big laugh, and a tongue. Corners lift with 'mood.smile', and separately for a smirk
// (mouth.cornerL / cornerR); mouth.shift talks from one side. `jaw` (px) is how far the jaw has
// dropped, which the face drawing stretches for.
export function mouth(ctx, pose, jaw, { y = -74, minW = 19, maxW = 46, openH = 58, pal }) {
  const m = k => v(pose, `mouth.${k}`);
  const open = clamp(m('open') + v(pose, 'jaw') * 0.8), round = clamp(m('round')), wide = clamp(m('wide') || 0.5);
  const smile = v(pose, 'mood.smile', 0.35);
  const cx = m('shift') * 16, cy = y + jaw * 0.45;
  let hw = lerp(minW, maxW, wide) * (1 + Math.max(0, smile) * 0.18);
  hw = lerp(hw, minW * 0.7 + open * 11, round * 0.85);
  const lift = s => (smile + m(s < 0 ? 'cornerL' : 'cornerR')) * 11 * (1 - round * 0.7);
  const L = [cx - hw, cy - lift(-1)], R = [cx + hw, cy - lift(1)];
  if (open < 0.06) {
    const sag = 3 + (smile + (m('cornerL') + m('cornerR')) / 2) * 9;
    ctx.beginPath(); ctx.moveTo(...L); ctx.quadraticCurveTo(cx, cy + sag, ...R);
    ctx.lineWidth = LW * (1.1 + m('press') * 0.5); ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    for (const [x, yy, s] of [[...L, -1], [...R, 1]]) if (Math.abs(smile) > 0.3 || m('press') > 0.5) line(ctx, [[x - s * 2, yy - 5], [x + s * 4, yy + 4]], LW * 0.7);
    return;
  }
  const h = 8 + open * openH, top = cy - h * 0.2;
  const shape = new Path2D();
  shape.moveTo(...L);
  shape.bezierCurveTo(cx - hw * 0.45, top - h * 0.1, cx + hw * 0.45, top - h * 0.1, ...R);
  shape.bezierCurveTo(cx + hw * (0.95 - round * 0.35), cy + h * 1.02, cx - hw * (0.95 - round * 0.35), cy + h * 1.02, ...L);
  shape.closePath();
  ctx.fillStyle = pal.mouth; ctx.fill(shape);
  within(ctx, shape, () => {
    const teeth = m('teeth'), tuck = m('tuck');
    if (open > 0.7 && smile > 0.5) { ctx.fillStyle = pal.gum; ctx.fillRect(cx - hw, top - 20, hw * 2, 16); }
    if (teeth > 0.05) {
      const th = 9 + h * (0.18 + tuck * 0.3) * teeth;
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cx - hw, top - 14, hw * 2, th + 14);
      line(ctx, [[cx - hw, top + th], [cx + hw, top + th]], 2.2);
      if (open > 0.55) { ctx.fillRect(cx - hw * 0.7, cy + h * 0.72, hw * 1.4, 14); line(ctx, [[cx - hw * 0.7, cy + h * 0.72], [cx + hw * 0.7, cy + h * 0.72]], 2); }
    }
    const tongue = m('tongue');
    ctx.fillStyle = pal.tongue;
    ctx.beginPath(); ctx.ellipse(cx + hw * 0.08, cy + h * 0.92 - tongue * h * 0.35, hw * 0.68, h * 0.38, 0, 0, TAU); ctx.fill();
    if (tuck > 0.05) { ctx.fillStyle = pal.lip; ctx.beginPath(); ctx.ellipse(cx, cy + h * 1.05, hw, h * 0.66 * tuck, 0, 0, TAU); ctx.fill(); }
  });
  inked(ctx, shape, null, LW * 1.05);
}

// The neutral face every expression starts from, so moving between expressions resets the keys.
export const NEUTRAL = {
  'eyes.open': 1, 'eyes.squint': 0, 'eyes.pupil': 1, 'lids.drop': 0, 'lids.slant': 0, 'lidL.drop': 0, 'lidR.drop': 0,
  'lidL.slant': 0, 'lidR.slant': 0, 'brows.up': 0, 'brows.in': 0, 'browL.up': 0, 'browR.up': 0, 'browL.slant': 0, 'browR.slant': 0,
  'mood.smile': 0.3, 'mouth.cornerL': 0, 'mouth.cornerR': 0, 'mouth.shift': 0, 'jaw': 0, 'nose.scrunch': 0,
};
export const expressions = n => ({
  neutral: n,
  happy: { ...n, 'mood.smile': 0.9, 'eyes.squint': 0.35, 'brows.up': 0.25 },
  laugh: { ...n, 'mood.smile': 1, 'eyes.squint': 1, 'eyes.blink': 0.55, 'brows.up': 0.4, 'jaw': 0.5 },
  surprised: { ...n, 'brows.up': 1, 'eyes.open': 1.25, 'eyes.pupil': 0.75, 'mood.smile': 0, 'jaw': 0.35 },
  shocked: { ...n, 'brows.up': 1.3, 'brows.in': -0.4, 'eyes.open': 1.4, 'eyes.pupil': 0.45, 'mood.smile': -0.4, 'jaw': 0.8 },
  skeptical: { ...n, 'browL.up': 0.9, 'browR.up': -0.5, 'browR.slant': 0.5, 'lidR.drop': 0.35, 'lidL.drop': 0.08, 'mood.smile': 0, 'mouth.cornerL': -0.35, 'mouth.cornerR': 0.25, 'mouth.shift': 0.3 },
  smug: { ...n, 'lids.drop': 0.42, 'browL.up': 0.5, 'browR.up': 0.15, 'mood.smile': 0.5, 'mouth.cornerR': 0.55, 'mouth.cornerL': -0.2, 'mouth.shift': 0.25, 'eyes.pupil': 1.05 },
  angry: { ...n, 'brows.in': 1, 'lids.slant': 0.8, 'lids.drop': 0.18, 'eyes.pupil': 0.8, 'mood.smile': -0.7, 'nose.scrunch': 0.4 },
  sad: { ...n, 'brows.in': -0.9, 'brows.up': 0.2, 'lids.slant': -0.7, 'lids.drop': 0.3, 'mood.smile': -0.6, 'eyes.y': 0.4 },
  worried: { ...n, 'brows.in': -0.8, 'brows.up': 0.5, 'eyes.open': 1.1, 'mood.smile': -0.25, 'mouth.cornerL': -0.3, 'eyes.pupil': 0.85 },
  disgusted: { ...n, 'brows.in': 0.6, 'browL.up': -0.2, 'lidL.drop': 0.35, 'mood.smile': -0.5, 'mouth.cornerL': -0.6, 'mouth.shift': -0.35, 'nose.scrunch': 1 },
  delighted: { ...n, 'mood.smile': 1, 'eyes.open': 1.15, 'eyes.pupil': 1.15, 'brows.up': 0.7, 'jaw': 0.2 },
  deadpan: { ...n, 'lids.drop': 0.5, 'mood.smile': 0, 'brows.up': -0.2 },
  grumpy: { ...n, 'brows.in': 0.55, 'lids.drop': 0.28, 'mood.smile': -0.45, 'mouth.cornerL': -0.15 },
  horrified: { ...n, 'brows.in': -0.7, 'brows.up': 1.1, 'eyes.open': 1.35, 'eyes.pupil': 0.4, 'mood.smile': -0.8, 'jaw': 0.3 },
});

// ---------- bringing a character to life ----------
// The joints most characters spring: the shoulder leads, the elbow lags it, the hand lags that.
export const FEEL = {
  arm: { stiffness: 230, damping: 19 }, fore: { stiffness: 170, damping: 13 }, hand: { stiffness: 130, damping: 10 },
  head: { stiffness: 150, damping: 15 }, body: { stiffness: 100, damping: 14 }, turn: { stiffness: 70, damping: 13 },
};
export const JOINTS = {
  'armL.r': FEEL.arm, 'armR.r': FEEL.arm, 'foreL.r': FEEL.fore, 'foreR.r': FEEL.fore, 'handL.r': FEEL.hand, 'handR.r': FEEL.hand,
  'head.r': FEEL.head, 'head.turn': FEEL.head, 'torso.r': FEEL.body, 'hips.x': FEEL.body, 'body.turn': FEEL.turn,
};

// Make a character's pose(t, moves, opts) function. `id` keeps its springs and rhythms apart from
// other characters'; `shoulder` and `hip` are the joints' distances from the middle (they come in as
// the body turns); `hair(t, base, p)` may add hair that swings (see Pip).
export function toonPose({ rest, id, seed = 3, shoulder = 88, hip = 42, headFollow = 0.45, bodyFollow = 0.9, hair }) {
  return function pose(t, moves, { speaker, extra, twos = true, still = false, springy = !still, fps = 30 } = {}) {
    if (twos) t = (Math.floor((t * fps) / 2 + 1e-6) * 2) / fps;
    // the eyes lead the head, and the body leads the head further
    const chore = u => {
      const q = choreo(u, rest, moves);
      q['head.turn'] = v(q, 'head.turn') + v(q, 'eyes.x') * headFollow + v(q, 'body.turn') * bodyFollow;
      return q;
    };
    const base = u => (extra ? add(chore(u), extra(u)) : chore(u));
    let p = chore(t);
    if (springy) Object.assign(p, springs(`${id}.joints`, t, chore, JOINTS));
    if (extra) p = add(p, extra(t));
    if (!still) p = add(p, { 'armL.r': 0.02 * Math.sin(t * 1.3 + seed), 'armR.r': 0.02 * Math.sin(t * 1.1 + seed * 2), 'foreL.r': 0.028 * Math.sin(t * 1.7 + seed), 'foreR.r': 0.028 * Math.sin(t * 1.5 + seed) });
    const br = breath(t, seed), sw = still ? 0 : sway(t, seed);
    p = add(p, { 'torso.sy': 1 + 0.009 * br, 'head.y': -1.5 * br, 'hips.x': sw * 4, 'torso.r': sw * 0.012, 'head.r': -sw * 0.02 });
    const g = glance(t, seed);
    p['eyes.x'] = v(p, 'eyes.x') + g[0] * 0.3;
    p['eyes.y'] = v(p, 'eyes.y') + g[1] * 0.3;
    p['eyes.blink'] = Math.max(v(p, 'eyes.blink'), blink(t, seed));
    const mo = lipsync(t, { speaker });
    for (const [k, val] of Object.entries(mo)) p[`mouth.${k}`] = val;
    const talk = loudness(t) * (mo.open > 0.05 ? 1 : 0);
    p['head.r'] += Math.sin(t * 9 + seed) * 0.014 * talk;
    p['head.y'] += -talk * 3;
    p['browL.up'] = v(p, 'browL.up') + talk * 0.2;
    p['browR.up'] = v(p, 'browR.up') + talk * 0.2;
    // turning: the shoulders and hips come in; the near arm and leg come in front, the far ones go
    // behind the body; facing us, the arms are in front of the head (hands at the face stay whole).
    // 'arms.front' keeps both arms in front however he turns (arms crossed, hands together).
    const T = bodyTurn(p);
    p['armL.x'] = v(p, 'armL.x') + shoulder * (1 - T.c); p['armR.x'] = v(p, 'armR.x') - shoulder * (1 - T.c);
    p['legL.x'] = v(p, 'legL.x') + hip * (1 - T.c); p['legR.x'] = v(p, 'legR.x') - hip * (1 - T.c);
    const turned = Math.abs(T.s) > 0.18, nearL = T.s > 0;
    const zFor = side => (!turned || (side === 'L') === nearL || v(p, 'arms.front') > 0.5 ? 5.5 : 0.8);
    const folded = v(p, 'arms.front') > 0.5;                  // folded arms: the hands tuck under the arms
    for (const S of ['L', 'R']) {
      p[`arm${S}.z`] ??= zFor(S) + (folded && S === 'R' ? 0.1 : 0); p[`hand${S}.z`] ??= folded ? 5.45 : p[`arm${S}.z`] + 0.5;
      p[`leg${S}.z`] ??= turned && (S === 'L') === nearL ? 0.3 : 0;
    }
    if (hair) hair(t, base, p);
    return p;
  };
}
