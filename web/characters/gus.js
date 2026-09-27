// Gus, a toon stock character: import { gus, pose, EXPR, POSES, REST } from '/@kit/characters/gus.js'.
// An old-school animator: stocky, bald on top with grey tufts, bushy brows, round glasses, a big
// nose, a mustache and stubble, a mustard cardigan over a pale blue shirt, brown slacks and loafers.
// About 900 px tall, origin on the floor between his feet; L and R are the screen's left and right.
// Made from toon.js like Pip, so he takes the same pose keys, plus 'glasses.y' (slide them down his
// nose, to peer over them) and a pair of wisps on top that swing.
import { clamp, TAU } from '../core.js';
import { Puppet } from '../puppet.js';
import { lag } from '../spring.js';
import {
  brow, expressions, eye, hand, headTurn, inked, INK, limb, line, LW, mouth, NEUTRAL, toonPose, turningShoe, turningTorso, v, within,
} from '../toon.js';

export const PAL = {
  skin: '#EDB892', skinShadow: '#D29773', blush: '#E58E7E', stubble: 'rgba(92,74,96,0.16)',
  hair: '#DEDAD5', hairShadow: '#B8B1AA',
  knit: '#E0A93A', knitShadow: '#BF8A26', rib: '#C99530', button: '#7A4E24',
  shirt: '#CFE3F2', shirtShadow: '#A9C7DE',
  slacks: '#7A5A3C', shoe: '#6B4226', shoeShadow: '#553319', sole: '#3A2414',
  frames: '#3B2A22', mouth: '#4A1427', tongue: '#E0707C', gum: '#D8707C', lip: '#C77F70',
};
const P = s => new Path2D(s);

// ---------- body ----------
const TORSO = P('M -116 14 C -134 -40 -142 -112 -130 -172 C -122 -222 -102 -250 -62 -258 L -46 -258 Q 0 -250 46 -258 L 62 -258 C 102 -250 122 -222 130 -172 C 142 -112 134 -40 116 14 C 60 30 -60 30 -116 14 Z');
const A = 134, B = 92;
// How wide a thing on the front at x looks once the body has turned by th (it foreshortens).
const facing = (x, th) => Math.cos(Math.asin(clamp(x / A, -1, 1)) + th) / Math.cos(Math.asin(clamp(x / A, -1, 1)));

function drawTorso(ctx, pose) {
  turningTorso(ctx, pose, {
    path: TORSO, a: A, b: B, fill: PAL.knit, shadow: PAL.knitShadow,
    decorate: (g, T) => {
      const f = T.front;
      g.fillStyle = PAL.rib; g.fillRect(-170, -18, 340, 50);                                  // the ribbed hem
      for (let x = -120; x <= 120; x += 20) line(g, [[f(x), -14], [f(x), 20]], 2, 'rgba(0,0,0,0.16)');
      line(g, [[-134 * T.k, -18], [134 * T.k, -18]], LW * 0.7);
      // the shirt in the V, its collar, and the cardigan's band round the V
      const vee = new Path2D(); vee.moveTo(f(-54), -266); vee.lineTo(f(54), -266); vee.lineTo(f(0), -120); vee.closePath();
      g.fillStyle = PAL.shirt; g.fill(vee);
      within(g, vee, () => { g.fillStyle = PAL.shirtShadow; g.fillRect(f(-60), -270, (f(0) - f(-60)) * 0.55, 160); });
      for (const side of [-1, 1]) {
        const col = new Path2D(); col.moveTo(f(side * 50), -262); col.lineTo(f(side * 4), -250); col.lineTo(f(side * 30), -208); col.closePath();
        inked(g, col, PAL.shirt, LW * 0.8);
      }
      const band = [[f(-52), -266], [f(0), -120], [f(52), -266]];
      line(g, band, 16 + LW * 2); line(g, band, 16, PAL.rib);
      // the button band down the middle, and its buttons
      line(g, [[f(0), -120], [f(0), -18]], LW * 0.8);
      for (const y of [-100, -66, -32]) {
        g.fillStyle = PAL.button; g.beginPath(); g.arc(f(9), y, 7, 0, TAU); g.fill();
        g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
      }
      // patch pockets, which foreshorten as he turns
      for (const side of [-1, 1]) {
        const sx = facing(side * 78, T.th);
        if (sx < 0.15) continue;
        g.save(); g.translate(f(side * 78), -70); g.scale(sx, 1);
        const pocket = new Path2D(); pocket.roundRect(-28, -22, 56, 46, 8);
        inked(g, pocket, PAL.knitShadow, 3);
        line(g, [[-28, -12], [28, -12]], 2.5);
        g.restore();
      }
    },
  });
}

function drawNeck(ctx) {
  const n = P('M -36 22 L -36 -22 Q 0 -32 36 -22 L 36 22 Z');
  ctx.fillStyle = PAL.skin; ctx.fill(n);
  within(ctx, n, () => { ctx.fillStyle = PAL.skinShadow; ctx.fillRect(-40, -40, 80, 34); ctx.fillRect(-40, -40, 20, 80); });
  inked(ctx, n);
}

const arm = (fore, a, b) => (ctx, pose) => limb(ctx, a, b, v(pose, `${fore}.r`), 58, 50, PAL.knit, PAL.rib);
const leg = (shin, a, b) => (ctx, pose) => limb(ctx, a, b, v(pose, `${shin}.r`), 72, 62, PAL.slacks);

// ---------- the head ----------
// A big round head with jowls; the jaw drops with a wide-open mouth. Turned (s), the chin comes round.
function facePath(jaw, s = 0) {
  const cx = s * 32, p = new Path2D();
  p.moveTo(0, -300);
  p.bezierCurveTo(96, -300, 144, -240, 144, -166);
  p.bezierCurveTo(144, -104 + jaw * 0.3, 136 + cx * 0.3, -30 + jaw, cx + 72, -8 + jaw);
  p.bezierCurveTo(cx + 42, 4 + jaw, cx + 20, 6 + jaw, cx, 6 + jaw);
  p.bezierCurveTo(cx - 20, 6 + jaw, cx - 42, 4 + jaw, cx - 72, -8 + jaw);
  p.bezierCurveTo(-136 + cx * 0.3, -30 + jaw, -144, -104 + jaw * 0.3, -144, -166);
  p.bezierCurveTo(-144, -240, -96, -300, 0, -300);
  p.closePath();
  return p;
}
const EAR = P('M -8 -34 C 24 -40 36 -8 26 16 C 20 32 4 38 -8 30 Z');
const TUFT = P('M 16 -64 C -16 -70 -30 -46 -24 -28 C -42 -20 -40 8 -20 14 C -32 32 -14 58 8 50 C 18 42 20 22 16 2 C 22 -20 26 -44 16 -64 Z');
const NOSE = P('M -14 -150 C -14 -128 -44 -118 -44 -94 C -44 -70 -20 -62 0 -70 C 20 -62 44 -70 44 -94 C 44 -118 14 -128 14 -150');
const MUSTACHE = P('M -70 -44 C -68 -66 -34 -74 0 -64 C 34 -74 68 -66 70 -44 C 58 -32 40 -40 26 -38 C 14 -36 6 -42 0 -40 C -6 -42 -14 -36 -26 -38 C -40 -40 -58 -32 -70 -44 Z');
const EYE = { rx: 24, ry: 26, iris: 13, pupil: 7.5, skin: PAL.skin, irisCol: '#7A5334', irisShade: '#523720', lash: 1.15 };
const BROW = { y: -208, len: 36, w: 20, color: PAL.hair, rise: 16, arch: 10 };
const MOUTH = { y: -30, minW: 20, maxW: 44, openH: 52, pal: PAL };
const ring = (x, y, r) => { const p = new Path2D(); p.arc(x, y, r, 0, TAU); return p; };
// Stubble: a darker jaw, and flecks scattered over it (the same flecks every frame).
const FLECKS = Array.from({ length: 70 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12345.678;
  const u = a - Math.floor(a), w = b - Math.floor(b), r = Math.sqrt(w);
  return [Math.cos(u * TAU) * 118 * r, -26 + Math.sin(u * TAU) * 62 * r];
});

function drawHead(ctx, pose) {
  const { c, s, at, width } = headTurn(pose, 130);
  const jaw = clamp(v(pose, 'mouth.open') * 0.5 + v(pose, 'jaw'), 0, 1.4) * 26;
  const smile = v(pose, 'mood.smile', 0.1), up = v(pose, 'brows.up');
  const feature = (x, y, depth, fn) => { ctx.save(); ctx.translate(at(x, depth), y); ctx.scale(width(x), 1); fn(); ctx.restore(); };
  const shows = side => (side * s > 0 ? 1 - Math.min(1, Math.abs(s) * 2.4) : 1);   // the side he turns towards tucks away
  for (const side of [-1, 1]) {
    const k = shows(side);
    if (k <= 0.02) continue;
    ctx.save(); ctx.translate(side * 140 * c, -150); ctx.scale(k * side, 1.1);
    inked(ctx, EAR, PAL.skin);
    line(ctx, [[2, -16], [14, -2], [8, 14]], 2.6);
    ctx.restore();
  }
  const face = facePath(jaw, s);
  ctx.fillStyle = PAL.skinShadow; ctx.fill(face);
  within(ctx, face, () => {                                 // lit from the upper right
    ctx.fillStyle = PAL.skin; ctx.beginPath(); ctx.ellipse(34 + s * 34, -168, 168, 200, 0, 0, TAU); ctx.fill();
    feature(0, jaw * 0.6, 0.9, () => {
      ctx.fillStyle = PAL.stubble; ctx.beginPath(); ctx.ellipse(0, -26, 124, 66, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(70,52,72,0.35)';
      for (const [x, y] of FLECKS) { ctx.beginPath(); ctx.arc(x, y, 1.7, 0, TAU); ctx.fill(); }
    });
    ctx.fillStyle = PAL.blush; ctx.globalAlpha = 0.55;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(at(side * 92, 0.7), -98, 26 * width(side * 92), 15, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';                // the shine on his dome
    ctx.beginPath(); ctx.ellipse(46 + s * 40, -268, 36, 13, -0.35, 0, TAU); ctx.fill();
  });
  inked(ctx, face);
  // grey tufts over the ears; the far side's shows more of itself
  for (const side of [-1, 1]) {
    const k = Math.max(0.35, shows(side)) * (side * s < 0 ? 1 + Math.abs(s) * 0.5 : 1);
    ctx.save(); ctx.translate(side * 136 * c + s * 16, -184); ctx.scale(-side * k, 1);
    ctx.fillStyle = PAL.hair; ctx.fill(TUFT);
    within(ctx, TUFT, () => { ctx.fillStyle = PAL.hairShadow; ctx.fillRect(-50, 10, 90, 60); });
    inked(ctx, TUFT);
    ctx.restore();
  }
  // wrinkles: the forehead creases more as the brows go up; crow's feet; smile lines
  const crease = clamp(0.35 + up * 0.45, 0, 0.9);
  feature(0, 0, 1, () => {
    ctx.globalAlpha = crease;
    line(ctx, [[-54, -238 - up * 5], [0, -246 - up * 6], [54, -238 - up * 5]], 2.6);
    line(ctx, [[-34, -224 - up * 4], [0, -229 - up * 5], [34, -224 - up * 4]], 2.4);
    ctx.globalAlpha = 0.5;
    for (const side of [-1, 1]) line(ctx, [[side * 46, -92], [side * (60 + smile * 6), -66 - smile * 4], [side * 66, -40 - smile * 6]], 2.6);
    ctx.globalAlpha = 1;
  });
  for (const side of [-1, 1]) {
    feature(side * 54, -150, 0.85, () => {
      eye(ctx, pose, side, EYE);
      ctx.globalAlpha = 0.55;
      line(ctx, [[side * 30, -6], [side * 42, -12]], 2.2); line(ctx, [[side * 30, 6], [side * 42, 10]], 2.2);
      ctx.globalAlpha = 1;
    });
  }
  // the nose, which sticks out furthest and swings furthest as he turns
  const scrunch = v(pose, 'nose.scrunch');
  feature(0, -scrunch * 4, 1.4, () => {
    ctx.fillStyle = PAL.skin; ctx.fill(NOSE);
    within(ctx, NOSE, () => {
      ctx.fillStyle = PAL.skinShadow; ctx.beginPath(); ctx.ellipse(-30, -86, 22, 30, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(230,120,110,0.45)'; ctx.beginPath(); ctx.ellipse(6, -90, 28, 16, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(16, -102, 9, 5, -0.4, 0, TAU); ctx.fill();
    });
    inked(ctx, NOSE);
    for (const side of [-1, 1]) line(ctx, [[side * 14, -74], [side * 22, -76]], 3);
  });
  // glasses: round frames on the bridge of his nose, which can slide down it
  const gy = v(pose, 'glasses.y') * 22;
  for (const side of [-1, 1]) {
    feature(side * 54, -150 + gy, 0.95, () => {
      const lens = ring(0, 0, 40);
      ctx.fillStyle = 'rgba(214,236,255,0.16)'; ctx.fill(lens);
      ctx.beginPath(); ctx.arc(0, 0, 30, -1.25, -0.45); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineCap = 'round'; ctx.stroke();
      ctx.lineWidth = 6 + LW * 2; ctx.strokeStyle = INK; ctx.stroke(lens);
      ctx.lineWidth = 6; ctx.strokeStyle = PAL.frames; ctx.stroke(lens);
    });
    if (shows(side) > 0.5) line(ctx, [[at(side * 94, 0.8), -156 + gy], [side * 138 * c, -162]], 6);   // the arm to the ear
  }
  feature(0, -150 + gy, 1.1, () => { line(ctx, [[-16, -6], [0, -14], [16, -6]], 7 + LW * 2); line(ctx, [[-16, -6], [0, -14], [16, -6]], 7, PAL.frames); });
  // the mouth, under a mustache that lifts when he smiles
  feature(0, 0, 1, () => mouth(ctx, pose, jaw, MOUTH));
  feature(0, 0, 1.15, () => {
    ctx.save(); ctx.translate(0, -smile * 4 + jaw * 0.12 - 56); ctx.scale(1 + Math.max(0, smile) * 0.07, 1); ctx.rotate(v(pose, 'mouth.shift') * 0.08); ctx.translate(0, 56);
    ctx.fillStyle = PAL.hair; ctx.fill(MUSTACHE);
    within(ctx, MUSTACHE, () => { ctx.fillStyle = PAL.hairShadow; ctx.fillRect(-80, -48, 160, 20); });
    inked(ctx, MUSTACHE);
    ctx.globalAlpha = 0.45; for (const x of [-40, -18, 18, 40]) line(ctx, [[x, -62], [x * 1.1, -46]], 2); ctx.globalAlpha = 1;
    ctx.restore();
  });
  for (const side of [-1, 1]) feature(side * 54, 0, 0.9, () => brow(ctx, pose, side, BROW));
  // the two wisps he still has on top
  ctx.save(); ctx.translate(s * 60 - 6, -298); ctx.rotate(v(pose, 'wisp.r'));
  for (const w of [P('M 0 0 C 4 -34 34 -46 50 -26'), P('M -8 2 C -16 -26 2 -48 26 -52')]) {
    ctx.lineCap = 'round'; ctx.lineWidth = 5 + LW * 2; ctx.strokeStyle = INK; ctx.stroke(w);
    ctx.lineWidth = 5; ctx.strokeStyle = PAL.hair; ctx.stroke(w);
  }
  ctx.restore();
}

// ---------- the rig ----------
const ARM = 126, FORE = 116, THIGH = 150, SHIN = 148;
const SHOE = { upper: PAL.shoe, sole: PAL.sole, shade: PAL.shoeShadow };
export const gus = new Puppet([
  { name: 'hips', at: [0, -326] },
  { name: 'legL', parent: 'hips', at: [-50, -4], len: THIGH, z: 0, draw: leg('shinL', THIGH, SHIN) },
  { name: 'shinL', parent: 'legL', at: [0, THIGH], len: SHIN, z: 0 },
  { name: 'footL', parent: 'shinL', at: [0, SHIN], z: 0.5, draw: turningShoe(-1, SHOE) },
  { name: 'legR', parent: 'hips', at: [50, -4], len: THIGH, z: 0, draw: leg('shinR', THIGH, SHIN) },
  { name: 'shinR', parent: 'legR', at: [0, THIGH], len: SHIN, z: 0 },
  { name: 'footR', parent: 'shinR', at: [0, SHIN], z: 0.5, draw: turningShoe(1, SHOE) },
  { name: 'torso', parent: 'hips', at: [0, 0], z: 2, draw: drawTorso },
  { name: 'neck', parent: 'torso', at: [0, -250], z: 1.5, draw: drawNeck },
  { name: 'head', parent: 'neck', at: [0, -8], z: 4, draw: drawHead },
  { name: 'armL', parent: 'torso', at: [-112, -222], len: ARM, z: 5.5, draw: arm('foreL', ARM, FORE) },
  { name: 'foreL', parent: 'armL', at: [0, ARM], len: FORE, z: 5.5 },
  { name: 'handL', parent: 'foreL', at: [0, FORE - 4], z: 6, draw: hand(-1, 'handL', { skin: PAL.skin, size: 1.1 }) },
  { name: 'armR', parent: 'torso', at: [112, -222], len: ARM, z: 5.5, draw: arm('foreR', ARM, FORE) },
  { name: 'foreR', parent: 'armR', at: [0, ARM], len: FORE, z: 5.5 },
  { name: 'handR', parent: 'foreR', at: [0, FORE - 4], z: 6, draw: hand(1, 'handR', { skin: PAL.skin, size: 1.1 }) },
]);

// His arms hang out a little, round his middle.
export const REST = {
  'armL.r': 0.26, 'foreL.r': -0.2, 'armR.r': -0.26, 'foreR.r': 0.2, 'handL.form': 4, 'handR.form': 4,
  'legL.r': 0.02, 'legR.r': -0.02, 'footL.r': -0.02, 'footR.r': 0.02, 'mood.smile': 0.1, 'lids.drop': 0.12, 'head.s': 1.12,
};

export const POSES = {
  wave: { 'armR.r': -2.4, 'foreR.r': -0.5, 'handR.form': 0 },
  point: { 'armR.r': -1.45, 'foreR.r': -0.1, 'handR.form': 1 },
  pointL: { 'armL.r': 1.45, 'foreL.r': 0.1, 'handL.form': 1 },
  shrug: { 'armL.r': 0.7, 'foreL.r': 1.2, 'armR.r': -0.7, 'foreR.r': -1.2, 'handL.form': 0, 'handR.form': 0, 'head.r': 0.06 },
  cheer: { 'armL.r': 2.6, 'foreL.r': 0.3, 'armR.r': -2.6, 'foreR.r': -0.3, 'handL.form': 2, 'handR.form': 2 },
  thumbsUp: { 'armR.r': -0.7, 'foreR.r': -1.5, 'handR.form': 3 },
  rest: { 'armL.r': 0.26, 'foreL.r': -0.2, 'armR.r': -0.26, 'foreR.r': 0.2, 'handL.form': 4, 'handR.form': 4 },
};
export const EXPR = expressions({ ...NEUTRAL, 'mood.smile': 0.1, 'lids.drop': 0.12 });

// The wisps trail behind how his head moves.
function wisps(t, base, p) {
  const swingOf = u => { const q = base(u); return v(q, 'head.r') * 2 + v(q, 'torso.r') * 2 + v(q, 'hips.x') / 60 + v(q, 'hips.y') / 80 + v(q, 'head.turn') * 0.5; };
  p['wisp.r'] = -clamp(lag('gus.wisp', t, swingOf, { preset: 'wobbly' }), -1.2, 1.2) * 0.8;
}

// Gus at time t: see toonPose in toon.js.
export const pose = toonPose({ rest: REST, id: 'gus', seed: 11, shoulder: 112, hip: 50, hair: wisps });
