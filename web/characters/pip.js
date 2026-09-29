// Pip, a toon stock character: import { pip, pose, EXPR, POSES, REST } from '/@kit/characters/pip.js'.
// About 930 px tall, origin on the floor between her feet; L and R are the screen's left and right.
// Made from toon.js, so she has its whole face and body (see there for the pose keys), turns her
// head (head.turn) and her body (body.turn) towards 3/4, and has a ponytail that swings.
import { clamp, TAU } from '../core.js';
import { Puppet } from '../puppet.js';
import { lag } from '../spring.js';
import {
  brow, expressions, eye, hand, headTurn, inked, INK, limb, line, LW, mouth, NEUTRAL, toonPose, turningShoe, turningTorso, v, within,
} from '../toon.js';

export const PAL = {
  skin: '#F8CBA6', skinShadow: '#E6A784', blush: '#F4A08F',
  hair: '#3B2B57', hairShadow: '#291D40', hairLight: '#5B4A84',
  top: '#2CB4A4', topShadow: '#1F8E82', cuff: '#1A7469',
  pants: '#35405F', shoe: '#FFFFFF', shoeShadow: '#DADDE4', sole: '#FF8A1F',
  mouth: '#4A1427', tongue: '#EE7082', gum: '#E07484', lip: '#D96F68', tie: '#FF8A1F',
};
const P = s => new Path2D(s);

// ---------- body ----------
const TORSO = P('M -82 12 C -86 -60 -94 -140 -100 -194 C -104 -226 -86 -243 -52 -247 L -38 -247 Q 0 -216 38 -247 L 52 -247 C 86 -243 104 -226 100 -194 C 94 -140 86 -60 82 12 C 42 26 -42 26 -82 12 Z');
function drawTorso(ctx, pose) {
  const T = turningTorso(ctx, pose, {
    path: TORSO, a: 100, b: 62, fill: PAL.top, shadow: PAL.topShadow,
    decorate: (g, T) => {
      g.fillStyle = PAL.cuff; g.fillRect(-110, 2, 220, 30);                                   // the hem
      line(g, [[-82 * T.k, 3], [-42 * T.k, 14], [42 * T.k, 14], [82 * T.k, 3]], LW * 0.7);
      for (const x of [-60, -30, 0, 30, 60]) line(g, [[T.front(x), 10], [T.front(x), 22]], 2, 'rgba(0,0,0,0.18)');
    },
  });
  // the ribbed neckline, round the front of the neck
  ctx.save(); ctx.translate(T.s * 30, 0); ctx.scale(0.75 + 0.25 * T.c, 1); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-42, -246); ctx.quadraticCurveTo(0, -212, 42, -246);
  ctx.strokeStyle = INK; ctx.lineWidth = 12 + LW * 2; ctx.stroke();
  ctx.strokeStyle = PAL.cuff; ctx.lineWidth = 12; ctx.stroke();
  ctx.restore();
  // a Clapper pin on the chest, which comes round with the body, and foreshortens
  const face = Math.cos(Math.asin(0.46) + T.th);
  if (face > 0.12) {
    ctx.save(); ctx.translate(T.front(46), -176); ctx.rotate(-0.12); ctx.scale(face / Math.cos(Math.asin(0.46)), 1);
    inked(ctx, P('M -17 -6 h 34 v 24 h -34 Z'), '#1B2330', 2.5);
    inked(ctx, P('M -17 -15 h 34 v 8 h -34 Z'), PAL.tie, 2.5);
    ctx.restore();
  }
}

function drawNeck(ctx) {
  const n = P('M -24 22 L -24 -34 Q 0 -44 24 -34 L 24 22 Z');
  ctx.fillStyle = PAL.skin; ctx.fill(n);
  within(ctx, n, () => { ctx.fillStyle = PAL.skinShadow; ctx.fillRect(-30, -50, 60, 26); ctx.fillRect(-30, -50, 16, 80); });
  inked(ctx, n);
}

const arm = (fore, a, b) => (ctx, pose) => limb(ctx, a, b, v(pose, `${fore}.r`), 50, 42, PAL.top, PAL.cuff);
const leg = (shin, a, b) => (ctx, pose) => limb(ctx, a, b, v(pose, `${shin}.r`), 64, 56, PAL.pants);

// ---------- hair ----------
const HAIR_BACK = P('M 0 -312 C 100 -312 162 -250 162 -158 C 162 -110 156 -78 142 -58 C 130 -44 112 -52 112 -78 L 112 -150 L -112 -150 L -112 -78 C -112 -52 -130 -44 -142 -58 C -156 -78 -162 -110 -162 -158 C -162 -250 -100 -312 0 -312 Z');
const FRINGE = P('M -136 -166 C -148 -264 -64 -308 12 -304 C 96 -300 148 -254 140 -176 C 130 -206 104 -228 72 -236 C 50 -204 2 -186 -48 -194 C -86 -198 -116 -184 -136 -166 Z');
const FRINGE_SHADE = P('M -140 -160 C -148 -250 -100 -290 -60 -300 C -96 -270 -110 -220 -104 -180 Z');
const FRINGE_LIGHT = P('M -56 -286 C -16 -300 42 -298 82 -278 C 50 -284 0 -286 -38 -276 C -50 -274 -60 -278 -56 -286 Z');

function drawHairBack(ctx, pose) {
  ctx.save(); ctx.translate(-headTurn(pose).s * 10, 0);
  inked(ctx, HAIR_BACK, PAL.hairShadow);
  ctx.restore();
}
function drawFringe(ctx, pose) {
  ctx.save(); ctx.translate(headTurn(pose).s * 24, 0);
  ctx.fillStyle = PAL.hair; ctx.fill(FRINGE);
  within(ctx, FRINGE, () => { ctx.fillStyle = PAL.hairShadow; ctx.fill(FRINGE_SHADE); ctx.fillStyle = PAL.hairLight; ctx.fill(FRINGE_LIGHT); });
  inked(ctx, FRINGE);
  ctx.globalAlpha = 0.5;
  line(ctx, [[20, -292], [-10, -250], [-40, -210]], 2.5);
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
// The face stretches: the jaw drops with a wide-open mouth, pulling the chin down. Turned (s), the
// chin comes round towards where she looks, and the cheek on the far side fills out.
function facePath(jaw, s = 0) {
  const cx = s * 30, p = new Path2D();
  p.moveTo(0, -274);
  p.bezierCurveTo(80, -274, 130, -222, 130, -150);
  p.bezierCurveTo(130, -86 + jaw * 0.3, 100 + cx * 0.5, -26 + jaw, cx, -8 + jaw);
  p.bezierCurveTo(-100 + cx * 0.5, -26 + jaw, -130, -86 + jaw * 0.3, -130, -150);
  p.bezierCurveTo(-130, -222, -80, -274, 0, -274);
  p.closePath();
  return p;
}
const EYE = { skin: PAL.skin }, BROW = { color: PAL.hair }, MOUTH = { pal: PAL };

function drawHead(ctx, pose) {
  const { c, s, at, width } = headTurn(pose);
  const jaw = clamp(v(pose, 'mouth.open') * 0.55 + v(pose, 'jaw'), 0, 1.4) * 30;
  const feature = (x, y, depth, fn) => { ctx.save(); ctx.translate(at(x, depth), y); ctx.scale(width(x), 1); fn(); ctx.restore(); };
  for (const side of [-1, 1]) {                           // the ear on the side she turns towards tucks away
    const hide = side * s > 0 ? 1 - Math.min(1, Math.abs(s) * 2.4) : 1;
    if (hide <= 0.02) continue;
    ctx.save(); ctx.translate(side * 126 * c, -142); ctx.scale(hide * side, 1);
    inked(ctx, P('M -8 -30 C 20 -34 30 -6 22 14 C 16 28 2 32 -8 26 Z'), PAL.skin);
    line(ctx, [[2, -14], [12, -2], [6, 12]], 2.6);
    ctx.restore();
  }
  const face = facePath(jaw, s);
  ctx.fillStyle = PAL.skinShadow; ctx.fill(face);
  within(ctx, face, () => {                               // lit from the upper right
    ctx.fillStyle = PAL.skin; ctx.beginPath(); ctx.ellipse(34 + s * 30, -150, 150, 190, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.blush;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(at(side * 82, 0.7), -92 + jaw * 0.2, 22 * width(side * 82), 13, 0, 0, TAU); ctx.fill(); }
  });
  inked(ctx, face);
  for (const side of [-1, 1]) {
    feature(side * 50, -138, 0.85, () => eye(ctx, pose, side, EYE));
    feature(side * 50, 0, 0.9, () => brow(ctx, pose, side, BROW));
  }
  const scrunch = v(pose, 'nose.scrunch');
  feature(0, 0, 1.25, () => {
    line(ctx, [[-4, -110 - scrunch * 4], [4 + s * 8, -98], [12, -103]], LW * 0.9);
    if (scrunch > 0.2) for (const side of [-1, 1]) line(ctx, [[side * 16, -116], [side * 24, -110]], 2.4);
  });
  feature(0, 0, 1, () => mouth(ctx, pose, jaw, MOUTH));
}

// ---------- the rig ----------
const ARM = 134, FORE = 124, THIGH = 158, SHIN = 160;
const SHOE = { upper: PAL.shoe, sole: PAL.sole, shade: PAL.shoeShadow };
export const pip = new Puppet([
  { name: 'hips', at: [0, -346] },
  { name: 'tail', parent: 'head', at: [112, -248], z: -2, draw: drawTail },
  { name: 'hairBack', parent: 'head', at: [0, 0], z: -1, draw: drawHairBack },
  { name: 'legL', parent: 'hips', at: [-42, -4], len: THIGH, z: 0, draw: leg('shinL', THIGH, SHIN) },
  { name: 'shinL', parent: 'legL', at: [0, THIGH], len: SHIN, z: 0 },
  { name: 'footL', parent: 'shinL', at: [0, SHIN], z: 0.5, draw: turningShoe(-1, SHOE) },
  { name: 'legR', parent: 'hips', at: [42, -4], len: THIGH, z: 0, draw: leg('shinR', THIGH, SHIN) },
  { name: 'shinR', parent: 'legR', at: [0, THIGH], len: SHIN, z: 0 },
  { name: 'footR', parent: 'shinR', at: [0, SHIN], z: 0.5, draw: turningShoe(1, SHOE) },
  { name: 'torso', parent: 'hips', at: [0, 0], z: 2, draw: drawTorso },
  { name: 'neck', parent: 'torso', at: [0, -236], z: 1.5, draw: drawNeck },
  { name: 'head', parent: 'neck', at: [0, -28], z: 4, draw: drawHead },
  { name: 'fringe', parent: 'head', at: [0, 0], z: 5, draw: drawFringe },
  { name: 'armL', parent: 'torso', at: [-88, -212], len: ARM, z: 5.5, draw: arm('foreL', ARM, FORE) },
  { name: 'foreL', parent: 'armL', at: [0, ARM], len: FORE, z: 5.5 },
  { name: 'handL', parent: 'foreL', at: [0, FORE - 4], z: 6, draw: hand(-1, 'handL', { skin: PAL.skin }) },
  { name: 'armR', parent: 'torso', at: [88, -212], len: ARM, z: 5.5, draw: arm('foreR', ARM, FORE) },
  { name: 'foreR', parent: 'armR', at: [0, ARM], len: FORE, z: 5.5 },
  { name: 'handR', parent: 'foreR', at: [0, FORE - 4], z: 6, draw: hand(1, 'handR', { skin: PAL.skin }) },
]);

export const REST = {
  'armL.r': 0.13, 'foreL.r': -0.14, 'armR.r': -0.13, 'foreR.r': 0.14, 'handL.form': 4, 'handR.form': 4,
  'legL.r': 0.03, 'legR.r': -0.03, 'footL.r': -0.03, 'footR.r': 0.03,
  'tail.r': -0.45, 'mood.smile': 0.3, 'head.s': 1.12,
};

export const POSES = {
  wave: { 'armR.r': -2.5, 'foreR.r': -0.5, 'handR.form': 0 },
  point: { 'armR.r': -1.45, 'foreR.r': -0.1, 'handR.form': 1 },
  pointL: { 'armL.r': 1.45, 'foreL.r': 0.1, 'handL.form': 1 },
  shrug: { 'armL.r': 0.6, 'foreL.r': 1.25, 'armR.r': -0.6, 'foreR.r': -1.25, 'handL.form': 0, 'handR.form': 0, 'head.r': 0.08 },
  cheer: { 'armL.r': 2.7, 'foreL.r': 0.3, 'armR.r': -2.7, 'foreR.r': -0.3, 'handL.form': 2, 'handR.form': 2 },
  thumbsUp: { 'armR.r': -0.7, 'foreR.r': -1.5, 'handR.form': 3 },
  rest: { 'armL.r': 0.13, 'foreL.r': -0.14, 'armR.r': -0.13, 'foreR.r': 0.14, 'handL.form': 4, 'handR.form': 4 },
};
export const EXPR = expressions(NEUTRAL);

// The ponytail hangs towards the floor and swings against how the head moves.
function ponytail(t, base, p) {
  const swingOf = u => { const q = base(u); return v(q, 'head.r') * 2.2 + v(q, 'torso.r') * 2 + v(q, 'hips.x') / 60 + v(q, 'hips.y') / 90 + v(q, 'head.turn') * 0.6; };
  const swing = clamp(lag('pip.tail', t, swingOf, { preset: 'wobbly' }), -1.3, 1.3);
  p['tail.r'] = v(p, 'tail.r', -0.45) - (v(p, 'head.r') + v(p, 'torso.r')) - swing * 0.9;
  // round the back of her head as she turns: facing right it swings in behind her head, facing left
  // it shows a little more
  const s = headTurn(p).s;
  p['tail.x'] = s > 0 ? -s * 170 : -s * 30;
  p['tail.r'] += s > 0 ? s * 0.9 : 0;
}

// Pip at time t: see toonPose in toon.js.
export const pose = toonPose({ rest: REST, id: 'pip', seed: 3, shoulder: 88, hip: 42, hair: ponytail });
