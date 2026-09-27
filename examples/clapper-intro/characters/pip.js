// Pip, the presenter. A puppet: origin on the floor between the feet, about 940 px tall, facing us.
// L and R are the screen's left and right. Light comes from the upper right.
import { clamp, lerp, TAU } from '/@kit/core.js';
import { add, choreo, Puppet } from '/@kit/puppet.js';
import { blink, breath, glance, sway } from '/@kit/life.js';
import { loudness, mouth } from '/@kit/lipsync.js';
import { lag, springs } from '/@kit/spring.js';

export const PAL = {
  skin: '#F5C9A6', skinShade: '#E2A883', skinDeep: '#C98B69', blush: 'rgba(238,110,100,0.28)',
  hair: '#2E2240', hairLight: '#4B3A64', hairShade: '#1E1530',
  top: '#23A89A', topShade: '#1A8479', topLight: '#3CC4B5', cuff: '#16706A',
  pants: '#2C3452', pantsShade: '#20263D', shoe: '#F4F4F2', shoeShade: '#D5D7DB', sole: '#FF8A1F',
  eye: '#FFFFFF', iris: '#3E6FB0', irisDark: '#264B80', pupil: '#161629', lash: '#221A30',
  lip: '#C9645E', mouthIn: '#5B1B28', teeth: '#FFFFFF', tongue: '#E8707C', tie: '#FF8A1F',
};

const P2 = s => new Path2D(s);

// ---------- body ----------
const TORSO = P2('M -82 12 C -86 -60 -94 -140 -100 -194 C -104 -226 -86 -243 -52 -247 L -38 -247 Q 0 -216 38 -247 L 52 -247 C 86 -243 104 -226 100 -194 C 94 -140 86 -60 82 12 C 42 26 -42 26 -82 12 Z');
const TORSO_SHADE = P2('M -82 12 C -86 -60 -94 -140 -100 -194 C -104 -226 -86 -243 -52 -247 L -30 -247 C -52 -200 -58 -110 -40 20 C -56 20 -70 17 -82 12 Z');

function drawTorso(ctx) {
  const g = ctx.createLinearGradient(-100, 0, 100, 0);
  g.addColorStop(0, PAL.topShade); g.addColorStop(0.45, PAL.top); g.addColorStop(1, PAL.topLight);
  ctx.fillStyle = g; ctx.fill(TORSO);
  ctx.fillStyle = 'rgba(0,40,40,0.18)'; ctx.fill(TORSO_SHADE);
  // the hem, and a ribbed collar
  ctx.fillStyle = PAL.cuff;
  ctx.beginPath(); ctx.moveTo(-82, 4); ctx.bezierCurveTo(-42, 18, 42, 18, 82, 4); ctx.lineTo(82, 14); ctx.bezierCurveTo(42, 28, -42, 28, -82, 14); ctx.fill();
  ctx.strokeStyle = PAL.cuff; ctx.lineWidth = 11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-42, -246); ctx.quadraticCurveTo(0, -212, 42, -246); ctx.stroke();
  // a Clapper pin on the chest
  ctx.save(); ctx.translate(44, -178); ctx.rotate(-0.12);
  ctx.fillStyle = '#1B2330'; ctx.beginPath(); ctx.roundRect(-17, -6, 34, 24, 4); ctx.fill();
  ctx.fillStyle = PAL.tie; ctx.beginPath(); ctx.roundRect(-17, -15, 34, 8, 2); ctx.fill();
  ctx.fillStyle = '#1B2330'; for (const x of [-9, 3]) { ctx.beginPath(); ctx.moveTo(x, -15); ctx.lineTo(x + 6, -15); ctx.lineTo(x + 2, -7); ctx.lineTo(x - 4, -7); ctx.fill(); }
  ctx.restore();
}

function drawNeck(ctx) {
  ctx.fillStyle = PAL.skinShade;
  ctx.beginPath(); ctx.roundRect(-25, -40, 50, 64, 14); ctx.fill();
  ctx.fillStyle = 'rgba(150,80,50,0.25)';
  ctx.beginPath(); ctx.ellipse(0, -36, 22, 10, 0, 0, TAU); ctx.fill();
}

// A limb along +y, from its pivot, `len` long and `w` wide, shaded across.
function limb(ctx, len, w, base, shade, light) {
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, shade); g.addColorStop(0.55, base); g.addColorStop(1, light || base);
  ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke();
}

const sleeve = len => ctx => limb(ctx, len, 50, PAL.top, PAL.topShade, PAL.topLight);
const foreSleeve = len => ctx => {
  limb(ctx, len - 8, 44, PAL.top, PAL.topShade, PAL.topLight);
  ctx.fillStyle = PAL.cuff; ctx.beginPath(); ctx.roundRect(-23, len - 22, 46, 18, 8); ctx.fill();
};
const crease = (ctx, len) => { ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(8, 10); ctx.lineTo(10, len - 6); ctx.stroke(); };
const thigh = len => ctx => { limb(ctx, len, 70, PAL.pants, PAL.pantsShade); crease(ctx, len); };
const shin = len => ctx => { limb(ctx, len, 62, PAL.pants, PAL.pantsShade); crease(ctx, len); };

function shoe(side) {
  return ctx => {
    ctx.save(); ctx.scale(side, 1);
    const body = new Path2D(); body.ellipse(8, 10, 46, 27, 0.06, 0, TAU);
    ctx.fillStyle = PAL.shoe; ctx.fill(body);
    ctx.save(); ctx.clip(body);
    ctx.fillStyle = PAL.shoeShade; ctx.fillRect(-50, 12, 110, 10);
    ctx.fillStyle = PAL.sole; ctx.fillRect(-50, 24, 110, 14);
    ctx.restore();
    ctx.fillStyle = PAL.pantsShade; ctx.beginPath(); ctx.ellipse(0, -10, 32, 11, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };
}

// Hands, along +y from the wrist. form: 0 open, 1 pointing, 2 fist. side: -1 for the left hand.
function hand(side, key) {
  // Fingers as round strokes, outlined: all the outlines first, then the fills, so they merge.
  const fingers = (ctx, list) => {
    for (const pass of [0, 1]) {
      for (const [x, y, len, w, r] of list) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(r);
        ctx.strokeStyle = pass ? PAL.skin : PAL.skinDeep; ctx.lineWidth = pass ? w : w + 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke();
        ctx.restore();
      }
    }
  };
  const palm = (ctx, y0, h) => {
    const p = new Path2D(); p.roundRect(-26, y0, 52, h, 19);
    ctx.strokeStyle = PAL.skinDeep; ctx.lineWidth = 4; ctx.stroke(p);
    ctx.fillStyle = PAL.skin; ctx.fill(p);
  };
  return (ctx, pose) => {
    const form = Math.round(pose[`${key}.form`] ?? 0);
    ctx.save(); ctx.scale(side, 1);
    if (form === 0) {                                   // open
      fingers(ctx, [[-17, 44, 30, 15, 0.14], [-6, 46, 37, 15, 0.04], [6, 46, 36, 15, -0.04], [17, 44, 28, 14, -0.14], [23, 16, 30, 16, -0.95]]);
      palm(ctx, 0, 56);
    } else if (form === 1) {                            // pointing
      fingers(ctx, [[-15, 44, 48, 16, -0.03], [22, 18, 22, 16, -1.35]]);
      palm(ctx, 0, 56);
      ctx.fillStyle = PAL.skinShade; ctx.beginPath(); ctx.roundRect(-6, 44, 30, 16, 8); ctx.fill();
    } else {                                            // fist
      fingers(ctx, [[20, 20, 18, 16, -1.6]]);
      palm(ctx, 0, 62);
      ctx.strokeStyle = PAL.skinShade; ctx.lineWidth = 3;
      for (const x of [-12, 0, 12]) { ctx.beginPath(); ctx.moveTo(x, 46); ctx.lineTo(x, 60); ctx.stroke(); }
    }
    ctx.restore();
  };
}

// ---------- head ----------
const FACE = P2('M 0 -274 C 80 -274 130 -222 130 -150 C 130 -80 98 -24 0 -8 C -98 -24 -130 -80 -130 -150 C -130 -222 -80 -274 0 -274 Z');
const HAIR_BACK = P2('M 0 -310 C 98 -310 160 -248 160 -158 C 160 -112 154 -80 140 -60 C 128 -46 112 -54 112 -78 L 112 -150 L -112 -150 L -112 -78 C -112 -54 -128 -46 -140 -60 C -154 -80 -160 -112 -160 -158 C -160 -248 -98 -310 0 -310 Z');
const FRINGE = P2('M -134 -168 C -146 -262 -64 -306 12 -302 C 94 -298 146 -252 138 -176 C 128 -206 104 -228 72 -236 C 50 -204 2 -186 -48 -194 C -84 -198 -114 -186 -134 -168 Z');
const FRINGE_LIGHT = P2('M -60 -284 C -20 -298 40 -296 80 -276 C 50 -282 0 -284 -40 -274 C -52 -272 -62 -276 -60 -284 Z');

function drawHairBack(ctx, pose) {
  ctx.save(); ctx.translate(-Math.sin(clamp(pose['head.turn'] ?? 0, -1, 1) * 0.5) * 10, 0);
  ctx.fillStyle = PAL.hairShade; ctx.fill(HAIR_BACK);
  ctx.restore();
}

function drawFringe(ctx, pose) {
  ctx.save(); ctx.translate(Math.sin(clamp(pose['head.turn'] ?? 0, -1, 1) * 0.5) * 24, 0);
  const g = ctx.createLinearGradient(-130, -300, 130, -170);
  g.addColorStop(0, PAL.hair); g.addColorStop(1, PAL.hairLight);
  ctx.fillStyle = g; ctx.fill(FRINGE);
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill(FRINGE_LIGHT);
  ctx.restore();
}

// The ponytail hangs from its tie; the rig swings it.
function drawTail(ctx) {
  const g = ctx.createLinearGradient(-34, 0, 34, 0);
  g.addColorStop(0, PAL.hairShade); g.addColorStop(0.6, PAL.hair); g.addColorStop(1, PAL.hairLight);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.bezierCurveTo(-46, 60, -44, 140, -14, 196);
  ctx.bezierCurveTo(-2, 216, 26, 212, 30, 190);
  ctx.bezierCurveTo(16, 196, 6, 186, 12, 170);
  ctx.bezierCurveTo(40, 110, 36, 44, 20, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(8, 18); ctx.bezierCurveTo(20, 60, 18, 110, 6, 150); ctx.stroke();
  ctx.fillStyle = PAL.tie; ctx.beginPath(); ctx.roundRect(-22, -8, 44, 16, 8); ctx.fill();
}

const faceFill = ctx => {
  const g = ctx.createLinearGradient(-130, -150, 130, -150);
  g.addColorStop(0, PAL.skinShade); g.addColorStop(0.35, PAL.skin); g.addColorStop(1, PAL.skin);
  return g;
};

function eye(ctx, x, pose, side) {
  const y = -140, rx = 27, ry = 33, shut = clamp(pose['eyes.blink'] ?? 0), squint = pose['eyes.squint'] ?? 0;
  const gx = (pose['eyes.x'] ?? 0) * 9, gy = (pose['eyes.y'] ?? 0) * 8;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = PAL.eye; ctx.fill();
  ctx.clip();
  ctx.beginPath(); ctx.arc(x + gx, y + gy + 3, 17, 0, TAU);
  const ig = ctx.createRadialGradient(x + gx, y + gy - 4, 3, x + gx, y + gy + 3, 17);
  ig.addColorStop(0, PAL.iris); ig.addColorStop(1, PAL.irisDark);
  ctx.fillStyle = ig; ctx.fill();
  ctx.beginPath(); ctx.arc(x + gx, y + gy + 3, 8.5, 0, TAU); ctx.fillStyle = PAL.pupil; ctx.fill();
  ctx.beginPath(); ctx.arc(x + gx + 6, y + gy - 5, 5, 0, TAU); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.restore();
  // lids: the upper comes down to blink, the lower rises to squint (a smile reaches the eyes).
  // Clipped to a slightly larger eye, so a shut lid leaves no ring.
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, rx + 2.5, ry + 2.5, 0, 0, TAU); ctx.clip();
  const top = y - ry - 2, lidY = lerp(top, y + ry + 2, Math.min(1, shut + squint * 0.08));
  ctx.fillStyle = faceFill(ctx);
  ctx.beginPath(); ctx.moveTo(x - rx - 4, top - 4); ctx.lineTo(x + rx + 4, top - 4); ctx.lineTo(x + rx + 4, lidY); ctx.quadraticCurveTo(x, lidY + 10 * (1 - shut), x - rx - 4, lidY); ctx.fill();
  // a smile pushes the lower lid up into a crescent, highest in the middle
  const low = lerp(y + ry + 2, y + 10, squint * 0.6);
  ctx.beginPath(); ctx.moveTo(x - rx - 4, y + ry + 6); ctx.lineTo(x + rx + 4, y + ry + 6); ctx.lineTo(x + rx + 4, low + squint * 10); ctx.quadraticCurveTo(x, low - 8 - squint * 22, x - rx - 4, low + squint * 10); ctx.fill();
  ctx.restore();
  // lashes along the upper lid, thicker at the outer corner
  ctx.strokeStyle = PAL.lash; ctx.lineCap = 'round';
  const lid = lerp(top, y + ry, Math.min(1, shut + squint * 0.08));
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x - rx - 2, lid + 6); ctx.quadraticCurveTo(x, lid - 6 + 14 * shut, x + rx + 2, lid + 6); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x + side * (rx - 2), lid + 2); ctx.lineTo(x + side * (rx + 9), lid - 7); ctx.stroke();
}

function brow(ctx, x, pose, side) {
  const up = (pose['brows.up'] ?? 0) * 12, frown = (pose['brows.in'] ?? 0);
  const y = -196 - up;
  ctx.save(); ctx.translate(x, y); ctx.rotate(side * (0.08 - frown * 0.22));
  ctx.strokeStyle = PAL.hair; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-24, 4); ctx.quadraticCurveTo(0, -6, 24, 2); ctx.stroke();
  ctx.restore();
}

// The mouth, drawn from lip-sync parameters: open, wide, round, press, teeth, tongue, tuck, and
// 'mood.smile' curving the corners.
function drawMouth(ctx, pose) {
  const m = k => pose[`mouth.${k}`] ?? 0;
  const smile = pose['mood.smile'] ?? 0.35;
  const open = clamp(m('open')), round = clamp(m('round')), wide = clamp(m('wide') || 0.5);
  const cx = 0, cy = -74;
  let hw = lerp(20, 40, wide);
  hw = lerp(hw, 12 + open * 8, round * 0.85);
  const up = smile * 10 * (1 - round * 0.7);            // corners lift with a smile
  if (open < 0.06) {
    ctx.strokeStyle = PAL.mouthIn; ctx.lineWidth = 5 + m('press') * 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - hw, cy - up); ctx.quadraticCurveTo(cx, cy + up * 1.3 + 3, cx + hw, cy - up); ctx.stroke();
    return;
  }
  const h = 6 + open * 44, topY = cy - h * 0.18 - up * 0.2;
  const shape = new Path2D();
  shape.moveTo(cx - hw, cy - up);
  shape.bezierCurveTo(cx - hw * 0.5, topY - h * 0.08, cx + hw * 0.5, topY - h * 0.08, cx + hw, cy - up);
  shape.bezierCurveTo(cx + hw * (0.9 - round * 0.3), cy + h * 0.9, cx - hw * (0.9 - round * 0.3), cy + h * 0.9, cx - hw, cy - up);
  shape.closePath();
  ctx.fillStyle = PAL.mouthIn; ctx.fill(shape);
  ctx.save(); ctx.clip(shape);
  const teeth = m('teeth'), tuck = m('tuck');
  if (teeth > 0.05) { ctx.fillStyle = PAL.teeth; ctx.fillRect(cx - hw, topY - 12, hw * 2, 12 + h * (0.22 + tuck * 0.35) * teeth); }
  const tongue = m('tongue');
  ctx.fillStyle = PAL.tongue;
  ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.78 - tongue * h * 0.3, hw * 0.62, h * 0.32, 0, 0, TAU); ctx.fill();
  if (tuck > 0.05) { ctx.fillStyle = PAL.lip; ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.95, hw * 0.95, h * 0.62 * tuck, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = PAL.lip; ctx.lineWidth = 3; ctx.stroke(shape);
}

// The head turns in 2.5D: 'head.turn' (-1 to 1) slides the features round a curved face, the far
// eye and brow narrow, the nose moves most, the near ear tucks away and the fringe shifts over.
const FACE_R = 115;
function drawHead(ctx, pose) {
  const th = clamp(pose['head.turn'] ?? 0, -1, 1) * 0.5, c = Math.cos(th), sn = Math.sin(th);
  const at = (x, depth = 1) => x * c + sn * FACE_R * depth;                  // where a feature lands
  const width = x => Math.cos(th + x / FACE_R) / Math.cos(x / FACE_R);      // how wide it looks
  const feature = (x, depth, fn) => { ctx.save(); ctx.translate(at(x, depth), 0); ctx.scale(width(x), 1); fn(); ctx.restore(); };
  for (const s of [-1, 1]) {
    const hide = s * sn > 0 ? 1 - Math.min(1, Math.abs(sn) * 2.4) : 1;       // the ear on the side she turns to
    if (hide <= 0.02) continue;
    ctx.save(); ctx.translate(s * 126 * c, -142); ctx.scale(hide, 1);
    ctx.fillStyle = PAL.skinShade; ctx.beginPath(); ctx.ellipse(0, 0, 19, 29, s * 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.skinDeep; ctx.beginPath(); ctx.ellipse(s * 2, 0, 8, 15, s * 0.15, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = faceFill(ctx); ctx.fill(FACE);
  ctx.fillStyle = PAL.blush;
  for (const s of [-1, 1]) feature(s * 80, 0.7, () => { ctx.beginPath(); ctx.ellipse(0, -96, 22, 13, 0, 0, TAU); ctx.fill(); });
  for (const s of [-1, 1]) { feature(s * 50, 0.85, () => eye(ctx, 0, pose, s)); feature(s * 50, 0.9, () => brow(ctx, 0, pose, s)); }
  feature(0, 1.25, () => {                                                   // the nose sticks out furthest
    ctx.strokeStyle = PAL.skinDeep; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -106); ctx.quadraticCurveTo(2 + sn * 6, -98, 10, -104); ctx.stroke();
  });
  feature(0, 1, () => drawMouth(ctx, pose));
}

// ---------- the rig ----------
const ARM = 134, FORE = 124, THIGH = 158, SHIN = 160;
export const pip = new Puppet([
  { name: 'hips', at: [0, -346] },
  { name: 'tail', parent: 'head', at: [112, -248], z: -2, draw: drawTail },
  { name: 'hairBack', parent: 'head', at: [0, 0], z: -1, draw: drawHairBack },
  { name: 'legL', parent: 'hips', at: [-42, -4], len: THIGH, z: 0, draw: thigh(THIGH) },
  { name: 'shinL', parent: 'legL', at: [0, THIGH], len: SHIN, z: 0, draw: shin(SHIN) },
  { name: 'footL', parent: 'shinL', at: [0, SHIN], z: 0.5, draw: shoe(-1) },
  { name: 'legR', parent: 'hips', at: [42, -4], len: THIGH, z: 0, draw: thigh(THIGH) },
  { name: 'shinR', parent: 'legR', at: [0, THIGH], len: SHIN, z: 0, draw: shin(SHIN) },
  { name: 'footR', parent: 'shinR', at: [0, SHIN], z: 0.5, draw: shoe(1) },
  { name: 'torso', parent: 'hips', at: [0, 0], z: 2, draw: drawTorso },
  { name: 'neck', parent: 'torso', at: [0, -236], z: 1.5, draw: drawNeck },
  { name: 'head', parent: 'neck', at: [0, -28], z: 4, draw: drawHead },
  { name: 'fringe', parent: 'head', at: [0, 0], z: 5, draw: drawFringe },
  { name: 'armL', parent: 'torso', at: [-90, -212], len: ARM, z: 3, draw: sleeve(ARM) },
  { name: 'foreL', parent: 'armL', at: [0, ARM], len: FORE, z: 3, draw: foreSleeve(FORE) },
  { name: 'handL', parent: 'foreL', at: [0, FORE - 6], z: 6, draw: hand(-1, 'handL') },
  { name: 'armR', parent: 'torso', at: [90, -212], len: ARM, z: 3, draw: sleeve(ARM) },
  { name: 'foreR', parent: 'armR', at: [0, ARM], len: FORE, z: 3, draw: foreSleeve(FORE) },
  { name: 'handR', parent: 'foreR', at: [0, FORE - 6], z: 6, draw: hand(1, 'handR') },
]);

export const REST = {
  'armL.r': 0.13, 'foreL.r': -0.12, 'armR.r': -0.13, 'foreR.r': 0.12,
  'legL.r': 0.03, 'legR.r': -0.03, 'footL.r': -0.03, 'footR.r': 0.03,
  'tail.r': -0.85, 'mood.smile': 0.35, 'head.s': 1.12,
};

// Handy poses to blend towards (partial: only the keys they change).
export const POSES = {
  wave: { 'armR.r': -2.5, 'foreR.r': -0.5, 'handR.form': 0 },
  point: { 'armR.r': -1.45, 'foreR.r': -0.1, 'handR.form': 1 },        // at the screen's right
  pointL: { 'armL.r': 1.45, 'foreL.r': 0.1, 'handL.form': 1 },
  present: { 'armR.r': -0.9, 'foreR.r': -0.9, 'handR.form': 0, 'armL.r': 0.5, 'foreL.r': 0.6 },
  shrug: { 'armL.r': 0.6, 'foreL.r': 1.2, 'armR.r': -0.6, 'foreR.r': -1.2, 'handL.form': 0, 'handR.form': 0, 'torso.y': -4 },
  think: { 'armR.r': -0.3, 'foreR.r': -2.6, 'handR.form': 2, 'head.r': 0.1, 'eyes.y': -0.8, 'eyes.x': 0.6 },
  cheer: { 'armL.r': 2.7, 'foreL.r': 0.3, 'armR.r': -2.7, 'foreR.r': -0.3, 'handL.form': 2, 'handR.form': 2, 'mood.smile': 1 },
};

// Pip at time t: the choreography, then breathing, weight shift, blinks, glances, lip-sync, a
// nod with loud syllables, and the ponytail swinging behind the head's movements.
// How each joint follows its choreography: the shoulder leads, the elbow lags it, the hand lags
// that, so a move overlaps down the arm and each part overshoots a little and settles.
const FEEL = {
  arm: { stiffness: 200, damping: 18 }, fore: { stiffness: 150, damping: 12.5 }, hand: { stiffness: 115, damping: 10 },
  head: { stiffness: 120, damping: 15 }, body: { stiffness: 90, damping: 14 },
};
const JOINTS = {
  'armL.r': FEEL.arm, 'armR.r': FEEL.arm, 'foreL.r': FEEL.fore, 'foreR.r': FEEL.fore, 'handL.r': FEEL.hand, 'handR.r': FEEL.hand,
  'head.r': FEEL.head, 'head.turn': FEEL.head, 'torso.r': FEEL.body,
};

export function pose(t, moves, { speaker = 'pip', extraBlinks = [], still = false, extra, springy = !still } = {}) {
  // The choreography, with the head turning to follow the eyes when they look sideways.
  const chore = u => { const q = choreo(u, REST, moves); q['head.turn'] = (q['head.turn'] ?? 0) + (q['eyes.x'] ?? 0) * 0.45; return q; };
  // `extra(t)` adds motion on top (waves, head shakes, hops); the ponytail feels it too.
  const base = u => (extra ? add(chore(u), extra(u)) : chore(u));
  let p = chore(t);
  if (springy) Object.assign(p, springs('pip.joints', t, chore, JOINTS));
  if (extra) p = add(p, extra(t));
  // moving holds: never quite still
  if (!still) p = add(p, { 'armL.r': 0.022 * Math.sin(t * 1.3 + 1), 'armR.r': 0.022 * Math.sin(t * 1.1 + 2), 'foreL.r': 0.03 * Math.sin(t * 1.7), 'foreR.r': 0.03 * Math.sin(t * 1.5 + 1) });
  const br = breath(t, 3), sw = still ? 0 : sway(t, 3);
  p = add(p, {
    'torso.sy': 1 + 0.009 * br, 'head.y': -1.5 * br, 'hips.x': sw * 4, 'torso.r': sw * 0.012, 'head.r': -sw * 0.02,
  });
  const g = glance(t, 3);
  p['eyes.x'] = (p['eyes.x'] ?? 0) + g[0] * 0.35;
  p['eyes.y'] = (p['eyes.y'] ?? 0) + g[1] * 0.35;
  p['eyes.blink'] = Math.max(p['eyes.blink'] ?? 0, blink(t, 3, extraBlinks));
  const mo = mouth(t, { speaker });
  for (const [k, v] of Object.entries(mo)) p[`mouth.${k}`] = v;
  const talk = loudness(t) * (mo.open > 0.05 ? 1 : 0);
  p['head.r'] += Math.sin(t * 9) * 0.012 * talk;
  p['head.y'] += -talk * 3;
  p['brows.up'] = (p['brows.up'] ?? 0) + talk * 0.25;
  // The ponytail: its world angle hangs towards the floor, and swings against how the head moves.
  const headSwing = u => { const q = base(u); return (q['head.r'] ?? 0) * 2.2 + (q['torso.r'] ?? 0) * 2 + (q['hips.x'] ?? 0) / 60 + (q['hips.y'] ?? 0) / 90; };
  const swing = clamp(lag('pip.tail', t, headSwing, { preset: 'wobbly' }), -1.3, 1.3);
  p['tail.r'] = (p['tail.r'] ?? -0.85) - (p['head.r'] + (p['torso.r'] ?? 0)) - swing * 0.9;
  return p;
}
