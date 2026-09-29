// Tilly v2, a forklift truck with a face, in 3D: import { tilly3dV2, tillyPose } from '/@kit/characters/tilly3d-v2.js'.
// The first Tilly (tilly3d.js) is a toy robot; this one is a real 2.5 t counterbalance truck, to scale,
// with her face in her: two big eyes in the windscreen of her overhead guard, with lids that blink and
// show her moods, and a mouth on the front of her body, under the windscreen and behind the mast.
// Cel-shaded and inked like the rest of the cast.
//
// - A three-stage mast with full free lift, so it stands only 1.6 m high lowered, under her eyes: the
//   carriage first rises inside it on chains, over sheaves on the free-lift cylinders, to the mast's
//   top; then the middle stage rises on the lift cylinders and the inner stage twice as fast. Once
//   the mast is up (forks.y over 0.32) its rails cross her eyes, so bring her forks down to act.
// - The mast tilts on the drive axle, pushed by tilt cylinders; the forks slide along the carriage.
// - Big drive wheels at the front and small steer wheels at the back, which turn; an overhead guard
//   over the seat and steering wheel; a heavy rounded counterweight; a beacon, work lights, mirrors.
//
// Units are millimetres: she is 2.2 m to the top of the guard, 1.16 m wide, 2.6 m long to the face of
// her forks and 3.7 m to their tips, so she stands at scale 1 in a millimetre world (the first Tilly
// needs 3.2). Her origin is on the floor, in the middle of her wheelbase; she faces +z at yaw 0.
// tilly3dV2(layer).update(pose, { x, y, z, scale }) puts that point at (x, -y, z), as tilly3d's does.
//
// She takes the first Tilly's pose keys, so tillyPose (re-exported here) drives her too:
//   yaw; body.y (in the first Tilly's units, 3.2 mm), body.pitch, body.roll, body.sy: she rocks and
//     dips on her tyres, a third as far as the first Tilly (she weighs four tonnes)
//   cab.yaw, cab.nod, cab.tilt: her face turns, nods and tilts across the windscreen (the guard itself
//     is bolted down), and her eyes look that way
//   forks.y (0..1 of the lift, 3 m), forks.tilt + mast.tilt (the mast tilts, -6 to +11 degrees; +
//     tips the forks up), forks.spread (0..1, the forks slide apart), forkL.tilt / forkR.tilt (one
//     fork lifts its tip, for acting; L is on our left as she faces us)
//   eyes.x, eyes.y (-1..1, + looks to our right and down), eyes.blink, eyes.open, eyes.mood (0 normal,
//     1 happy, 2 wow, 3 cross, 4 sad), brows.up (lifts the lids), mouth.open, mouth.smile (0 flat,
//     0.5 her usual, 1 a grin), beacon (0..1) and beacon.spin, wheels (as tillyPose rolls them)
// and a few of her own:
//   steer (radians: the steer wheels' turn about y; driveAlong(path, t), below, works it out),
//   lids.drop, lids.slant (+ cross), eyes.squint, eyes.pupil (1 normal), and lip-sync's mouth.wide,
//   mouth.round, mouth.teeth, mouth.tongue and mouth.press (mouth(t) from lipsync.js), if given.
import { mergeGeometries, mergeVertices, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp, TAU } from '../core.js';
import { lag } from '../spring.js';
import { paintedTexture, THREE } from '../scene3d.js';
import { inkMaterial, joint, roundBox, toon } from '../toon3d.js';
import { INK } from '../toon.js';

export { REST, tillyPose } from './tilly3d.js';

export const PAL = {
  paint: '#F6B41C', charcoal: '#383C46', mast: '#2F333B', inner: '#474C57', dark: '#23262C', steel: '#6A717C', chrome: '#C7CCD3',
  fork: '#2C3036', chain: '#8E959F', tyre: '#2B2D32', tread: '#18191D', rim: '#F6B41C', seat: '#2B2E35', belt: '#FF6B1A',
  stripe: '#1E9E8F', glass: '#18242F', lamp: '#FFF3D2', tail: '#E23A2C', beacon: '#FF8A1A',
  white: '#FBFAF3', shade: '#D2D7DD', lidShade: '#E29C12', iris: '#23897B', irisDark: '#114640', irisLight: '#5CC9B4', pupil: '#101318',
  mouth: '#3B1620', tongue: '#D9707A', teeth: '#FFFFFF',
};

// ---------- her proportions, in mm ----------
const FRONT = { z: 800, r: 330, w: 190, x: 485, rim: 185 };      // drive wheels, a 7.00-12 tyre
const BACK = { z: -800, r: 270, w: 150, x: 470, rim: 150 };      // steer wheels, a 6.00-9
const PIVOT = 300;                                              // she rocks on her tyres about this height
const MAST = { y: 420, z: 1200 };                               // where the mast tilts, on the drive axle (just clear of the tyres)
const LIFT = 3000, FREE = 950;                                  // the forks' travel, and how much of it is free lift, inside the mast
const LOW = -410;                                               // the carriage in the mast, lowered: the forks 10 mm off the floor
const RAIL = 1500;                                              // each stage's length: the mast stands 110 to 1,610 mm lowered
const SHEAVE = 575;                                             // the free-lift sheaves' middle, lowered, in the inner stage
const TILT = [-0.1, 0.19];                                      // how far the mast tilts, forwards and back
const UNIT = 3.2;                                               // the first Tilly's units, in mm (for body.y)
const OLD_R = 46;                                               // the first Tilly's drive wheel radius (for wheels)
const GLASS = { w: 900, h: 990, y: 1655, z: 676, rake: Math.atan2(339, 930), bow: 28 };
const COWL = Math.atan2(120, 440);                              // how far the front of her body leans back
export const DIMS = { length: 2610, width: 1160, height: 2200, wheelbase: 1600, forks: 1070, lift: LIFT, front: 1330, back: -1280 };

// ---------- building ----------
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// A mesh with an ink outline. The outline gets its own smooth normals, so it stays whole round sharp
// edges (toon3d's solid() pushes the outline along the mesh's own normals, which split at corners).
const hulls = new Map();
function part(geo, mat, { ink = 2.2, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  if (ink) {
    let hull = hulls.get(geo);
    if (!hull) {
      hull = geo.clone();
      for (const k of Object.keys(hull.attributes)) if (k !== 'position') hull.deleteAttribute(k);
      hull = mergeVertices(hull); hull.computeVertexNormals();
      hulls.set(geo, hull);
    }
    const o = new THREE.Mesh(hull, inkMaterial(ink)); o.raycast = () => {}; m.add(o);
  }
  return m;
}
const put = (parent, mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
const box = (parent, [w, h, d], at, mat, r = 10, o) => put(parent, part(roundBox(w, h, d, r), mat, o), ...at);
// a cylinder along x or y
const rod = (r, len, seg = 20, axis = 'y') => { const g = new THREE.CylinderGeometry(r, r, len, seg); if (axis === 'x') g.rotateZ(Math.PI / 2); return g; };
// z' = z + k * y: leans a part back (k < 0) as her body's front and the guard's legs lean
const shearZ = k => new THREE.Matrix4().set(1, 0, 0, 0, 0, 1, 0, 0, 0, k, 1, 0, 0, 0, 0, 1);

// A side profile, drawn by draw(shape) in (z, y), extruded w wide across x, its edges rounded by r.
function prism(draw, w, r = 20) {
  const s = new THREE.Shape(); draw(s);
  const g = new THREE.ExtrudeGeometry(s, { depth: w - 2 * r, bevelEnabled: r > 0, bevelThickness: r, bevelSize: r, bevelOffset: -r, bevelSegments: 3, curveSegments: 36 });
  g.translate(0, 0, -(w - 2 * r) / 2); g.rotateY(-Math.PI / 2);
  return g;
}
const creased = (g, angle = 0.6) => toCreasedNormals(g, angle);

// A tyre: its cross-section (bead, sidewall, rounded shoulders, tread) turned round its axle, along x.
// v runs round the cross-section, so the tread's grooves are painted where v is in TREAD.
const TREAD = [0.36, 0.64];
function tyreGeometry({ r, w, rim }) {
  const h = w / 2, sh = Math.min(40, (r - rim) * 0.3), pts = [[rim + 4, -h + 16], [rim + 14, -h + 3]];
  for (let i = 0; i <= 5; i++) pts.push([lerp(rim + 30, r - sh, i / 5), -h]);
  for (let i = 1; i <= 7; i++) { const a = (Math.PI / 2) * (i / 7); pts.push([r - sh + Math.sin(a) * sh, -h + sh - Math.cos(a) * sh]); }
  for (let i = 1; i <= 6; i++) pts.push([r, lerp(-h + sh, h - sh, i / 6)]);
  for (let i = 1; i <= 7; i++) { const a = (Math.PI / 2) * (i / 7); pts.push([r - sh + Math.cos(a) * sh, h - sh + Math.sin(a) * sh]); }
  for (let i = 1; i <= 5; i++) pts.push([lerp(r - sh, rim + 30, i / 5), h]);
  pts.push([rim + 14, h - 3], [rim + 4, h - 16]);
  const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 72);
  g.rotateZ(-Math.PI / 2);
  return g;
}
const treadTexture = () => paintedTexture(1024, 128, (g, w, h) => {
  g.fillStyle = PAL.tyre; g.fillRect(0, 0, w, h);
  const y0 = h * (1 - TREAD[1]), y1 = h * (1 - TREAD[0]), n = 22;
  g.strokeStyle = PAL.tread; g.lineWidth = 9; g.lineCap = 'butt';
  for (let i = 0; i < n; i++) {                                     // chevrons across the tread
    const x = (i / n) * w;
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x + w / n * 0.45, (y0 + y1) / 2); g.lineTo(x, y1); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, h * 0.12, w, 5); g.fillRect(0, h * 0.86, w, 5);   // a ring on each sidewall
});

// ---------- the face ----------
// Her eyes are painted on the windscreen and her mouth on the front of her body, in millimetres from the
// middle of each, x to the right as we look at her and y up.
const EYE = { x: 198, y: 200, a: 165, b: 200, R: 360 };           // each eye's middle and half size; R, how round her face turns
const PHI = Math.asin(EYE.x / EYE.R);
// The lids for each mood, in the eye's half-heights from its middle: the upper lid's edge (up, how
// much it arches, slant: + lower at the inner corner), the lower lid's (low, larch), and the pupil.
const MOODS = [
  { up: 0.62, arch: 0.16, slant: 0, low: -0.92, larch: 0.04 },                       // 0 normal
  { up: 0.72, arch: 0.14, slant: 0, low: -0.6, larch: 0.46 },                        // 1 happy: the lower lids smile
  { up: 1.12, arch: 0.08, slant: 0, low: -1.1, larch: 0, pupil: 0.7, iris: 0.92 },   // 2 wow
  { up: 0.44, arch: 0.04, slant: 0.44, low: -0.84, larch: 0.06 },                    // 3 cross
  { up: 0.42, arch: 0.1, slant: -0.36, low: -0.9, larch: 0.02 },                     // 4 sad
];

function eyeShape(cx, cy, a, b, n = 2.35) {
  const p = new Path2D();
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * TAU, c = Math.cos(t), s = Math.sin(t);
    const x = cx + a * Math.sign(c) * Math.abs(c) ** (2 / n), y = cy + b * Math.sign(s) * Math.abs(s) ** (2 / n);
    if (i) p.lineTo(x, y); else p.moveTo(x, y);
  }
  p.closePath();
  return p;
}
const disc = (g, x, y, r, color) => { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };

function paintFace(g, p) {
  const k = (key, d = 0) => p[key] ?? d;
  const W = GLASS.w / 2, H = GLASS.h / 2;
  // tinted glass, which the cab shows through, lighter low down
  const glass = g.createLinearGradient(0, H, 0, -H);
  glass.addColorStop(0, 'rgba(18,29,40,0.8)'); glass.addColorStop(1, 'rgba(44,62,79,0.6)');
  g.fillStyle = glass; g.fillRect(-W, -H, 2 * W, 2 * H);
  // the face turns (slides round, the far eye narrowing), nods and tilts on the glass
  const turn = clamp(k('cab.yaw') * 0.5, -0.45, 0.45), nod = clamp(k('cab.nod'), -0.6, 0.6);
  const lookX = clamp(k('eyes.x') + k('cab.yaw') * 0.45, -1.3, 1.3), lookY = clamp(k('eyes.y') + nod * 0.4, -1.3, 1.3);
  const mood = MOODS[clamp(Math.round(k('eyes.mood')), 0, MOODS.length - 1)];
  const up = mood.up + (k('eyes.open', 1) - 1) * 0.6 + k('brows.up') * 0.14 - k('lids.drop');
  const slant = mood.slant + k('lids.slant') * 0.45, low = mood.low + k('eyes.squint') * 0.45, larch = mood.larch + k('eyes.squint') * 0.15;
  const shut = clamp(k('eyes.blink'));
  g.save();
  g.translate(0, EYE.y - nod * 80); g.rotate(clamp(k('cab.tilt'), -0.5, 0.5) * 0.4);
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (const s of [-1, 1]) {
    const phi = s * PHI + turn, cx = EYE.R * Math.sin(phi);
    const a = EYE.a * Math.min(1.04, Math.cos(phi) / Math.cos(PHI)), b = EYE.b;
    const shape = eyeShape(cx, 0, a, b);
    const lower = xn => (low + larch * (1 - xn * xn)) * b;
    const upper = xn => { const o = (up + mood.arch * (1 - xn * xn) + slant * s * xn) * b, l = lower(xn) + 0.05 * b; return Math.max(l, lerp(o, l, shut)); };
    const edge = fn => Array.from({ length: 25 }, (_, i) => { const xn = -1.1 + (2.2 * i) / 24; return [cx + xn * a, fn(xn)]; });
    const lid = (pts, dir) => { const q = new Path2D(); pts.forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y))); q.lineTo(cx + 1.2 * a, dir * 1.3 * b); q.lineTo(cx - 1.2 * a, dir * 1.3 * b); q.closePath(); return q; };
    const top = edge(upper), bottom = edge(lower);
    g.save(); g.clip(shape);
    g.fillStyle = PAL.white; g.fillRect(cx - a - 5, -b - 5, 2 * a + 10, 2 * b + 10);
    // the iris and pupil, where she looks, with two highlights
    const ir = 82 * (mood.iris ?? 1), pr = 37 * k('eyes.pupil', 1) * (mood.pupil ?? 1);
    const ix = cx + lookX * a * 0.42, iy = -lookY * b * 0.4;
    disc(g, ix, iy, ir, PAL.irisDark); disc(g, ix, iy, ir * 0.86, PAL.iris);
    g.fillStyle = PAL.irisLight; g.beginPath(); g.ellipse(ix, iy - ir * 0.38, ir * 0.6, ir * 0.36, 0, 0, TAU); g.fill();
    disc(g, ix, iy, pr, PAL.pupil);
    disc(g, ix - ir * 0.34, iy + ir * 0.34, ir * 0.2, '#FFFFFF'); disc(g, ix + ir * 0.32, iy - ir * 0.3, ir * 0.09, '#FFFFFF');
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(ix, iy, ir, 0, TAU); g.stroke();
    // the upper lid's shadow on the white, then the lids, in her paint
    const shadow = new Path2D(); top.forEach(([x, y], i) => (i ? shadow.lineTo(x, y) : shadow.moveTo(x, y)));
    [...top].reverse().forEach(([x, y]) => shadow.lineTo(x, y - 24)); shadow.closePath();
    g.fillStyle = PAL.shade; g.fill(shadow);
    g.fillStyle = PAL.paint; g.fill(lid(top, 1)); g.fill(lid(bottom, -1));
    // the upper lid's fold, in shade, over the top part of it
    g.fillStyle = PAL.lidShade; g.fill(lid(edge(xn => lerp(upper(xn), b * (1.02 + 0.1 * (1 - xn * xn)), 0.55)), 1));
    // their edges, in ink (the lower one only while it shows)
    const line = (pts, w) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w; g.strokeStyle = INK; g.stroke(); };
    line(top, 11 + shut * 4);
    if (low + larch > -0.97 && shut < 0.85) line(bottom, 7);
    g.restore();
    g.lineWidth = 8; g.strokeStyle = INK; g.stroke(shape);
  }
  g.restore();
  // a sheen across the glass, over everything
  g.save(); g.globalAlpha = 0.07; g.fillStyle = '#FFFFFF';
  g.beginPath(); g.moveTo(-W, 120); g.lineTo(-W + 260, H); g.lineTo(-W + 420, H); g.lineTo(-W, -40); g.fill();
  g.beginPath(); g.moveTo(-W, -150); g.lineTo(-W + 500, H); g.lineTo(-W + 540, H); g.lineTo(-W, -210); g.fill();
  g.restore();
}

// The mouth: a line when shut, its corners up as she smiles; open, dark, with teeth and a tongue,
// painted over her paint on a panel that lies on the cowl and is lit as it is.
function paintMouth(g, p) {
  const k = (key, d = 0) => p[key] ?? d;
  const turn = clamp(k('cab.yaw') * 0.5, -0.45, 0.45);
  g.fillStyle = PAL.paint; g.fillRect(-320, -125, 640, 250);
  g.save();
  g.translate(Math.sin(turn) * 250, 50); g.rotate(clamp(k('cab.tilt'), -0.5, 0.5) * 0.4); g.scale(Math.cos(turn), 1);
  const open = clamp(k('mouth.open')), smile = k('mouth.smile', 0.5), wide = clamp(k('mouth.wide', 0.5)), round = clamp(k('mouth.round'));
  let hw = Math.min(212, lerp(150, 200, wide) * (1 + Math.max(0, smile - 0.5) * 0.18));   // (the chains run just outside it)
  hw = lerp(hw, 70 + open * 50, round * 0.8);
  const lift = (smile - 0.3) * 64 * (1 - round * 0.7);            // how far the corners come up
  g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round';
  if (open < 0.05) {                                             // (smile 0 frowns, 0.25 is flat)
    g.beginPath(); g.moveTo(-hw, lift); g.quadraticCurveTo(0, lift - (smile - 0.25) * 110, hw, lift);
    g.lineWidth = 14 + k('mouth.press') * 6; g.stroke();
    if (smile > 0.6) for (const s of [-1, 1]) { g.lineWidth = 9; g.beginPath(); g.moveTo(s * (hw - 12), lift + 20); g.lineTo(s * (hw + 14), lift - 12); g.stroke(); }
  } else {
    const h = 28 + open * 150, rim = lift * 0.3 + 10;
    const shape = new Path2D();
    shape.moveTo(-hw, lift); shape.bezierCurveTo(-hw * 0.4, rim, hw * 0.4, rim, hw, lift);
    shape.bezierCurveTo(hw * (0.9 - round * 0.35), -h, -hw * (0.9 - round * 0.35), -h, -hw, lift); shape.closePath();
    g.fillStyle = PAL.mouth; g.fill(shape);
    g.save(); g.clip(shape);
    const teeth = Math.max(k('mouth.teeth'), open > 0.2 ? 0.6 : 0);
    if (teeth > 0.05) { g.fillStyle = PAL.teeth; g.fillRect(-hw, rim - 16 - 26 * teeth, 2 * hw, 60); g.lineWidth = 3; g.beginPath(); g.moveTo(-hw, rim - 16 - 26 * teeth); g.lineTo(hw, rim - 16 - 26 * teeth); g.stroke(); }
    g.fillStyle = PAL.tongue; g.beginPath(); g.ellipse(hw * 0.06, -h * 0.95 + k('mouth.tongue') * h * 0.3, hw * 0.6, h * 0.38, 0, 0, TAU); g.fill();
    g.restore();
    g.lineWidth = 12; g.stroke(shape);
  }
  g.restore();
}

// A texture painted in millimetres (w x h, y up, from its middle) onto a canvas cw x ch pixels, repainted
// only when the keys it reads change. The canvas's sides are powers of two: the GPU makes the smaller
// copies of an odd-sized texture a little differently from one upload to the next, so the same frame
// could come out a shade different depending on what was drawn before it.
function mmTexture(w, h, [cw, ch], paint, keys) {
  const tex = paintedTexture(cw, ch, (g, cw, ch, p = {}) => {
    g.save(); g.translate(cw / 2, ch / 2); g.scale(cw / w, -ch / h); paint(g, p); g.restore();
  });
  tex.show = pose => { const key = keys.map(k => Math.round((pose[k] ?? 0) * 400)).join(); if (key !== tex.key) { tex.key = key; tex.redraw(pose); } };
  return tex;
}
const FACE_KEYS = ['eyes.x', 'eyes.y', 'eyes.blink', 'eyes.open', 'eyes.mood', 'brows.up', 'lids.drop', 'lids.slant', 'eyes.squint', 'eyes.pupil', 'cab.yaw', 'cab.nod', 'cab.tilt'];
const MOUTH_KEYS = ['mouth.open', 'mouth.smile', 'mouth.wide', 'mouth.round', 'mouth.teeth', 'mouth.tongue', 'mouth.press', 'cab.yaw', 'cab.tilt'];

// Hazard stripes, for the back of her counterweight.
const hazard = () => paintedTexture(512, 48, (g, w, h) => {
  g.fillStyle = PAL.paint; g.fillRect(0, 0, w, h);
  g.fillStyle = PAL.dark;
  for (let x = -h; x < w + h; x += 40) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 20, h); g.lineTo(x + 20 + h, 0); g.lineTo(x + h, 0); g.fill(); }
});
// A name on her counterweight.
const nameTexture = () => paintedTexture(512, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.fillStyle = PAL.paint; g.font = '700 104px Roboto'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('TILLY', w / 2, h / 2 + 6);
});
// Leaf chain: plates side by side, with their pins.
const chainTexture = () => paintedTexture(32, 64, (g, w, h) => {
  g.fillStyle = '#5E646E'; g.fillRect(0, 0, w, h);
  g.fillStyle = PAL.chain; g.fillRect(3, 2, w - 6, h / 2 - 4); g.fillRect(3, h / 2 + 2, w - 6, h / 2 - 4);
  g.fillStyle = '#3E434B'; for (const y of [h / 4, (3 * h) / 4]) { g.beginPath(); g.arc(w / 2, y, 4, 0, TAU); g.fill(); }
});

// ---------- the model ----------
export function tilly3dV2(layer) {
  const M = {
    paint: toon(PAL.paint), charcoal: toon(PAL.charcoal), mast: toon(PAL.mast), inner: toon(PAL.inner), dark: toon(PAL.dark),
    steel: toon(PAL.steel), chrome: toon(PAL.chrome), fork: toon(PAL.fork), rim: toon(PAL.rim), seat: toon(PAL.seat),
    belt: toon(PAL.belt), stripe: toon(PAL.stripe),
  };
  const root = new THREE.Group(); layer.scene.add(root);
  const heading = joint(root);                                  // yaw (root.children[0], as in tilly3d)
  const rock = joint(heading, [0, PIVOT, 0]);                   // she rocks on her tyres about here
  const body = joint(rock, [0, -PIVOT, 0]);                     // everything on the chassis, in her own space

  // ---------- the chassis ----------
  // the frame between the wheels, the deck the driver stands on, and a step each side
  body.add(part(creased(prism(s => { s.moveTo(-700, 170); s.lineTo(960, 170); s.lineTo(1030, 240); s.lineTo(1030, 745); s.lineTo(640, 745); s.lineTo(640, 560); s.lineTo(-700, 560); s.closePath(); }, 744, 24)), M.charcoal));
  put(body, part(rod(105, 800, 28, 'x'), M.dark, { ink: 1.6 }), 0, FRONT.r, FRONT.z);        // the drive axle
  box(body, [860, 24, 490], [0, 572, 405], M.dark, 6, { ink: 1.6 });
  for (const s of [-1, 1]) box(body, [150, 28, 250], [s * 447, 430, 305], M.dark, 6, { ink: 1.6 });
  // the cowl: the front of her body, leaning back under the windscreen (her mouth is on it)
  const cowl = roundBox(1150, 440, 340, 45); cowl.applyMatrix4(shearZ(-Math.tan(COWL)));
  put(body, part(cowl, M.paint), 0, 960, 770);
  // mudguards arching over the drive wheels
  const guard = creased(prism(s => { s.absarc(FRONT.z, FRONT.r, 450, 1.05, 2.8, false); s.absarc(FRONT.z, FRONT.r, 405, 2.8, 1.05, true); s.closePath(); }, 210, 12));
  for (const s of [-1, 1]) put(body, part(guard, M.paint), s * 495, 0, 0);
  // the hood over the motor, which the seat sits on
  box(body, [1080, 490, 820], [0, 805, -250], M.paint, 70);
  // a stripe along each side, on the hood and the cowl
  for (const s of [-1, 1]) {
    box(body, [4, 52, 660], [s * 541, 905, -250], M.stripe, 2, { ink: 1.2 });
    box(body, [4, 14, 660], [s * 541, 862, -250], M.charcoal, 2, { ink: 0 });
    box(body, [4, 52, 230], [s * 576, 905, 785], M.stripe, 2, { ink: 1.2 });
    box(body, [4, 14, 230], [s * 576, 862, 785], M.charcoal, 2, { ink: 0 });
  }
  // the counterweight: heavy, dark, rounded at the back, arched over the steer wheels
  const cw = prism(s => {
    s.moveTo(-540, 1090); s.lineTo(-540, 497);
    s.absarc(BACK.z, BACK.r, 345, 0.7155, 3.3456, false);
    s.lineTo(-1180, 200); s.lineTo(-1280, 330); s.lineTo(-1280, 880);
    s.absarc(-1070, 880, 210, Math.PI, Math.PI / 2, true);
    s.closePath();
  }, 1150, 50);
  const backCurve = x => 200 * (x / 575) ** 2;                  // how far the back is rounded in, across
  { const pos = cw.attributes.position;
    for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i); if (z < -950) pos.setZ(i, z + backCurve(pos.getX(i)) * ((-950 - z) / 330) ** 2); } }
  body.add(part(creased(cw, 0.55), M.charcoal));
  box(body, [340, 420, 620], [0, 410, -840], M.charcoal, 30);  // between the steer wheels (room for them to turn)
  { const band = new THREE.PlaneGeometry(860, 80, 24, 1).rotateY(Math.PI), pos = band.attributes.position;   // hazard stripes round the back
    for (let i = 0; i < pos.count; i++) pos.setZ(i, -1281.5 + backCurve(pos.getX(i)));
    band.computeVertexNormals();
    put(body, new THREE.Mesh(band, new THREE.MeshToonMaterial({ map: hazard(), gradientMap: M.paint.gradientMap })), 0, 640, 0); }
  box(body, [600, 110, 130], [0, BACK.r, BACK.z], M.dark, 10, { ink: 1.4 });   // the steer axle
  for (const s of [-1, 1]) {                                   // tail lights, on the rounded back
    const x = s * 400, lamp = part(roundBox(120, 70, 30, 10), new THREE.MeshStandardMaterial({ color: PAL.tail, emissive: '#FF2A1A', emissiveIntensity: 0.7, roughness: 0.4 }), { ink: 1.6 });
    lamp.position.set(x, 830, -1280 + backCurve(x) - 6); lamp.rotation.y = -Math.atan(400 * x / 575 ** 2); body.add(lamp);
    const name = new THREE.Mesh(new THREE.PlaneGeometry(330, 82), new THREE.MeshToonMaterial({ map: nameTexture(), transparent: true }));
    name.position.set(s * 576.5, 880, -770); name.rotation.y = s * Math.PI / 2; body.add(name);
  }
  box(body, [180, 90, 40], [0, 470, -1268], M.dark, 12, { ink: 1.4 });   // the towing pin's slot

  // ---------- the cab: seat, steering wheel, and the overhead guard with the windscreen ----------
  box(body, [460, 60, 420], [0, 1080, -250], M.dark, 12, { ink: 1.6 });
  box(body, [500, 120, 470], [0, 1170, -255], M.seat, 45);
  const seatBack = joint(body, [0, 1215, -470]); seatBack.rotation.x = -0.2;
  box(seatBack, [500, 520, 120], [0, 260, -40], M.seat, 45);
  for (const s of [-1, 1]) box(body, [36, 80, 60], [s * 262, 1175, -330], M.belt, 8, { ink: 1.4 });   // the seat belt's ends
  const column = joint(body, [0, 1120, 560]); column.rotation.x = -0.4363;
  box(column, [120, 190, 120], [0, 70, 0], M.dark, 20, { ink: 1.6 });
  put(column, part(rod(26, 200), M.dark, { ink: 1.4 }), 0, 230, 0);
  const wheel = joint(column, [0, 330, 0]);
  put(wheel, part(new THREE.TorusGeometry(165, 16, 12, 48).rotateX(Math.PI / 2), M.dark, { ink: 1.6 }));
  for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) { const spoke = box(wheel, [150, 14, 26], [Math.cos(a) * 82, 0, Math.sin(a) * 82], M.dark, 6, { ink: 1.2 }); spoke.rotation.y = -a; }
  put(wheel, part(rod(40, 30), M.dark, { ink: 1.4 }));
  put(wheel, part(rod(14, 70), M.charcoal, { ink: 1.2 }), 150, 40, 0);        // the steering knob
  [150, 200, 250].forEach((x, i) => {                          // the hydraulic levers
    const lever = joint(body, [x, 1175, 660]); lever.rotation.x = -0.35;
    put(lever, part(rod(7, 170, 10), M.dark, { ink: 1.2 }), 0, 85, 0);
    put(lever, part(new THREE.SphereGeometry(20, 16, 12), i === 2 ? toon('#D23A2A') : M.dark, { ink: 1.4 }), 0, 175, 0);
  });

  const cab = joint(body);                                      // the overhead guard, bolted to the body
  const legLen = Math.hypot(990, 360), rake = Math.atan2(360, 990);
  for (const s of [-1, 1]) {
    const leg = put(cab, part(roundBox(80, legLen, 90, 18), M.paint), s * 480, 1645, 680); leg.rotation.x = -rake;
    box(cab, [80, 1085, 80], [s * 480, 1632, -640], M.paint, 18);
    box(cab, [80, 70, 1230], [s * 480, 2165, -70], M.paint, 16);
  }
  box(cab, [1040, 80, 80], [0, 2160, 505], M.paint, 16);
  box(cab, [1040, 80, 80], [0, 2160, -645], M.paint, 16);
  for (const x of [-330, -198, -66, 66, 198, 330]) box(cab, [50, 30, 1110], [x, 2178, -70], M.charcoal, 8, { ink: 1.6 });
  // the windscreen, bowed a little, between the front legs: her eyes on the front, tinted glass behind
  const glassGeo = new THREE.PlaneGeometry(GLASS.w, GLASS.h, 32, 1);
  { const pos = glassGeo.attributes.position; for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) / (GLASS.w / 2); pos.setZ(i, GLASS.bow * (1 - u * u)); } glassGeo.computeVertexNormals(); }
  const face = mmTexture(GLASS.w, GLASS.h, [1024, 1024], paintFace, FACE_KEYS);
  const pane = joint(cab, [0, GLASS.y, GLASS.z]); pane.rotation.x = -GLASS.rake;
  pane.add(new THREE.Mesh(glassGeo, toon('#FFFFFF', { map: face, emissive: '#FFFFFF', emissiveMap: face, emissiveIntensity: 0.22, transparent: true })));
  pane.add(new THREE.Mesh(glassGeo, new THREE.MeshStandardMaterial({ color: PAL.glass, roughness: 0.3, side: THREE.BackSide, envMapIntensity: 0.3, transparent: true, opacity: 0.7 })));
  const gloss = new THREE.Mesh(glassGeo, new THREE.MeshStandardMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.16, roughness: 0.12, metalness: 0, envMapIntensity: 1.2, depthWrite: false }));
  gloss.position.z = 4; gloss.renderOrder = 2; pane.add(gloss);
  const seal = box(cab, [900, 36, 70], [0, 1192, 846], M.dark, 10, { ink: 1.4 }); seal.rotation.x = -GLASS.rake;
  // her mouth, painted on the cowl's front
  const mouth = mmTexture(640, 250, [1024, 512], paintMouth, MOUTH_KEYS);
  const lips = new THREE.Mesh(new THREE.PlaneGeometry(640, 250), toon('#FFFFFF', { map: mouth, polygonOffset: true, polygonOffsetFactor: -2 }));
  lips.position.set(0, 1010 + 1.5 * Math.sin(COWL), 1000 - 270 * Math.tan(COWL) + 1.5 * Math.cos(COWL)); lips.rotation.x = -COWL; body.add(lips);
  // work lights on the guard's front corners, and one at the back; mirrors on the front legs
  const lampMat = new THREE.MeshStandardMaterial({ color: PAL.lamp, emissive: PAL.lamp, emissiveIntensity: 0.35, roughness: 0.3 });
  for (const s of [-1, 1]) {
    box(cab, [120, 75, 60], [s * 400, 2160, 575], M.dark, 12, { ink: 1.6 });
    put(cab, new THREE.Mesh(new THREE.PlaneGeometry(96, 52), lampMat), s * 400, 2160, 605.5);
    const arm = box(cab, [110, 18, 18], [s * 575, 1885, 600], M.dark, 6, { ink: 1.2 }); arm.rotation.z = s * 0.15;
    const head = joint(cab, [s * 650, 1905, 610]); head.rotation.y = s * 0.2;
    box(head, [26, 130, 180], [0, 0, 0], M.dark, 10, { ink: 1.6 });
    put(head, new THREE.Mesh(new THREE.PlaneGeometry(150, 104), new THREE.MeshStandardMaterial({ color: '#B8C4CE', metalness: 1, roughness: 0.08 })), s * -0.2, 0, -90.5).rotation.y = Math.PI;
  }
  box(cab, [120, 75, 60], [300, 2160, -715], M.dark, 12, { ink: 1.6 });
  put(cab, new THREE.Mesh(new THREE.PlaneGeometry(96, 52), lampMat), 300, 2160, -745.5).rotation.y = Math.PI;
  { const grip = joint(cab, [540, 1300, 800]); grip.rotation.x = -rake;                       // a grab handle on her left front leg
    box(grip, [30, 520, 30], [0, 260, 0], M.dark, 12, { ink: 1.4 });
    for (const y of [30, 490]) box(grip, [40, 26, 26], [-25, y, 0], M.dark, 6, { ink: 1.2 }); }
  // the beacon on the roof
  put(cab, part(new THREE.CylinderGeometry(52, 58, 30, 24), M.dark, { ink: 1.6 }), 0, 2215, -645);
  const domeMat = new THREE.MeshStandardMaterial({ color: PAL.beacon, emissive: PAL.beacon, emissiveIntensity: 0.25, transparent: true, opacity: 0.88, roughness: 0.25 });
  const dome = put(cab, part(new THREE.SphereGeometry(52, 32, 16, 0, TAU, 0, Math.PI / 2), domeMat, { ink: 1.6, shadow: false }), 0, 2230, -645); dome.scale.y = 1.4;
  const spinner = put(cab, new THREE.Mesh(new THREE.BoxGeometry(80, 40, 8), new THREE.MeshBasicMaterial({ color: '#FFE2A0' })), 0, 2262, -645);
  const flash = put(cab, new THREE.PointLight(PAL.beacon, 0, 3000, 1.6), 0, 2280, -645);

  // ---------- the wheels ----------
  // fat solid tyres with chevron treads, yellow rims with holes, dark hubs with their nuts
  const treads = treadTexture(), tyreMat = toon('#FFFFFF', { map: treads }), stub = rod(35, 95, 16, 'x');
  const wheels = [];
  for (const W of [FRONT, BACK]) {
    const tyre = tyreGeometry(W), rimGeo = rod(W.rim + 2, W.w - 26, 48, 'x'), hub = rod(W.rim * 0.46, W.w - 8, 32, 'x');
    const holes = mergeGeometries(Array.from({ length: 6 }, (_, i) => rod(W.rim * 0.13, W.w - 22, 16, 'x').translate(0, Math.cos((i * TAU) / 6) * W.rim * 0.72, Math.sin((i * TAU) / 6) * W.rim * 0.72)));
    const nuts = mergeGeometries(Array.from({ length: 8 }, (_, i) => rod(9, W.w - 2, 6, 'x').translate(0, Math.cos((i * TAU) / 8) * W.rim * 0.3, Math.sin((i * TAU) / 8) * W.rim * 0.3)));
    for (const s of [-1, 1]) {
      const axle = joint(heading, [s * W.x, W.r, W.z]), steer = joint(axle), spin = joint(steer);
      spin.add(part(tyre, tyreMat, { ink: 2.2 }), part(rimGeo, M.rim, { ink: 1.6 }), part(hub, M.charcoal, { ink: 1.4 }));
      spin.add(part(holes, M.dark, { ink: 0 }), part(nuts, M.chrome, { ink: 0 }));
      if (W === BACK) put(steer, part(stub, M.dark, { ink: 1.2 }), -s * 122, 0, 0);            // the stub axle, to the steer axle's end
      wheels.push({ W, steer, spin });
    }
  }

  // ---------- the mast ----------
  // Three stages of rails nested on the drive axle: the outer one fixed, with the lift cylinders
  // behind the middle one, which they push up; the inner one rises twice as fast. The carriage, with
  // its backrest and forks, rides in the inner stage on chains over the free-lift cylinders' sheaves.
  const mast = joint(body, [0, MAST.y, MAST.z]);
  const railTop = RAIL - 310;                                   // the outer stage's top, in the mast
  for (const s of [-1, 1]) {
    box(mast, [90, RAIL, 120], [s * 455, railTop - RAIL / 2, 0], M.mast, 10);
    put(mast, part(rod(44, 1400, 24), M.mast, { ink: 1.8 }), s * 373, 400, -115);            // lift cylinder, -300..1,100
    box(mast, [50, 80, 70], [s * 525, 590, 0], M.mast, 8, { ink: 1.4 });                     // the tilt cylinder's lug
    put(mast, part(rod(45, 50, 20, 'x'), M.dark, { ink: 1.4 }), s * 525, 0, 0);               // the pivot pin
  }
  box(mast, [1000, 44, 90], [0, railTop - 52, -15], M.mast, 10);                             // the top tie, under the middle stage's lugs
  box(mast, [1000, 60, 60], [0, -250, -60], M.mast, 10, { ink: 1.6 });
  const middle = joint(mast), inner = joint(mast);
  for (const s of [-1, 1]) {
    box(middle, [70, RAIL - 20, 104], [s * 373, railTop - 20 - (RAIL - 20) / 2, 0], M.inner, 8);
    box(middle, [110, 36, 130], [s * 373, railTop - 2, -62], M.inner, 8, { ink: 1.6 });       // where its lift cylinder pushes
    box(inner, [56, RAIL - 40, 90], [s * 308, railTop - 40 - (RAIL - 40) / 2, 0], M.mast, 8);
    put(inner, part(rod(34, 820, 20), M.mast, { ink: 1.6 }), s * 255, 110, -100);             // free-lift cylinder, -300..520
    box(inner, [60, 40, 40], [s * 255, -200, -55], M.mast, 6, { ink: 1.2 });                 // the chain's anchor behind
  }
  box(middle, [816, 44, 60], [0, railTop - 42, -40], M.inner, 8, { ink: 1.6 });
  box(inner, [672, 40, 50], [0, railTop - 60, -40], M.mast, 8, { ink: 1.6 });
  const rods = [-1, 1].map(s => put(mast, part(rod(28, 1, 20).translate(0, 0.5, 0), M.chrome, { ink: 1.4 }), s * 373, 1100, -115));
  // the free-lift cylinders' rods, each with a crosshead and a sheave on top, which the chains run over
  const heads = [-1, 1].map(s => {
    const rodM = put(inner, part(rod(22, 1, 16).translate(0, 0.5, 0), M.chrome, { ink: 1.2 }), s * 255, 520, -100);
    const head = joint(inner, [s * 255, SHEAVE, 0]);
    box(head, [80, 40, 120], [0, -45, -45], M.mast, 8, { ink: 1.4 });
    put(head, part(rod(55, 34, 28, 'x'), M.steel, { ink: 1.4 }));
    return { rodM, head };
  });
  const chainTex = chainTexture(); chainTex.wrapS = chainTex.wrapT = THREE.RepeatWrapping;
  const chains = [-1, 1].flatMap(s => [58, -55].map(z => {
    const tex = chainTex.clone(); tex.needsUpdate = true;
    const m = put(inner, part(new THREE.BoxGeometry(34, 1, 14).translate(0, 0.5, 0), toon('#FFFFFF', { map: tex }), { ink: 1.2 }), s * 255, 0, z);
    return { m, tex, front: z > 0 };
  }));
  const carriage = joint(mast, [0, LOW, 130]);
  box(carriage, [1040, 70, 60], [0, 75, -30], M.mast, 8, { ink: 1.8 });
  box(carriage, [1040, 90, 60], [0, 355, -30], M.mast, 8, { ink: 1.8 });
  for (const s of [-1, 1]) {
    box(carriage, [36, 370, 45], [s * 262, 215, -52], M.mast, 8, { ink: 1.6 });              // side plates, rolling in the inner rails
    box(carriage, [36, 50, 30], [s * 255, 425, -80], M.mast, 6, { ink: 1.2 });                // chain anchor
    box(carriage, [40, 210, 40], [s * 500, 500, -25], M.mast, 8, { ink: 1.6 });               // the backrest
  }
  box(carriage, [1040, 34, 40], [0, 595, -25], M.mast, 8, { ink: 1.6 });
  for (const x of [-360, -216, -72, 72, 216, 360]) box(carriage, [22, 190, 22], [x, 495, -25], M.mast, 5, { ink: 1.3 });
  // the forks: hooked on the upper bar, the blade tapering to its tip
  const forkGeo = prism(s => {
    s.moveTo(45, 425); s.lineTo(-50, 425); s.lineTo(-50, 402); s.lineTo(0, 402); s.lineTo(0, 30);
    s.absarc(30, 30, 30, Math.PI, 1.5 * Math.PI, false);
    s.lineTo(960, 0); s.lineTo(1115, 30); s.lineTo(1115, 45); s.lineTo(80, 45);
    s.absarc(80, 80, 35, 1.5 * Math.PI, Math.PI, true);
    s.closePath();
  }, 122, 3);
  { const pos = forkGeo.attributes.position; for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i); if (z > 950) pos.setX(i, pos.getX(i) * lerp(1, 0.78, (z - 950) / 165)); } }
  const forkShape = creased(forkGeo, 0.5);
  const forks = [-1, 1].map(s => {
    const pivot = joint(carriage, [s * 300, 413, -25]);
    const mesh = put(pivot, part(forkShape, M.fork, { ink: 1.8 }), 0, -413, 25);
    return { s, pivot, mesh };
  });
  const FORK_LOW = [[-61, 0, 30], [61, 0, 30], [-61, 0, 960], [61, 0, 960], [-47, 30, 1115], [47, 30, 1115]].map(p => V(...p));

  // the tilt cylinders: from inside the cowl to the lugs on the mast
  const tilters = [-1, 1].map(s => ({
    base: V(s * 530, 1000, 760), lug: V(s * 525, 590, 0),
    barrel: put(body, part(rod(40, 260, 20).translate(0, 130, 0), M.mast, { ink: 1.6 })),
    rod: put(body, part(rod(20, 1, 16).translate(0, 0.5, 0), M.chrome, { ink: 1.2 })),
  }));

  const P = V(), D = V(), Q = new THREE.Quaternion();
  // h mm of lift: free lift first (the carriage rises in the inner stage, its sheaves half as fast), then
  // the middle stage rises m and the inner one 2m
  const setLift = h => {
    const free = Math.min(h, FREE), m = Math.max(0, h - FREE) / 2;
    middle.position.y = m; inner.position.y = 2 * m; carriage.position.y = LOW + h;
    for (const H of heads) { H.head.position.y = SHEAVE + free / 2; H.rodM.scale.y = SHEAVE + free / 2 - 50 - 520; }
    for (const r of rods) r.scale.y = 70 + m;
    for (const c of chains) {
      const from = c.front ? LOW + free + 450 : -180, len = SHEAVE + free / 2 - from;
      c.m.position.y = from; c.m.scale.y = len; c.tex.repeat.set(1, len / 64);
    }
    return h;
  };
  return {
    root, cab, carriage, forks: forks.map(f => f.pivot), face, mouth,          // (face and mouth: the textures her features are painted on)
    // Where a load on her forks goes (in the layer's world): on the blades' top faces, between them,
    // depth / 2 in front of the carriage (the middle of a pallet `depth` deep, pushed right back).
    forkTop(target = V(), depth = 1200) { carriage.updateWorldMatrix(true, false); return target.set(0, 45, 45 + depth / 2).applyMatrix4(carriage.matrixWorld); },
    update(pose, { x = 0, y = 0, z = 0, scale = 1 } = {}) {
      const g = (k, d = 0) => pose[k] ?? d;
      root.position.set(x, -y, z); root.scale.setScalar(scale);
      heading.rotation.y = g('yaw');
      // she rocks on her tyres, a third as far as the first Tilly, and nods and tilts a little with her face
      rock.rotation.set(g('body.pitch') * 0.35 + g('cab.nod') * 0.08, 0, g('body.roll') * 0.35 + g('cab.tilt') * 0.06);
      rock.position.y = PIVOT + g('body.y') * UNIT + (g('body.sy', 1) - 1) * 400;
      // the mast tilts, and the carriage rises in it (the inner mast once the free lift is used)
      const tilt = clamp(g('forks.tilt') + g('mast.tilt'), ...TILT);
      mast.rotation.x = -tilt;
      for (const f of forks) {
        f.pivot.position.x = f.s * (300 + clamp(g('forks.spread'), -0.3, 1) * 150);
        f.pivot.rotation.x = -clamp(g(f.s < 0 ? 'forkL.tilt' : 'forkR.tilt'), -0.1, 0.6);
      }
      let lift = setLift(clamp(g('forks.y')) * LIFT);
      // never through the floor: if a fork's underside would go below it, lift the carriage clear
      root.updateMatrixWorld(true);
      let lowest = Infinity;
      for (const f of forks) for (const q of FORK_LOW) { f.mesh.localToWorld(P.copy(q)); heading.worldToLocal(P); lowest = Math.min(lowest, P.y); }
      if (lowest < 6) { lift = setLift(lift + (6 - lowest) / Math.cos(tilt)); root.updateMatrixWorld(true); }
      // the tilt cylinders follow the mast
      for (const T of tilters) {
        mast.localToWorld(P.copy(T.lug)); body.worldToLocal(P);
        D.subVectors(P, T.base); const len = D.length(); D.divideScalar(len);
        Q.setFromUnitVectors(UP, D);
        T.barrel.position.copy(T.base); T.barrel.quaternion.copy(Q);
        T.rod.position.copy(T.base).addScaledVector(D, 240); T.rod.quaternion.copy(Q); T.rod.scale.y = Math.max(1, len - 240);
      }
      // the wheels roll with the distance tillyPose measured (46 of the path's units a radian, for the
      // first Tilly's wheels), and the steer wheels turn
      const rolled = (g('wheels') * OLD_R) / scale;
      for (const w of wheels) { w.spin.rotation.x = rolled / w.W.r; if (w.W === BACK) w.steer.rotation.y = clamp(g('steer'), -1.2, 1.2); }
      // the beacon spins and flashes
      const on = clamp(g('beacon')), spin = g('beacon.spin');
      spinner.rotation.y = spin; spinner.visible = on > 0.02;
      const pulse = on * (0.55 + 0.45 * Math.cos(spin * 2));
      domeMat.emissiveIntensity = 0.25 + pulse * 2.2; flash.intensity = pulse * 4e4;
      face.show(pose); mouth.show(pose);
    },
  };
}

// ---------- driving ----------
// tillyPose's `path` suits a straight run. For a curve, drive her with this instead: path(t) -> [x, z]
// is where she is on the floor, driven forwards. It gives { x, z, yaw, steer, wheels, pitch }, all from
// t alone: yaw along the way she goes (held while she stands, before and after), the steer wheels'
// turn (they point out of the turn, so her tail swings round her front wheels), wheels as tillyPose
// counts them, and the pitch as she speeds up and brakes. Add yaw and pitch to her pose's, and set
// steer and wheels (and use tillyPose without a path).
const STEP = 1 / 60;
export function driveAlong(path, t, { seed = 5 } = {}) {
  const at = u => { const a = path(u - STEP), b = path(u); return [b[0] - a[0], b[1] - a[1]]; };
  const still = u => Math.hypot(...at(u)) < 0.2;
  // the way she faces: from her last move, or her first if she hasn't set off
  let u = t;
  while (u > 0 && still(u)) u -= STEP;
  if (still(u)) for (u = t; u < t + 60 && still(u);) u += STEP;
  const [dx, dz] = at(u), yaw = Math.atan2(dx, dz);
  // how fast she turns for the distance, from the step before (or after, if she was standing)
  const o = still(u - STEP) ? u + STEP : u - STEP, [ox, oz] = at(o), da = Math.atan2(Math.sin(yaw - Math.atan2(ox, oz)), Math.cos(yaw - Math.atan2(ox, oz)));
  const turn = (o < u ? da : -da) / Math.max(1e-3, Math.hypot(dx, dz));
  let rolled = 0;
  for (let w = STEP; w <= t; w += STEP) rolled += Math.hypot(...at(w));
  const speed = w => Math.hypot(...at(w)) / STEP;
  const surge = lag(`tillyV2.${seed}.drive`, t, speed, { stiffness: 120, damping: 8 });
  const [x, z] = path(t);
  return { x, z, yaw, steer: clamp(-Math.atan(DIMS.wheelbase * turn), -1.1, 1.1), wheels: rolled / OLD_R, pitch: clamp(surge * 0.0009, -0.12, 0.12) };
}
