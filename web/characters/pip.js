// Pip, toon style: ink outlines, cel shading, bendy limbs and a face built for acting. A stock
// character: import { pip, pose, EXPR, POSES } from '/@kit/characters/pip.js'.
//
// A puppet with its origin on the floor between the feet, about 930 px tall, facing us; L and R are
// the screen's left and right, and light comes from the upper right. Pose keys, beyond the joints:
//   eyes:  eyes.x, eyes.y (gaze, -1..1), eyes.blink, eyes.open (1 normal, 1.3 wide), eyes.squint (a
//          smile pushing the lower lids up), eyes.pupil (1 normal, 0.5 shocked), lids.drop (half-lidded),
//          lids.slant (+ angry, - sad), and per eye eyeL.open, lidL.drop, lidL.slant (and R)
//   brows: brows.up, brows.in (a frown); per brow browL.up, browL.slant (and R)
//   mouth: mouth.open, .wide, .round, .press, .teeth, .tongue, .tuck (lip-sync sets these),
//          mood.smile (-1..1), mouth.cornerL / cornerR (a smirk), mouth.shift (talking from the side), jaw
//   head:  head.turn (-1..1, a 2.5D turn), nose.scrunch
import { clamp, lerp, TAU } from '../core.js';
import { add, choreo, Puppet } from '../puppet.js';
import { blink, breath, glance, sway } from '../life.js';
import { loudness, mouth as lipsync } from '../lipsync.js';
import { lag, springs } from '../spring.js';

export const PAL = {
  ink: '#2A1C33',
  skin: '#F8CBA6', skinShadow: '#E6A784', blush: '#F4A08F',
  hair: '#3B2B57', hairShadow: '#291D40', hairLight: '#5B4A84',
  top: '#2CB4A4', topShadow: '#1F8E82', cuff: '#1A7469',
  pants: '#35405F', pantsShadow: '#262F49', shoe: '#FFFFFF', shoeShadow: '#DADDE4', sole: '#FF8A1F',
  eye: '#FFFFFF', iris: '#3F70B8', irisShadow: '#2C5290', pupil: '#1A1426',
  mouth: '#4A1427', tongue: '#EE7082', teeth: '#FFFFFF', gum: '#E07484', lip: '#D96F68', tie: '#FF8A1F',
};
const LW = 4.4;                         // the ink line, at scale 1

// ---------- drawing helpers ----------
const P = s => new Path2D(s);
function inked(ctx, path, fill, lw = LW) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(path); }
  ctx.lineWidth = lw; ctx.strokeStyle = PAL.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(path);
}
function within(ctx, path, fn) { ctx.save(); ctx.clip(path); fn(); ctx.restore(); }
const line = (ctx, pts, lw = LW, col = PAL.ink) => {
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
};

// A bendy limb: from the pivot down (+y) `a` long to the knee or elbow, then `b` more, turned by
// `bend`. Drawn as one outlined stroke, tapering from w1 to w2, so the joint never shows a seam.
function limbPaths(a, b, bend) {
  const ex = 0, ey = a, wx = -Math.sin(bend) * b, wy = a + Math.cos(bend) * b, k = 0.25;
  const upper = new Path2D(), lower = new Path2D();
  upper.moveTo(0, 0); upper.lineTo(ex, ey - a * k); upper.quadraticCurveTo(ex, ey, ex + (wx - ex) * k, ey + (wy - ey) * k);
  lower.moveTo(ex + (wx - ex) * k * 0.5, ey + (wy - ey) * k * 0.5); lower.lineTo(wx, wy);
  return { upper, lower, wrist: [wx, wy], dir: Math.atan2(wy - ey, wx - ex) };
}
function drawLimb(ctx, a, b, bend, w1, w2, col, end) {
  const { upper, lower, wrist, dir } = limbPaths(a, b, bend);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = w1 + LW * 2; ctx.stroke(upper);
  ctx.lineWidth = w2 + LW * 2; ctx.stroke(lower);
  ctx.strokeStyle = col;
  ctx.lineWidth = w1; ctx.stroke(upper);
  ctx.lineWidth = w2; ctx.stroke(lower);
  if (end) {                                            // a cuff at the wrist, a hem at the ankle
    const [cx, cy] = wrist, dx = Math.cos(dir) * 16, dy = Math.sin(dir) * 16;
    line(ctx, [[cx - dx * 1.2, cy - dy * 1.2], [cx - dx * 0.2, cy - dy * 0.2]], w2 + 4 + LW * 2);
    line(ctx, [[cx - dx * 1.2, cy - dy * 1.2], [cx - dx * 0.2, cy - dy * 0.2]], w2 + 4, end);
  }
}

// ---------- body ----------
const TORSO = P('M -82 12 C -86 -60 -94 -140 -100 -194 C -104 -226 -86 -243 -52 -247 L -38 -247 Q 0 -216 38 -247 L 52 -247 C 86 -243 104 -226 100 -194 C 94 -140 86 -60 82 12 C 42 26 -42 26 -82 12 Z');
const TORSO_SHADE = P('M -120 40 L -120 -260 L -50 -260 C -70 -200 -74 -110 -46 30 Z');
function drawTorso(ctx) {
  ctx.fillStyle = PAL.top; ctx.fill(TORSO);
  within(ctx, TORSO, () => {
    ctx.fillStyle = PAL.topShadow; ctx.fill(TORSO_SHADE);
    ctx.fillStyle = PAL.cuff; ctx.fillRect(-100, 2, 200, 30);                        // the hem
  });
  inked(ctx, TORSO);
  line(ctx, [[-82, 3], [-42, 14], [42, 14], [82, 3]], LW * 0.7);
  for (const x of [-60, -30, 0, 30, 60]) line(ctx, [[x, 10], [x, 22]], 2, 'rgba(0,0,0,0.18)');
  // the ribbed neckline
  ctx.save(); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-42, -246); ctx.quadraticCurveTo(0, -212, 42, -246);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 12 + LW * 2; ctx.stroke();
  ctx.strokeStyle = PAL.cuff; ctx.lineWidth = 12; ctx.stroke();
  ctx.restore();
  // a Clapper pin on the chest
  ctx.save(); ctx.translate(46, -176); ctx.rotate(-0.12);
  inked(ctx, P('M -17 -6 h 34 v 24 h -34 Z'), '#1B2330', 2.5);
  inked(ctx, P('M -17 -15 h 34 v 8 h -34 Z'), PAL.tie, 2.5);
  ctx.restore();
}

function drawNeck(ctx) {
  const n = P('M -24 22 L -24 -34 Q 0 -44 24 -34 L 24 22 Z');
  ctx.fillStyle = PAL.skin; ctx.fill(n);
  within(ctx, n, () => { ctx.fillStyle = PAL.skinShadow; ctx.fillRect(-30, -50, 60, 26); ctx.fillRect(-30, -50, 16, 80); });
  inked(ctx, n);
}

const arm = (fore, len, flen) => (ctx, pose) => drawLimb(ctx, len, flen, pose[`${fore}.r`] ?? 0, 50, 42, PAL.top, PAL.cuff);
const leg = (shin, len, slen) => (ctx, pose) => drawLimb(ctx, len, slen, pose[`${shin}.r`] ?? 0, 64, 56, PAL.pants, null);

function shoe(side) {
  return ctx => {
    ctx.save(); ctx.scale(side, 1);
    const body = P('M -38 10 C -40 -8 -20 -14 8 -14 C 38 -14 56 0 56 16 C 56 30 40 36 8 36 C -24 36 -38 28 -38 10 Z');
    ctx.fillStyle = PAL.shoe; ctx.fill(body);
    within(ctx, body, () => { ctx.fillStyle = PAL.shoeShadow; ctx.fillRect(-50, 16, 120, 8); ctx.fillStyle = PAL.sole; ctx.fillRect(-50, 24, 120, 20); });
    inked(ctx, body);
    line(ctx, [[-36, 24], [54, 24]], 2.5);
    ctx.restore();
  };
}

// Toon hands, four fingers, along +y from the wrist. form: 0 open, 1 pointing, 2 fist, 3 thumbs up,
// 4 relaxed. side -1 is the left hand.
function hand(side, key) {
  const fingers = (ctx, list, palm) => {
    for (const pass of [0, 1]) {
      const w = pass ? 0 : LW * 2;
      ctx.strokeStyle = pass ? PAL.skin : PAL.ink; ctx.fillStyle = ctx.strokeStyle;
      for (const [x, y, len, fw, r] of list) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(r);
        ctx.lineWidth = fw + w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke();
        ctx.restore();
      }
      if (palm) {
        ctx.lineWidth = w || 0.01; ctx.lineJoin = 'round';
        const p = new Path2D(); p.roundRect(-27, palm[0], 54, palm[1], 20);
        if (w) ctx.stroke(p);
        ctx.fill(p);
      }
    }
  };
  return (ctx, pose) => {
    const form = Math.round(pose[`${key}.form`] ?? 0);
    ctx.save(); ctx.scale(side, 1);
    if (form === 0) fingers(ctx, [[-17, 44, 32, 15, 0.16], [-5, 46, 38, 15, 0.04], [8, 46, 36, 15, -0.08], [24, 16, 32, 16, -0.95]], [0, 56]);
    else if (form === 1) fingers(ctx, [[-14, 44, 50, 16, -0.02], [24, 18, 24, 16, -1.3]], [0, 58]);
    else if (form === 2) fingers(ctx, [[21, 22, 18, 17, -1.6]], [0, 62]);
    else if (form === 3) fingers(ctx, [[20, 28, 34, 17, -2.6]], [0, 60]);
    else fingers(ctx, [[-14, 46, 30, 15, 0.05], [-2, 48, 34, 15, 0], [10, 47, 31, 15, -0.05], [22, 18, 26, 16, -0.7]], [0, 56]);
    if (form === 2 || form === 3) for (const x of [-12, 0, 12]) line(ctx, [[x, 44], [x, 58]], 2.2);   // knuckles
    ctx.restore();
  };
}

// ---------- hair ----------
const HAIR_BACK = P('M 0 -312 C 100 -312 162 -250 162 -158 C 162 -110 156 -78 142 -58 C 130 -44 112 -52 112 -78 L 112 -150 L -112 -150 L -112 -78 C -112 -52 -130 -44 -142 -58 C -156 -78 -162 -110 -162 -158 C -162 -250 -100 -312 0 -312 Z');
const FRINGE = P('M -136 -166 C -148 -264 -64 -308 12 -304 C 96 -300 148 -254 140 -176 C 130 -206 104 -228 72 -236 C 50 -204 2 -186 -48 -194 C -86 -198 -116 -184 -136 -166 Z');
const FRINGE_SHADE = P('M -140 -160 C -148 -250 -100 -290 -60 -300 C -96 -270 -110 -220 -104 -180 Z');
const FRINGE_LIGHT = P('M -56 -286 C -16 -300 42 -298 82 -278 C 50 -284 0 -286 -38 -276 C -50 -274 -60 -278 -56 -286 Z');
const turnOf = pose => Math.sin(clamp(pose['head.turn'] ?? 0, -1, 1) * 0.5);

function drawHairBack(ctx, pose) {
  ctx.save(); ctx.translate(-turnOf(pose) * 10, 0);
  inked(ctx, HAIR_BACK, PAL.hairShadow);
  ctx.restore();
}
function drawFringe(ctx, pose) {
  ctx.save(); ctx.translate(turnOf(pose) * 24, 0);
  ctx.fillStyle = PAL.hair; ctx.fill(FRINGE);
  within(ctx, FRINGE, () => { ctx.fillStyle = PAL.hairShadow; ctx.fill(FRINGE_SHADE); ctx.fillStyle = PAL.hairLight; ctx.fill(FRINGE_LIGHT); });
  inked(ctx, FRINGE);
  ctx.globalAlpha = 0.5;
  line(ctx, [[20, -292], [-10, -250], [-40, -210]], 2.5);                         // a couple of strands
  line(ctx, [[70, -270], [60, -246]], 2.5);
  ctx.restore();
}
function drawTail(ctx) {
  const tail = P('M -20 0 C -46 60 -44 140 -14 196 C -2 216 26 212 30 190 C 16 196 6 186 12 170 C 40 110 36 44 20 0 Z');
  ctx.fillStyle = PAL.hair; ctx.fill(tail);
  within(ctx, tail, () => { ctx.fillStyle = PAL.hairShadow; ctx.fillRect(-60, 0, 44, 230); ctx.fillStyle = PAL.hairLight; ctx.fillRect(8, 20, 6, 110); });
  inked(ctx, tail);
  inked(ctx, P('M -22 -8 h 44 v 16 h -44 Z'), PAL.tie, 3);
}

// ---------- the face ----------
// The face stretches: the jaw drops with a wide-open mouth, pulling the chin down.
function facePath(jaw) {
  const p = new Path2D();
  p.moveTo(0, -274);
  p.bezierCurveTo(80, -274, 130, -222, 130, -150);
  p.bezierCurveTo(130, -86 + jaw * 0.3, 100, -26 + jaw, 0, -8 + jaw);
  p.bezierCurveTo(-100, -26 + jaw, -130, -86 + jaw * 0.3, -130, -150);
  p.bezierCurveTo(-130, -222, -80, -274, 0, -274);
  p.closePath();
  return p;
}

const v = (pose, k, d = 0) => pose[k] ?? d;
function eye(ctx, pose, s) {
  const S = s < 0 ? 'L' : 'R';
  const open = clamp(v(pose, 'eyes.open', 1) * v(pose, `eye${S}.open`, 1), 0, 1.5);
  const cover = clamp(Math.max(v(pose, 'eyes.blink'), v(pose, 'lids.drop') + v(pose, `lid${S}.drop`), 1 - Math.min(open, 1)), 0, 1);
  const slant = clamp(v(pose, 'lids.slant') + v(pose, `lid${S}.slant`), -1, 1), squint = clamp(v(pose, 'eyes.squint'));
  const big = Math.max(1, open), rx = 30 * (1 + (big - 1) * 0.35), ry = 37 * big;
  const gx = v(pose, 'eyes.x') * 10, gy = v(pose, 'eyes.y') * 10, pupil = v(pose, 'eyes.pupil', 1);
  const white = P(`M ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0 Z`);
  // the upper lid's edge, slanting down towards the nose when angry, away from it when sad
  const inner = -s * rx, outer = s * rx;
  const lidY = -ry + 2 * ry * cover, tilt = slant * 14 * (1 - cover * 0.6);
  const yIn = lidY + tilt, yOut = lidY - tilt * 0.4;
  const low = ry - 2 * ry * squint * 0.5;
  ctx.fillStyle = PAL.eye; ctx.fill(white);
  within(ctx, white, () => {
    ctx.fillStyle = PAL.irisShadow; ctx.beginPath(); ctx.arc(gx, gy + 4, 19, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.iris; ctx.beginPath(); ctx.arc(gx, gy + 6, 16, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.pupil; ctx.beginPath(); ctx.arc(gx, gy + 4, 9 * pupil, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(gx + 6, gy - 4, 4.5, 0, TAU); ctx.fill();
    // lids, in skin, over the eye
    ctx.fillStyle = PAL.skin;
    ctx.beginPath(); ctx.moveTo(inner * 1.2, -ry - 4); ctx.lineTo(outer * 1.2, -ry - 4); ctx.lineTo(outer * 1.2, yOut); ctx.quadraticCurveTo(0, (yIn + yOut) / 2 + 6 * (1 - cover), inner * 1.2, yIn); ctx.fill();
    ctx.beginPath(); ctx.moveTo(inner * 1.2, ry + 4); ctx.lineTo(outer * 1.2, ry + 4); ctx.lineTo(outer * 1.2, low + squint * 6); ctx.quadraticCurveTo(0, low - squint * 26, inner * 1.2, low + squint * 6); ctx.fill();
    // the eye's outline, only between the lids, where the eye shows
    const shows = new Path2D();
    shows.moveTo(inner * 1.2, yIn); shows.quadraticCurveTo(0, (yIn + yOut) / 2 + 6 * (1 - cover), outer * 1.2, yOut);
    shows.lineTo(outer * 1.2, low + squint * 6); shows.quadraticCurveTo(0, low - squint * 26, inner * 1.2, low + squint * 6); shows.closePath();
    ctx.clip(shows);
    ctx.lineWidth = LW * 0.9; ctx.strokeStyle = PAL.ink; ctx.stroke(white);
  });
  // the upper lid line, heavy like lashes, and a flick at the outer corner
  ctx.save(); ctx.beginPath(); ctx.rect(-rx - 12, -ry - 30, rx * 2 + 24, ry * 2 + 50); ctx.clip();
  line(ctx, [[inner, yIn], [0, (yIn + yOut) / 2 + 6 * (1 - cover) - 2], [outer, yOut]], LW * 1.7);
  if (cover < 0.95) line(ctx, [[outer * 0.92, yOut], [outer * 1.22, yOut - 10]], LW * 1.3);
  if (squint > 0.12) line(ctx, [[inner * 0.9, low + squint * 6], [0, low - squint * 20], [outer * 0.9, low + squint * 6]], LW * 0.9);
  ctx.restore();
}

function brow(ctx, pose, s) {
  const S = s < 0 ? 'L' : 'R';
  const up = (v(pose, 'brows.up') + v(pose, `brow${S}.up`)) * 14;
  const slant = clamp(v(pose, 'brows.in') + v(pose, `brow${S}.slant`), -1.2, 1.2);    // + angry, - worried
  ctx.save(); ctx.translate(0, -202 - up); ctx.rotate(s * (0.1 - slant * 0.32));
  ctx.lineCap = 'round';
  const path = P('M -26 4 Q 0 -8 26 2');
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 11 + LW * 1.4; ctx.stroke(path);
  ctx.strokeStyle = PAL.hair; ctx.lineWidth = 11; ctx.stroke(path);
  ctx.restore();
}

// The mouth: an ink line when closed; open, a dark mouth with upper teeth, lower teeth when wide,
// gums on a big laugh, and a tongue. Corners lift with a smile, separately for a smirk.
function drawMouth(ctx, pose, jaw) {
  const m = k => v(pose, `mouth.${k}`);
  const open = clamp(m('open') + v(pose, 'jaw') * 0.8), round = clamp(m('round')), wide = clamp(m('wide') || 0.5);
  const smile = v(pose, 'mood.smile', 0.35);
  const cx = m('shift') * 16, cy = -74 + jaw * 0.45;
  let hw = lerp(19, 46, wide) * (1 + Math.max(0, smile) * 0.18);
  hw = lerp(hw, 13 + open * 11, round * 0.85);
  const lift = s => (smile + m(s < 0 ? 'cornerL' : 'cornerR')) * 11 * (1 - round * 0.7);
  const L = [cx - hw, cy - lift(-1)], R = [cx + hw, cy - lift(1)];
  if (open < 0.06) {
    const sag = 3 + (smile + (m('cornerL') + m('cornerR')) / 2) * 9;
    ctx.beginPath(); ctx.moveTo(...L); ctx.quadraticCurveTo(cx, cy + sag, ...R);
    ctx.lineWidth = LW * (1.1 + m('press') * 0.5); ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round'; ctx.stroke();
    for (const [x, y, s] of [[...L, -1], [...R, 1]]) if (Math.abs(smile) > 0.3 || m('press') > 0.5) line(ctx, [[x - s * 2, y - 5], [x + s * 4, y + 4]], LW * 0.7);
    return;
  }
  const h = 8 + open * 58, top = cy - h * 0.2;
  const shape = new Path2D();
  shape.moveTo(...L);
  shape.bezierCurveTo(cx - hw * 0.45, top - h * 0.1, cx + hw * 0.45, top - h * 0.1, ...R);
  shape.bezierCurveTo(cx + hw * (0.95 - round * 0.35), cy + h * 1.02, cx - hw * (0.95 - round * 0.35), cy + h * 1.02, ...L);
  shape.closePath();
  ctx.fillStyle = PAL.mouth; ctx.fill(shape);
  within(ctx, shape, () => {
    const teeth = m('teeth'), tuck = m('tuck');
    if (open > 0.7 && smile > 0.5) { ctx.fillStyle = PAL.gum; ctx.fillRect(cx - hw, top - 20, hw * 2, 16); }  // gums on a big laugh
    if (teeth > 0.05) {
      const th = 9 + h * (0.18 + tuck * 0.3) * teeth;
      ctx.fillStyle = PAL.teeth; ctx.fillRect(cx - hw, top - 14, hw * 2, th + 14);
      line(ctx, [[cx - hw, top + th], [cx + hw, top + th]], 2.2);
      if (open > 0.55) {                                  // the lower teeth show on a wide mouth
        ctx.fillStyle = PAL.teeth; ctx.fillRect(cx - hw * 0.7, cy + h * 0.72, hw * 1.4, 14);
        line(ctx, [[cx - hw * 0.7, cy + h * 0.72], [cx + hw * 0.7, cy + h * 0.72]], 2);
      }
    }
    const tongue = m('tongue');
    ctx.fillStyle = PAL.tongue;
    ctx.beginPath(); ctx.ellipse(cx + hw * 0.08, cy + h * 0.92 - tongue * h * 0.35, hw * 0.68, h * 0.38, 0, 0, TAU); ctx.fill();
    line(ctx, [[cx + hw * 0.08, cy + h * 0.66 - tongue * h * 0.35], [cx + hw * 0.08, cy + h * 0.8 - tongue * h * 0.35]], 2, 'rgba(120,20,40,0.5)');
    if (tuck > 0.05) { ctx.fillStyle = PAL.lip; ctx.beginPath(); ctx.ellipse(cx, cy + h * 1.05, hw, h * 0.66 * tuck, 0, 0, TAU); ctx.fill(); }
  });
  inked(ctx, shape, null, LW * 1.05);
}

const FACE_R = 115;
function drawHead(ctx, pose) {
  const th = clamp(v(pose, 'head.turn'), -1, 1) * 0.5, c = Math.cos(th), sn = Math.sin(th);
  const jaw = clamp(v(pose, 'mouth.open') * 0.55 + v(pose, 'jaw'), 0, 1.4) * 30;
  const at = (x, depth = 1) => x * c + sn * FACE_R * depth;
  const width = x => Math.cos(th + x / FACE_R) / Math.cos(x / FACE_R);
  const feature = (x, y, depth, fn) => { ctx.save(); ctx.translate(at(x, depth), y); ctx.scale(width(x), 1); fn(); ctx.restore(); };
  // ears: the one on the side she turns towards tucks away
  for (const s of [-1, 1]) {
    const hide = s * sn > 0 ? 1 - Math.min(1, Math.abs(sn) * 2.4) : 1;
    if (hide <= 0.02) continue;
    ctx.save(); ctx.translate(s * 126 * c, -142); ctx.scale(hide * s, 1);
    const ear = P('M -8 -30 C 20 -34 30 -6 22 14 C 16 28 2 32 -8 26 Z');
    inked(ctx, ear, PAL.skin);
    line(ctx, [[2, -14], [12, -2], [6, 12]], 2.6);
    ctx.restore();
  }
  const face = facePath(jaw);
  ctx.fillStyle = PAL.skinShadow; ctx.fill(face);
  within(ctx, face, () => {                               // lit from the upper right: a shadow down the left
    ctx.fillStyle = PAL.skin; ctx.beginPath(); ctx.ellipse(34 + sn * 30, -150, 150, 190, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.blush;
    for (const s of [-1, 1]) { const x = at(s * 82, 0.7); ctx.beginPath(); ctx.ellipse(x, -92 + jaw * 0.2, 22 * width(s * 82), 13, 0, 0, TAU); ctx.fill(); }
  });
  inked(ctx, face);
  for (const s of [-1, 1]) { feature(s * 50, -138, 0.85, () => eye(ctx, pose, s)); feature(s * 50, 0, 0.9, () => brow(ctx, pose, s)); }
  const scrunch = v(pose, 'nose.scrunch');
  feature(0, 0, 1.25, () => {                             // the nose sticks out furthest
    line(ctx, [[-4, -110 - scrunch * 4], [4 + sn * 8, -98], [12, -103]], LW * 0.9);
    if (scrunch > 0.2) for (const s of [-1, 1]) line(ctx, [[s * 16, -116], [s * 24, -110]], 2.4);
  });
  feature(0, 0, 1, () => drawMouth(ctx, pose, jaw));
}

// ---------- the rig ----------
const ARM = 134, FORE = 124, THIGH = 158, SHIN = 160;
export const pip = new Puppet([
  { name: 'hips', at: [0, -346] },
  { name: 'tail', parent: 'head', at: [112, -248], z: -2, draw: drawTail },
  { name: 'hairBack', parent: 'head', at: [0, 0], z: -1, draw: drawHairBack },
  { name: 'legL', parent: 'hips', at: [-42, -4], len: THIGH, z: 0, draw: leg('shinL', THIGH, SHIN) },
  { name: 'shinL', parent: 'legL', at: [0, THIGH], len: SHIN, z: 0 },
  { name: 'footL', parent: 'shinL', at: [0, SHIN], z: 0.5, draw: shoe(-1) },
  { name: 'legR', parent: 'hips', at: [42, -4], len: THIGH, z: 0, draw: leg('shinR', THIGH, SHIN) },
  { name: 'shinR', parent: 'legR', at: [0, THIGH], len: SHIN, z: 0 },
  { name: 'footR', parent: 'shinR', at: [0, SHIN], z: 0.5, draw: shoe(1) },
  { name: 'torso', parent: 'hips', at: [0, 0], z: 2, draw: drawTorso },
  { name: 'neck', parent: 'torso', at: [0, -236], z: 1.5, draw: drawNeck },
  { name: 'head', parent: 'neck', at: [0, -28], z: 4, draw: drawHead },
  { name: 'fringe', parent: 'head', at: [0, 0], z: 5, draw: drawFringe },
  { name: 'armL', parent: 'torso', at: [-88, -212], len: ARM, z: 3, draw: arm('foreL', ARM, FORE) },
  { name: 'foreL', parent: 'armL', at: [0, ARM], len: FORE, z: 3 },
  { name: 'handL', parent: 'foreL', at: [0, FORE - 4], z: 6, draw: hand(-1, 'handL') },
  { name: 'armR', parent: 'torso', at: [88, -212], len: ARM, z: 3, draw: arm('foreR', ARM, FORE) },
  { name: 'foreR', parent: 'armR', at: [0, ARM], len: FORE, z: 3 },
  { name: 'handR', parent: 'foreR', at: [0, FORE - 4], z: 6, draw: hand(1, 'handR') },
]);

export const REST = {
  'armL.r': 0.13, 'foreL.r': -0.14, 'armR.r': -0.13, 'foreR.r': 0.14, 'handL.form': 4, 'handR.form': 4,
  'legL.r': 0.03, 'legR.r': -0.03, 'footL.r': -0.03, 'footR.r': 0.03,
  'tail.r': -0.45, 'mood.smile': 0.3, 'head.s': 1.12,
};

// Body poses (partial: only the keys they change).
export const POSES = {
  wave: { 'armR.r': -2.5, 'foreR.r': -0.5, 'handR.form': 0 },
  point: { 'armR.r': -1.45, 'foreR.r': -0.1, 'handR.form': 1 },
  pointL: { 'armL.r': 1.45, 'foreL.r': 0.1, 'handL.form': 1 },
  shrug: { 'armL.r': 0.6, 'foreL.r': 1.25, 'armR.r': -0.6, 'foreR.r': -1.25, 'handL.form': 0, 'handR.form': 0, 'head.r': 0.08 },
  cheer: { 'armL.r': 2.7, 'foreL.r': 0.3, 'armR.r': -2.7, 'foreR.r': -0.3, 'handL.form': 2, 'handR.form': 2 },
  thumbsUp: { 'armR.r': -0.7, 'foreR.r': -1.5, 'handR.form': 3 },
  rest: { 'armL.r': 0.13, 'foreL.r': -0.14, 'armR.r': -0.13, 'foreR.r': 0.14, 'handL.form': 4, 'handR.form': 4 },
};

// Faces (partial poses), to key with choreo like anything else, and to blend.
const NEUTRAL = {
  'eyes.open': 1, 'eyes.squint': 0, 'eyes.pupil': 1, 'lids.drop': 0, 'lids.slant': 0, 'lidL.drop': 0, 'lidR.drop': 0,
  'lidL.slant': 0, 'lidR.slant': 0, 'brows.up': 0, 'brows.in': 0, 'browL.up': 0, 'browR.up': 0, 'browL.slant': 0, 'browR.slant': 0,
  'mood.smile': 0.3, 'mouth.cornerL': 0, 'mouth.cornerR': 0, 'mouth.shift': 0, 'jaw': 0, 'nose.scrunch': 0,
};
export const EXPR = {
  neutral: NEUTRAL,
  happy: { ...NEUTRAL, 'mood.smile': 0.9, 'eyes.squint': 0.35, 'brows.up': 0.25 },
  laugh: { ...NEUTRAL, 'mood.smile': 1, 'eyes.squint': 1, 'eyes.blink': 0.55, 'brows.up': 0.4, 'jaw': 0.5 },
  surprised: { ...NEUTRAL, 'brows.up': 1, 'eyes.open': 1.25, 'eyes.pupil': 0.75, 'mood.smile': 0, 'jaw': 0.35 },
  shocked: { ...NEUTRAL, 'brows.up': 1.3, 'brows.in': -0.4, 'eyes.open': 1.4, 'eyes.pupil': 0.45, 'mood.smile': -0.4, 'jaw': 0.8 },
  skeptical: { ...NEUTRAL, 'browL.up': 0.9, 'browR.up': -0.5, 'browR.slant': 0.5, 'lidR.drop': 0.35, 'lidL.drop': 0.08, 'mood.smile': 0, 'mouth.cornerL': -0.35, 'mouth.cornerR': 0.25, 'mouth.shift': 0.3 },
  smug: { ...NEUTRAL, 'lids.drop': 0.42, 'browL.up': 0.5, 'browR.up': 0.15, 'mood.smile': 0.5, 'mouth.cornerR': 0.55, 'mouth.cornerL': -0.2, 'mouth.shift': 0.25, 'eyes.pupil': 1.05 },
  angry: { ...NEUTRAL, 'brows.in': 1, 'lids.slant': 0.8, 'lids.drop': 0.18, 'eyes.pupil': 0.8, 'mood.smile': -0.7, 'nose.scrunch': 0.4 },
  sad: { ...NEUTRAL, 'brows.in': -0.9, 'brows.up': 0.2, 'lids.slant': -0.7, 'lids.drop': 0.3, 'mood.smile': -0.6, 'eyes.y': 0.4 },
  worried: { ...NEUTRAL, 'brows.in': -0.8, 'brows.up': 0.5, 'eyes.open': 1.1, 'mood.smile': -0.25, 'mouth.cornerL': -0.3, 'eyes.pupil': 0.85 },
  disgusted: { ...NEUTRAL, 'brows.in': 0.6, 'browL.up': -0.2, 'lidL.drop': 0.35, 'mood.smile': -0.5, 'mouth.cornerL': -0.6, 'mouth.shift': -0.35, 'nose.scrunch': 1 },
  delighted: { ...NEUTRAL, 'mood.smile': 1, 'eyes.open': 1.15, 'eyes.pupil': 1.15, 'brows.up': 0.7, 'jaw': 0.2 },
  deadpan: { ...NEUTRAL, 'lids.drop': 0.5, 'mood.smile': 0, 'brows.up': -0.2 },
};

// How each joint follows its choreography: the shoulder leads, the elbow lags it, the hand lags
// that, so moves overlap down the arm, overshoot a little and settle.
const FEEL = {
  arm: { stiffness: 230, damping: 19 }, fore: { stiffness: 170, damping: 13 }, hand: { stiffness: 130, damping: 10 },
  head: { stiffness: 150, damping: 15 }, body: { stiffness: 100, damping: 14 },
};
const JOINTS = {
  'armL.r': FEEL.arm, 'armR.r': FEEL.arm, 'foreL.r': FEEL.fore, 'foreR.r': FEEL.fore, 'handL.r': FEEL.hand, 'handR.r': FEEL.hand,
  'head.r': FEEL.head, 'head.turn': FEEL.head, 'torso.r': FEEL.body, 'hips.x': FEEL.body,
};

// Pip at time t. On twos by default (each drawing held two frames, as TV animation is); her joints
// follow the choreography on springs; she breathes, shifts her weight, blinks and glances; her head
// follows her eyes; her mouth follows the narration; and her ponytail swings behind her head.
export function pose(t, moves, { speaker, extra, twos = true, still = false, springy = !still, fps = 30 } = {}) {
  if (twos) t = Math.floor((t * fps) / 2 + 1e-6) * 2 / fps;
  const chore = u => { const q = choreo(u, REST, moves); q['head.turn'] = v(q, 'head.turn') + v(q, 'eyes.x') * 0.45; return q; };
  const base = u => (extra ? add(chore(u), extra(u)) : chore(u));
  let p = chore(t);
  if (springy) Object.assign(p, springs('pip2.joints', t, chore, JOINTS));
  if (extra) p = add(p, extra(t));
  if (!still) p = add(p, { 'armL.r': 0.02 * Math.sin(t * 1.3 + 1), 'armR.r': 0.02 * Math.sin(t * 1.1 + 2), 'foreL.r': 0.028 * Math.sin(t * 1.7), 'foreR.r': 0.028 * Math.sin(t * 1.5 + 1) });
  const br = breath(t, 3), sw = still ? 0 : sway(t, 3);
  p = add(p, { 'torso.sy': 1 + 0.009 * br, 'head.y': -1.5 * br, 'hips.x': sw * 4, 'torso.r': sw * 0.012, 'head.r': -sw * 0.02 });
  const g = glance(t, 3);
  p['eyes.x'] = v(p, 'eyes.x') + g[0] * 0.3;
  p['eyes.y'] = v(p, 'eyes.y') + g[1] * 0.3;
  p['eyes.blink'] = Math.max(v(p, 'eyes.blink'), blink(t, 3));
  const mo = lipsync(t, { speaker });
  for (const [k, val] of Object.entries(mo)) p[`mouth.${k}`] = val;
  const talk = loudness(t) * (mo.open > 0.05 ? 1 : 0);
  p['head.r'] += Math.sin(t * 9) * 0.014 * talk;
  p['head.y'] += -talk * 3;
  p['browL.up'] = v(p, 'browL.up') + talk * 0.2;
  p['browR.up'] = v(p, 'browR.up') + talk * 0.2;
  const headSwing = u => { const q = base(u); return v(q, 'head.r') * 2.2 + v(q, 'torso.r') * 2 + v(q, 'hips.x') / 60 + v(q, 'hips.y') / 90; };
  const swing = clamp(lag('pip2.tail', t, headSwing, { preset: 'wobbly' }), -1.3, 1.3);
  p['tail.r'] = v(p, 'tail.r', -0.45) - (v(p, 'head.r') + v(p, 'torso.r')) - swing * 0.9;
  return p;
}
