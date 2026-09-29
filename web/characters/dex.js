// Dex, a cut-out stock character: import { dex, pose, EXPR, POSES, REST } from '/@kit/characters/dex.js'.
// A warehouse picker in a hi-vis vest and an orange beanie. About 950 px tall, origin on the floor
// between his feet; L and R are the screen's left and right as he faces us.
// Made from cutout.js: drawn from five angles (body.view, head.view: 0 front, 1 three-quarter,
// 2 profile, 3 three-quarter back, 4 back, negative to face left), hands from the hand library
// ('handR.shape': HAND.point), and a mouth chart that follows what he says. He is declared at the
// bottom (defineCutout): his bones, the tags that say what they are, and the pieces drawn on them.
// A prop goes in a hand through the draw call: dex.draw(ctx, pose, { x, y, held: { handL: fn } }).
import {
  angleSet, brow, CLIPS, defineCutout, EXPR as FACES, eye, HAND, handPiece, ink, jawDrop, line, LW, mouth, mouthChart, mouthName, noodle, P,
  sleeve, stroke, v, within,
} from '../cutout.js';

export const PAL = {
  skin: '#C78A62', hair: '#2A201D',
  beanie: '#EC7A2E', beanieRib: '#C9611F',
  shirt: '#56698A', vest: '#D3E64B', stripe: '#D8DCE0',
  pants: '#484C55', boot: '#83532F', sole: '#2B2320', toe: '#6E4426',
  belt: '#372A22', buckle: '#C8C2B4', badge: '#F4F3EE', badgeTop: '#2F7DD3',
  mouth: '#3B1521', tongue: '#DE6878',
};
const FACE = { rx: 27, ry: 30, pupil: 5.4, lid: PAL.skin };
const MOUTH_PAL = { mouth: PAL.mouth, tongue: PAL.tongue };
// The mouth, `w` px to each corner, lowered as the jaw drops.
const MW = 31;
const say = (ctx, p, x, y, sx, jaw) => {
  ctx.save(); ctx.translate(x, y + jaw * 0.35); ctx.scale(sx, 1);
  mouth(ctx, mouthName(p), { w: MW, smile: v(p, 'mood.smile'), cornerL: v(p, 'mouth.cornerL'), cornerR: v(p, 'mouth.cornerR'), pal: MOUTH_PAL });
  ctx.restore();
};
const jawOf = p => jawDrop(mouthName(p), MW);
const put = (ctx, x, y, sx, fn) => { ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1); fn(); ctx.restore(); };

// ---------- the head ----------
// In the head's space: the neck's top at the origin, the chin at -4, the beanie's crown at -250.
const EAR = P('M 0 -17 C 17 -21 25 -3 20 11 C 16 21 5 23 -2 17 Z');
const earAt = (ctx, x, y, s, sx = 1) => put(ctx, x, y, s * sx, () => { ink(ctx, EAR, PAL.skin); stroke(ctx, 'M 4 -7 C 12 -6 13 4 7 9', LW * 0.75); });
const RIBS = (ctx, x0, x1, y0, y1) => { for (let x = x0 + 9; x < x1 - 4; x += 13) line(ctx, [[x, y0 + 5], [x, y1 - 5]], 2, PAL.beanieRib); };

function beanie(ctx, dome, cuff, [x0, x1], seams) {
  ink(ctx, dome, PAL.beanie);
  within(ctx, dome, () => seams.forEach(s => stroke(ctx, s, 2.2, PAL.beanieRib)));
  ctx.fillStyle = PAL.beanie; ctx.fill(cuff);
  within(ctx, cuff, () => RIBS(ctx, x0, x1, -182, -144));
  ink(ctx, cuff);
}
const cuffPath = (x, w, skew = 0) => { const c = new Path2D(); c.moveTo(x, -178 + skew); c.lineTo(x + w, -178 - skew); c.quadraticCurveTo(x + w + 6, -162, x + w, -146 - skew); c.lineTo(x, -146 + skew); c.quadraticCurveTo(x - 6, -162, x, -178 + skew); return c; };

// The faces stretch at the chin as the jaw drops (j px).
const HEAD_FRONT = (j = 0) => P(`M 0 ${-4 + j} C 48 ${-4 + j} 82 ${-40 + j * 0.5} 86 -104 C 90 -160 60 -196 0 -196 C -60 -196 -90 -160 -86 -104 C -82 ${-40 + j * 0.5} -48 ${-4 + j} 0 ${-4 + j} Z`);
const HEAD_34 = (j = 0) => P(`M 20 ${-4 + j} C 62 ${-6 + j} 86 ${-44 + j * 0.5} 88 -104 C 90 -162 56 -196 -4 -196 C -64 -196 -92 -160 -88 -104 C -84 ${-46 + j * 0.5} -34 ${-4 + j} 20 ${-4 + j} Z`);
const HEAD_SIDE = (j = 0) => P(`M -34 ${-2 + j * 0.6} C 4 ${-2 + j} 34 ${j} 48 ${-10 + j} C 60 ${-20 + j} 62 ${-32 + j * 0.8} 64 ${-40 + j * 0.5} C 68 -44 70 -48 70 -54 C 70 -58 71 -60 72 -62 C 96 -60 102 -86 80 -92 C 82 -112 84 -132 82 -150 C 78 -180 44 -196 -4 -196 C -62 -196 -94 -156 -92 -104 C -90 -62 -68 ${-28 + j * 0.5} -34 ${-2 + j * 0.6} Z`);
const SIDEBURN = P('M 72 -148 L 86 -148 L 85 -120 C 81 -117 76 -119 74 -126 Z');

function headFront(ctx, p) {
  const jaw = jawOf(p);
  earAt(ctx, -84, -104, -1); earAt(ctx, 84, -104, 1);
  ink(ctx, HEAD_FRONT(jaw), PAL.skin);
  for (const s of [-1, 1]) put(ctx, 0, 0, s, () => ink(ctx, SIDEBURN, PAL.hair, LW * 0.8));
  for (const s of [-1, 1]) {
    put(ctx, s * 30, -104, 1, () => eye(ctx, p, s, FACE));
    put(ctx, s * 30, -140, 1, () => brow(ctx, p, s));
  }
  stroke(ctx, 'M -5 -86 C -15 -70 -11 -62 -1 -62 C 7 -62 12 -66 12 -72', LW);
  say(ctx, p, 0, -44, 1, jaw);
  beanie(ctx, P('M -94 -160 C -98 -222 -54 -250 0 -250 C 54 -250 98 -222 94 -160 Z'), cuffPath(-97, 194),
    [-97, 97], ['M 0 -250 L 0 -170', 'M -40 -244 C -54 -220 -60 -196 -62 -170', 'M 40 -244 C 54 -220 60 -196 62 -170']);
}

function head34(ctx, p) {
  const jaw = jawOf(p);
  ink(ctx, HEAD_34(jaw), PAL.skin);
  earAt(ctx, -64, -104, -1);
  ink(ctx, P('M -52 -148 L -40 -148 L -41 -122 C -45 -119 -50 -121 -51 -127 Z'), PAL.hair, LW * 0.8);
  put(ctx, 50, -104, 0.74, () => eye(ctx, p, 1, { ...FACE, look: 0.35 }));
  put(ctx, -6, -104, 0.96, () => eye(ctx, p, -1, { ...FACE, look: 0.35 }));
  put(ctx, 50, -140, 0.72, () => brow(ctx, p, 1));
  put(ctx, -6, -140, 0.95, () => brow(ctx, p, -1));
  ink(ctx, P('M 70 -90 C 92 -80 98 -66 82 -61 C 76 -60 71 -62 68 -65 L 66 -80 Z'), PAL.skin, 0);
  stroke(ctx, 'M 70 -90 C 92 -80 98 -66 82 -61 C 76 -60 71 -62 68 -65', LW);
  say(ctx, p, 42, -44, 0.84, jaw);
  beanie(ctx, P('M -96 -160 C -98 -222 -50 -250 4 -250 C 58 -250 96 -222 92 -160 Z'), cuffPath(-99, 194, 2),
    [-99, 95], ['M 26 -248 C 36 -224 42 -196 44 -170', 'M -22 -246 C -34 -220 -40 -196 -42 -170']);
}

function headSide(ctx, p) {
  const jaw = jawOf(p);
  ink(ctx, HEAD_SIDE(jaw), PAL.skin);
  earAt(ctx, -22, -104, -1, 1.1);
  ink(ctx, P('M -8 -148 L 6 -148 L 5 -122 C 1 -119 -4 -121 -6 -127 Z'), PAL.hair, LW * 0.8);
  stroke(ctx, 'M 78 -68 C 82 -70 84 -74 82 -78', LW * 0.8);
  put(ctx, 48, -104, 0.5, () => eye(ctx, p, -1, { ...FACE, look: 0.8 }));
  put(ctx, 46, -140, 0.6, () => brow(ctx, p, -1));
  say(ctx, p, 53, -44, 0.58, jaw);
  beanie(ctx, P('M -100 -160 C -104 -222 -56 -252 0 -252 C 54 -252 90 -222 86 -160 Z'), cuffPath(-102, 192, 3),
    [-102, 90], ['M 6 -251 C 14 -224 18 -196 20 -170', 'M -52 -238 C -64 -214 -70 -192 -72 -170']);
}

// From behind there is no chin: the skull narrows into the neck, and the hair is cut short at the nape.
const SKULL = P('M -30 0 C -36 -30 -82 -52 -86 -104 C -90 -160 -60 -196 0 -196 C 60 -196 90 -160 86 -104 C 82 -52 36 -30 30 0 Z');
const NAPE = P('M -100 -96 L -74 -78 C -60 -62 -44 -52 -32 -48 L -24 -40 L -12 -47 L 0 -40 L 12 -47 L 24 -40 L 32 -48 C 44 -52 60 -62 74 -78 L 100 -96 L 100 -210 L -100 -210 Z');
function headBack(ctx) {
  earAt(ctx, -84, -104, -1); earAt(ctx, 84, -104, 1);
  ink(ctx, SKULL, PAL.skin);
  within(ctx, SKULL, () => ink(ctx, NAPE, PAL.hair, LW * 0.8));
  ink(ctx, SKULL);
  beanie(ctx, P('M -94 -160 C -98 -222 -54 -250 0 -250 C 54 -250 98 -222 94 -160 Z'), cuffPath(-97, 194),
    [-97, 97], ['M 0 -250 L 0 -170', 'M -40 -244 C -54 -220 -60 -196 -62 -170', 'M 40 -244 C 54 -220 60 -196 62 -170']);
}

// From behind and to the side: the back of his head, a sliver of cheek, and the near ear.
function head34Back(ctx) {
  const head = P('M -30 0 C -40 -30 -84 -50 -88 -104 C -90 -162 -56 -196 4 -196 C 64 -196 92 -160 88 -104 C 86 -60 60 -30 34 -2 Z');
  ink(ctx, head, PAL.skin);
  within(ctx, head, () => ink(ctx, P('M 58 -210 C 62 -160 60 -124 48 -96 C 40 -76 30 -60 20 -50 L 10 -44 L 0 -50 L -12 -42 L -22 -50 C -44 -56 -72 -74 -100 -96 L -100 -210 Z'), PAL.hair, LW * 0.8));
  ink(ctx, head);
  earAt(ctx, 64, -104, 1);
  beanie(ctx, P('M -92 -160 C -96 -222 -58 -250 -4 -250 C 50 -250 98 -222 96 -160 Z'), cuffPath(-95, 194, -2),
    [-95, 99], ['M -26 -248 C -36 -224 -42 -196 -44 -170', 'M 22 -246 C 34 -220 40 -196 42 -170']);
}
const HEADS = { 0: headFront, 1: head34, 2: headSide, 3: head34Back, 4: headBack };

function drawNeck(ctx) { ink(ctx, P('M -22 20 L -22 -34 L 22 -34 L 22 20 Z'), PAL.skin); }

// ---------- the body ----------
// In the torso's space: the hips at the origin, the shoulders about 250 up.
const band = (ctx, clip, y0, h) => within(ctx, clip, () => { ctx.fillStyle = PAL.stripe; ctx.fillRect(-120, y0, 240, h); line(ctx, [[-120, y0], [120, y0]], 1.8); line(ctx, [[-120, y0 + h], [120, y0 + h]], 1.8); });
const strap = (ctx, clip, pts, w = 11) => within(ctx, clip, () => { line(ctx, pts, w + 3.6); line(ctx, pts, w, PAL.stripe); });
function belt(ctx, x0, x1, buckle) {
  ink(ctx, P(`M ${x0} -12 L ${x1} -12 L ${x1} 6 L ${x0} 6 Z`), PAL.belt, LW * 0.8);
  if (buckle !== undefined) ink(ctx, P(`M ${buckle - 11} -14 h 22 v 22 h -22 Z`), PAL.buckle, LW * 0.8);
}
function badge(ctx, x, y, sx) {
  put(ctx, x, y, sx, () => {
    line(ctx, [[0, -26], [0, -14]], 2.2);
    ink(ctx, P('M -12 -14 h 24 v 32 h -24 Z'), PAL.badge, 2.4);
    ctx.fillStyle = PAL.badgeTop; ctx.fillRect(-10.8, -12.8, 21.6, 8);
    line(ctx, [[-6, 8], [6, 8]], 2); line(ctx, [[-6, 12], [2, 12]], 2);
  });
}

function torsoFront(ctx) {
  const shirt = P('M -62 4 C -66 -70 -76 -180 -80 -226 C -82 -248 -66 -258 -34 -260 Q 0 -244 34 -260 C 66 -258 82 -248 80 -226 C 76 -180 66 -70 62 4 Z');
  ink(ctx, shirt, PAL.shirt);
  stroke(ctx, 'M -30 -258 Q 0 -238 30 -258', LW * 0.8);
  belt(ctx, -62, 62, 0);
  for (const s of [-1, 1]) {
    put(ctx, 0, 0, s, () => {
      const panel = P('M -62 -6 L -20 -6 C -22 -100 -26 -190 -28 -258 L -50 -260 C -54 -236 -66 -222 -79 -214 C -74 -160 -66 -70 -62 -6 Z');
      ink(ctx, panel, PAL.vest);
      band(ctx, panel, -66, 14); band(ctx, panel, -108, 14);
      strap(ctx, panel, [[-40, -108], [-40, -262]]);
      ink(ctx, panel);
    });
  }
  badge(ctx, -48, -168, 1);
}
function torso34(ctx) {
  const shirt = P('M -52 4 C -58 -70 -66 -180 -70 -228 C -70 -250 -52 -260 -22 -260 Q 20 -246 44 -258 C 70 -256 80 -240 78 -222 C 76 -180 72 -70 60 4 Z');
  ink(ctx, shirt, PAL.shirt);
  stroke(ctx, 'M -6 -258 Q 20 -240 42 -256', LW * 0.8);
  belt(ctx, -52, 60, 26);
  const near = P('M -52 -6 L 14 -6 C 12 -100 8 -190 4 -258 L -20 -260 C -26 -236 -46 -222 -67 -214 C -62 -160 -56 -70 -52 -6 Z');
  const far = P('M 38 -6 L 60 -6 C 70 -70 74 -170 76 -214 C 70 -222 62 -236 56 -256 L 44 -256 C 42 -190 40 -100 38 -6 Z');
  for (const panel of [near, far]) {
    ink(ctx, panel, PAL.vest);
    band(ctx, panel, -66, 14); band(ctx, panel, -108, 14);
  }
  strap(ctx, near, [[-12, -108], [-10, -262]]);
  strap(ctx, far, [[62, -108], [60, -262]], 8);
  ink(ctx, near); ink(ctx, far);
  badge(ctx, -26, -168, 0.88);
}
function torsoSide(ctx) {
  const shirt = P('M -40 4 C -46 -80 -50 -190 -46 -236 C -42 -256 -20 -262 4 -262 C 30 -262 46 -250 50 -224 C 56 -180 54 -90 46 4 Z');
  ink(ctx, shirt, PAL.shirt);
  belt(ctx, -40, 48);
  const vest = P('M -40 -6 L 40 -6 C 48 -90 50 -170 46 -222 C 40 -248 28 -258 8 -262 L -8 -262 C -30 -258 -44 -246 -46 -230 C -48 -180 -46 -80 -40 -6 Z');
  ink(ctx, vest, PAL.vest);
  band(ctx, vest, -66, 14); band(ctx, vest, -108, 14);
  ink(ctx, vest);
}
function torsoBack(ctx) {
  const shirt = P('M -62 4 C -66 -70 -76 -180 -80 -226 C -82 -248 -66 -258 -34 -260 Q 0 -254 34 -260 C 66 -258 82 -248 80 -226 C 76 -180 66 -70 62 4 Z');
  ink(ctx, shirt, PAL.shirt);
  belt(ctx, -62, 62);
  const vest = P('M -62 -6 L 62 -6 C 66 -70 74 -170 79 -214 C 66 -222 54 -236 50 -258 Q 0 -250 -50 -258 C -54 -236 -66 -222 -79 -214 C -74 -170 -66 -70 -62 -6 Z');
  ink(ctx, vest, PAL.vest);
  band(ctx, vest, -66, 14); band(ctx, vest, -108, 14);
  strap(ctx, vest, [[-40, -108], [-40, -262]]); strap(ctx, vest, [[40, -108], [40, -262]]);
  ink(ctx, vest);
}
const torso34Back = ctx => put(ctx, 0, 0, 0.9, () => torsoBack(ctx));
const TORSOS = { 0: torsoFront, 1: torso34, 2: torsoSide, 3: torso34Back, 4: torsoBack };

// The seat of his trousers, joining the legs under the vest.
const PELVIS = { 0: P('M -64 -12 L 64 -12 L 62 34 Q 0 46 -62 34 Z'), 1: P('M -54 -12 L 62 -12 L 60 34 Q 6 44 -52 34 Z'), 2: P('M -42 -12 L 48 -12 L 46 32 Q 2 40 -40 32 Z') };
const pelvis = path => ctx => ink(ctx, path, PAL.pants);

// ---------- limbs ----------
const ARM = 150, FORE = 138, THIGH = 196, SHIN = 190;
const arm = S => (ctx, pose) => { noodle(ctx, ARM, FORE, v(pose, `fore${S}.r`), 27, PAL.skin, { w2: 25 }); sleeve(ctx, 60, 42, PAL.shirt); };
const leg = S => (ctx, pose) => noodle(ctx, THIGH, SHIN, v(pose, `shin${S}.r`), 46, PAL.pants, { w2: 42, round: 0.3 });
const HAND_LOOK = { skin: PAL.skin, size: 1.05 };

// Work boots, one drawing per angle; in the foot's space, the ankle at the origin, the sole at 38.
function bootFront(ctx) {
  ink(ctx, P('M -24 -8 L 24 -8 L 25 14 C 34 18 36 38 22 38 L -22 38 C -36 38 -34 18 -25 14 Z'), PAL.boot);
  ink(ctx, P('M -32 30 L 32 30 L 30 40 L -30 40 Z'), PAL.sole, LW * 0.8);
  stroke(ctx, 'M -20 20 Q 0 12 20 20', LW * 0.75);
  line(ctx, [[-6, -4], [6, 2]], 2); line(ctx, [[-6, 4], [6, 10]], 2);
}
function boot34(ctx) {
  ink(ctx, P('M -24 -8 L 22 -8 L 24 12 C 40 14 50 24 48 32 L 48 38 L -26 38 L -27 16 Z'), PAL.boot);
  ink(ctx, P('M -28 30 L 50 30 L 50 40 L -28 40 Z'), PAL.sole, LW * 0.8);
  stroke(ctx, 'M 22 16 C 30 20 34 26 34 30', LW * 0.75);
  line(ctx, [[0, -4], [14, 2]], 2); line(ctx, [[2, 4], [16, 10]], 2);
}
function bootSide(ctx) {
  ink(ctx, P('M -22 -8 L 18 -8 L 20 10 C 42 12 58 20 58 30 L 58 38 L -24 38 L -24 18 Z'), PAL.boot);
  ink(ctx, P('M -26 30 L 60 30 L 60 40 L -26 40 Z'), PAL.sole, LW * 0.8);
  stroke(ctx, 'M 30 14 C 36 18 40 24 40 30', LW * 0.75);
  line(ctx, [[4, -4], [18, 0]], 2); line(ctx, [[8, 4], [22, 8]], 2);
}
function bootBack(ctx) {
  ink(ctx, P('M -24 -8 L 24 -8 L 26 30 L -26 30 Z'), PAL.boot);
  ink(ctx, P('M -28 28 L 28 28 L 28 40 L -28 40 Z'), PAL.sole, LW * 0.8);
  ink(ctx, P('M -6 -10 h 12 v 12 h -12 Z'), PAL.toe, 2);
}
const BOOTS = { 0: bootFront, 1: boot34, 2: bootSide, 4: bootBack };
// A boot from the four drawings (3/4 back shows the profile's), 1.2x; facing us, the toes turn out
// a little.
const boots = side => angleSet('body', BOOTS, {
  fallback: { 3: 2 },
  around(ctx, n, draw) {
    ctx.save(); ctx.scale(1.2, 1.2);
    if (n === 0) { ctx.scale(side, 1); ctx.rotate(0.06); }
    draw();
    ctx.restore();
  },
});

// ---------- poses ----------
export const REST = {
  'armL.r': 0.1, 'foreL.r': -0.1, 'armR.r': -0.1, 'foreR.r': 0.1, 'handL.shape': HAND.relaxed, 'handR.shape': HAND.relaxed,
  'legL.r': 0.02, 'legR.r': -0.02, 'shinL.r': 0, 'shinR.r': 0, ...FACES.neutral,
};
export const EXPR = FACES;
export const POSES = {
  rest: { 'armL.r': 0.1, 'foreL.r': -0.1, 'armR.r': -0.1, 'foreR.r': 0.1, 'handL.shape': HAND.relaxed, 'handR.shape': HAND.relaxed, 'handL.r': 0, 'handR.r': 0, 'handL.flip': 0, 'handR.flip': 0 },
  wave: { 'armR.r': -2.5, 'foreR.r': -0.45, 'handR.shape': HAND.palm, 'handR.r': 0 },
  point: { 'armR.r': -1.5, 'foreR.r': -0.05, 'handR.shape': HAND.point, 'handR.r': 0.1 },
  shrug: { 'armL.r': 0.55, 'foreL.r': 1.3, 'armR.r': -0.55, 'foreR.r': -1.3, 'handL.shape': HAND.open, 'handR.shape': HAND.open, 'handL.r': 0.9, 'handR.r': -0.9 },
  thumbsUp: { 'armR.r': -0.25, 'foreR.r': -1.35, 'handR.shape': HAND.thumb, 'handR.flip': 1, 'handR.r': 0.1 },
  stop: { 'armR.r': -0.75, 'foreR.r': -2.1, 'handR.shape': HAND.palm, 'handR.r': 0.3 },
  hips: { 'armL.r': 0.75, 'foreL.r': -1.6, 'armR.r': -0.75, 'foreR.r': 1.6, 'handL.shape': HAND.fist, 'handR.shape': HAND.fist, 'handL.r': 0.5, 'handR.r': -0.5 },
  cheer: { 'armL.r': 2.7, 'foreL.r': 0.25, 'armR.r': -2.7, 'foreR.r': -0.25, 'handL.shape': HAND.fist, 'handR.shape': HAND.fist },
  ok: { 'armR.r': -0.35, 'foreR.r': -2.0, 'handR.shape': HAND.ok, 'handR.flip': 1, 'handR.r': -0.2 },
  peace: { 'armR.r': -0.35, 'foreR.r': -2.2, 'handR.shape': HAND.peace, 'handR.flip': 1, 'handR.r': 0.1 },
};

// ---------- the character ----------
export const dex = defineCutout({
  id: 'dex', version: 1, name: 'Dex', height: 950,
  bones: [
    { name: 'hips', at: [0, -424] },
    { name: 'legL', parent: 'hips', at: [-34, -4], len: THIGH, z: 0, piece: 'legL' },
    { name: 'shinL', parent: 'legL', at: [0, THIGH], len: SHIN, z: 0 },
    { name: 'footL', parent: 'shinL', at: [0, SHIN], z: 0.1, piece: 'footL' },
    { name: 'legR', parent: 'hips', at: [34, -4], len: THIGH, z: 0, piece: 'legR' },
    { name: 'shinR', parent: 'legR', at: [0, THIGH], len: SHIN, z: 0 },
    { name: 'footR', parent: 'shinR', at: [0, SHIN], z: 0.1, piece: 'footR' },
    { name: 'pelvis', parent: 'hips', at: [0, 0], z: 1, piece: 'pelvis' },
    { name: 'torso', parent: 'hips', at: [0, 0], z: 2, piece: 'torso' },
    { name: 'neck', parent: 'torso', at: [0, -250], z: 1.5, piece: 'neck' },
    { name: 'head', parent: 'neck', at: [0, -22], z: 4, piece: 'head' },
    { name: 'armL', parent: 'torso', at: [-72, -236], len: ARM, z: 5.5, piece: 'armL' },
    { name: 'foreL', parent: 'armL', at: [0, ARM], len: FORE, z: 5.5 },
    { name: 'handL', parent: 'foreL', at: [0, FORE - 2], z: 6, piece: 'handL' },
    { name: 'armR', parent: 'torso', at: [72, -236], len: ARM, z: 5.5, piece: 'armR' },
    { name: 'foreR', parent: 'armR', at: [0, ARM], len: FORE, z: 5.5 },
    { name: 'handR', parent: 'foreR', at: [0, FORE - 2], z: 6, piece: 'handR' },
  ],
  tags: {
    root: 'hips', chest: 'torso', look: 'head',
    chains: {
      armL: { bones: ['armL', 'foreL', 'handL'], side: 'L', kind: 'arm', bend: 'back' },
      armR: { bones: ['armR', 'foreR', 'handR'], side: 'R', kind: 'arm', bend: 'back' },
      legL: { bones: ['legL', 'shinL', 'footL'], side: 'L', kind: 'leg', bend: 'forward' },
      legR: { bones: ['legR', 'shinR', 'footR'], side: 'R', kind: 'leg', bend: 'forward' },
    },
    // offsets per angle, facing right (mirrored facing left): the neck comes forward of the shoulders
    turn: { offsets: { 1: { 'neck.x': 8 }, 2: { 'neck.x': 12 }, 3: { 'neck.x': -4 } } },
  },
  pieces: {
    head: angleSet('head', HEADS),
    mouth: mouthChart(),
    neck: { draw: drawNeck },
    torso: angleSet('body', TORSOS),
    pelvis: angleSet('body', { 0: pelvis(PELVIS[0]), 1: pelvis(PELVIS[1]), 2: pelvis(PELVIS[2]) }, { fallback: { 3: 1, 4: 0 } }),
    armL: { draw: arm('L') }, armR: { draw: arm('R') },
    handL: handPiece('handL', -1, HAND_LOOK), handR: handPiece('handR', 1, HAND_LOOK),
    legL: { draw: leg('L') }, legR: { draw: leg('R') },
    footL: boots(-1), footR: boots(1),
  },
  // knees bend forward, never back (for facing right; mirrored facing left)
  limits: { shinL: [-0.15, 2.9], shinR: [-0.15, 2.9] },
  rest: REST, poses: POSES, expressions: EXPR, clips: CLIPS,
  life: { seed: 7 },
});

// Dex at time t: see cutoutPose in cutout.js.
export const pose = dex.pose;
