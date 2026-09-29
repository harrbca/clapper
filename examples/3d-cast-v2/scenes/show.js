// The performance: Pip's and Tilly's moves, Tilly's drive, the crate, and the camera.
import { E, inv, lerp, track, wiggle } from '/@kit/core.js';
import { moves } from '/@kit/puppet.js';
import { cue as c } from '/@kit/timeline.js';
import { EXPR3 } from '/@kit/characters/pip3d.js';

// Where they stand (3D, floor at y = 0, +z towards the camera).
export const PIP = { x: -120, y: 0, z: 40, scale: 1 };
export const TILLY_SCALE = 1.6;
const FROM = [-380, -1400], TO = [390, -70];
export const TILLY_YAW = Math.atan2(TO[0] - FROM[0], TO[1] - FROM[1]);
const bump = (t, t0, d) => { const k = (t - t0) / d; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };

// ---------- Tilly ----------
// She drives in from behind Pip, carrying the crate up high, and brakes beside her.
export const tillyPath = t => { const k = E.out(inv(c.arrive, c.stop, t)); return [lerp(FROM[0], TO[0], k), lerp(FROM[1], TO[1], k)]; };
export const TILLY_MOVES = moves([
  { t: -1, dur: 0.001, pose: { yaw: TILLY_YAW, 'forks.y': 0.92, 'mast.tilt': 0.04, beacon: 1, 'cab.yaw': 0, 'eyes.y': -0.15 } },
  // two beeps of the horn as she comes
  { t: c.beep, dur: 0.06, pose: { 'mouth.open': 0.8 } }, { t: c.beep + 0.14, dur: 0.06, pose: { 'mouth.open': 0 } },
  { t: c.beep + 0.25, dur: 0.06, pose: { 'mouth.open': 0.8 } }, { t: c.beep + 0.39, dur: 0.06, pose: { 'mouth.open': 0 } },
  // she brakes, and the crate rocks: wide eyes, up at it
  { t: c.rock + 0.05, dur: 0.12, pose: { 'eyes.mood': 2, 'brows.up': 1, 'eyes.y': -0.85, 'mouth.open': 0.35, 'cab.nod': -0.15 }, ease: E.snap },
  // it settles: relief
  { t: c.settle, dur: 0.25, pose: { 'eyes.mood': 1, 'brows.up': 0, 'eyes.y': 0, 'mouth.open': 0, 'cab.nod': 0, beacon: 0 } },
  // hello, Pip
  { t: c.look, dur: 0.4, pose: { 'cab.yaw': -1.05, 'eyes.x': -0.8, 'cab.tilt': -0.1, 'mouth.smile': 1 }, ease: E.snap },
  // and to us, beacon going
  { t: c.turn, dur: 0.4, pose: { 'cab.yaw': -0.35, 'eyes.x': -0.2, 'cab.tilt': 0.05, beacon: 1 } },
]);
export function tillyExtra(t) {
  return {
    'body.sy': 1 - bump(t, c.stop - 0.05, 0.25) * 0.06 + bump(t, c.hello - 0.1, 0.3) * 0.05 + bump(t, c.cheer, 0.3) * 0.06 + bump(t, c.cheer + 0.35, 0.3) * 0.04,
    'body.roll': wiggle(t, c.rock, 1.3, 0.035, 2.2),
    'cab.tilt': wiggle(t, c.hello, 0.9, 0.12, 2.5),
    'body.y': bump(t, c.cheer, 0.3) * 10,
  };
}
// The crate rocks when she brakes, and settles: [roll, pitch].
export function crateRock(t) {
  const u = t - c.rock;
  if (u < 0) return [0, 0];
  const d = Math.exp(-u * 2.6);
  return [Math.sin(u * 8.5) * 0.1 * d, -Math.sin(u * 7.5 + 0.2) * 0.2 * d];
}

// ---------- Pip ----------
const REST_ARMS = { 'handL.x': -122, 'handL.y': 356, 'handL.z': 14, 'handR.x': 122, 'handR.y': 356, 'handR.z': 14, 'handL.form': 4, 'handR.form': 4, 'handL.px': 1, 'handL.py': 0, 'handL.pz': 0, 'handR.px': -1, 'handR.py': 0, 'handR.pz': 0 };
const hands = (l, r, o = {}) => ({ 'handL.x': l[0], 'handL.y': l[1], 'handL.z': l[2], 'handR.x': r[0], 'handR.y': r[1], 'handR.z': r[2], ...o });
export const PIP_MOVES = moves([
  { t: -1, dur: 0.001, pose: { ...EXPR3.neutral, 'mood.smile': 0.5, yaw: 0.2 } },
  // "Look at me. I'm in 3D": her hands up in front of her, palms to her, turned over and back
  { t: c.admire, dur: 0.55, pose: { ...hands([-105, 625, 175], [105, 615, 185], { 'handL.form': 0, 'handR.form': 0, 'handL.px': 0.5, 'handL.pz': -1, 'handR.px': -0.5, 'handR.pz': -1 }), ...EXPR3.delighted, 'eyes.y': 0.55, 'head.rx': 0.16 } },
  { t: 1.2, dur: 0.35, pose: { 'handL.py': 1, 'handL.pz': 0, 'handR.py': 1, 'handR.pz': 0, 'eyes.x': 0.25 } },
  { t: 1.75, dur: 0.35, pose: { 'handL.py': 0, 'handL.pz': -1, 'handR.py': 0, 'handR.pz': -1, 'eyes.x': -0.15 } },
  // the horn, behind her: a start, a look back, then she follows Tilly past
  { t: c.beep + 0.05, dur: 0.14, pose: { ...EXPR3.surprised, ...hands([-118, 560, 120], [118, 560, 120], { 'handL.form': 2, 'handR.form': 2 }), yaw: -0.1, 'head.turn': -0.55, 'eyes.x': -0.95, 'eyes.y': 0, 'head.rx': -0.05 }, ease: E.snap },
  { t: 3.0, dur: 0.7, pose: { yaw: 0.3, ...REST_ARMS, 'head.turn': 0, 'eyes.x': 0.1, 'brows.up': 0.5, 'mood.smile': 0.2, 'eyes.open': 1.1 } },
  { t: 3.7, dur: 0.6, pose: { yaw: 0.8, 'eyes.x': 0.35 } },
  // she brakes, the crate rocks: hands to her cheeks
  { t: c.rock + 0.08, dur: 0.18, pose: { ...EXPR3.worried, ...hands([-116, 655, 92], [116, 655, 92], { 'handL.form': 0, 'handR.form': 0, 'handL.px': 1, 'handL.pz': 0.2, 'handR.px': -1, 'handR.pz': 0.2 }), 'eyes.y': -0.6, 'head.rx': -0.14 }, ease: E.snap },
  // it holds: phew
  { t: c.settle + 0.05, dur: 0.45, pose: { ...REST_ARMS, ...EXPR3.happy, 'eyes.y': 0, 'head.rx': 0.05, 'eyes.x': 0.35 } },
  // hello! a wave
  { t: c.hello, dur: 0.3, pose: { ...hands([-122, 356, 14], [250, 770, 110], { 'handR.form': 0, 'handR.px': 0, 'handR.pz': 1 }), 'mood.smile': 0.9 }, ease: E.snap, anticipate: 0.25 },
  { t: 7.5, dur: 0.35, pose: { ...REST_ARMS } },
  // a cheer
  { t: c.cheer, dur: 0.24, pose: { ...EXPR3.delighted, ...hands([-230, 1010, 60], [230, 1010, 60], { 'handL.form': 2, 'handR.form': 2, 'handL.px': 0, 'handL.pz': 1, 'handR.px': 0, 'handR.pz': 1 }), 'eyes.y': -0.2 }, ease: E.snap, anticipate: 0.3 },
  // to us: a thumbs up, and a wink
  { t: c.turn, dur: 0.5, pose: { yaw: 0.12, ...REST_ARMS, ...EXPR3.happy, 'mood.smile': 0.9, 'eyes.x': 0, 'eyes.y': 0, 'head.rx': 0, 'head.r': 0.06 } },
  { t: c.thumbs - 0.1, dur: 0.25, pose: { ...hands([-122, 356, 14], [185, 640, 210], { 'handR.form': 3, 'handR.px': -1, 'handR.py': 0, 'handR.pz': 0.15 }) }, ease: E.snap, anticipate: 0.25 },
  { t: c.wink, dur: 0.08, pose: { 'lidR.drop': 1, 'browR.up': -0.3 } },
  { t: c.wink + 0.3, dur: 0.12, pose: { 'lidR.drop': 0, 'browR.up': 0 } },
]);
export function pipExtra(t) {
  const waving = t > c.hello + 0.15 && t < 7.45 ? Math.sin((t - c.hello) * 13) : 0;
  return {
    'hips.y': bump(t, c.beep + 0.05, 0.35) * 26 + bump(t, c.cheer + 0.02, 0.4) * 60 - bump(t, c.settle + 0.05, 0.6) * 12,
    'torso.rx': bump(t, c.settle + 0.05, 0.6) * 0.06,
    'handR.x': waving * 34, 'handR.palm': waving * 0.25,
    'handL.palm': Math.sin(t * 3) * 0.25 * bump(t, c.admire + 0.5, 1.7), 'handR.bend': Math.sin(t * 3 + 1) * 0.2 * bump(t, c.admire + 0.5, 1.7),
    'head.r': wiggle(t, c.cheer + 0.1, 0.9, 0.06, 3),
  };
}

// ---------- the camera ----------
// Round the pair: [orbit angle, distance, height, then where it looks].
const CAM = [
  [0, [-0.06, 1500, 740, -110, 680, 40]],
  [2.2, [-0.05, 1400, 720, -110, 670, 40]],
  [4.4, [0.02, 2950, 640, 150, 500, 0]],
  [5.6, [0.02, 2650, 620, 160, 520, 0]],
  [8.6, [0.0, 2550, 600, 130, 500, 0]],
  [13.8, [-0.5, 2250, 660, 40, 520, 0]],
];
export function camera(t) {
  const [a, r, h, tx, ty, tz] = track(t, CAM, E.io);
  return { pos: [tx + Math.sin(a) * r, h, tz + Math.cos(a) * r], at: [tx, ty, tz] };
}
