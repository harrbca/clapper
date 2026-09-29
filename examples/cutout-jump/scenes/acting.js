// The stunt: Dex's moves between the key poses, the flight (an arc and a forward flip), the
// contacts that keep his feet, knee and fist where they touch, and the camera.
import { clamp, E, inv, lerp, onTwos, shake, wiggle } from '/@kit/core.js';
import { shot } from '/@kit/camera.js';
import { HAND, mixKeys, MOUTH } from '/@kit/cutout.js';
import { moves } from '/@kit/puppet.js';
import { cue as c } from '/@kit/timeline.js';
import { dex, EXPR, REST } from '/@kit/characters/dex.js';
import { contacts, KEY } from './keys.js';

export const FLOOR = 960, TABLE = { x0: 250, x1: 700, h: 250 }, SCALE = 0.62;
const START = 560, LAND = 1210, APEX = 230;
// the frame he touches down on: he moves on twos, so the first even frame at or after the landing
export const LANDED = onTwos(c.land + 2 / 30 - 1e-3);

const hold = (t, pose, dur = 0.01) => ({ t, dur, pose });
export const MOVES = moves([
  // on the table, facing us: "Watch this."
  hold(-1, { ...KEY.stand, 'body.view': 0, 'head.r': 0, ...EXPR.smug, 'eyes.y': 0 }),
  { t: 1.0, dur: 0.3, pose: { ...EXPR.neutral, 'brows.in': 0.3, 'eyes.y': 0.5, 'head.r': 0.12 } },
  // a turn to profile, sizing up the drop
  { t: c.turn, dur: 0.3, pose: { 'body.view': 2, 'head.r': 0.18, 'eyes.y': 0.6 } },
  // the wind-up, the launch
  { t: c.crouch, dur: 0.4, pose: KEY.crouch, ease: E.io },
  { t: c.takeoff, dur: 0.1, pose: KEY.takeoff, ease: E.out },
  // into the tuck, round, and out of it
  { t: c.tuck, dur: 0.12, pose: KEY.tuck, ease: E.out },
  { t: c.open, dur: 0.14, pose: KEY.open, ease: E.out },
  // impact, turned to us at 3/4, then settling into the hero landing
  hold(c.land, KEY.impact),
  { t: c.hero, dur: 0.22, pose: KEY.hero, ease: E.out },
  // the look up, slow
  { t: c.lookUp, dur: 0.5, pose: KEY.look, ease: E.io },
  // standing, proud: chest out, fists on hips
  { t: c.standUp, dur: 0.7, anticipate: 0.15, pose: { ...KEY.stand, 'body.view': 1, 'head.view': 0, 'head.r': -0.1, 'torso.r': -0.06, 'hips.y': 0, ...EXPR.smug, 'eyes.y': 0, 'armL.r': 0.75, 'foreL.r': -1.6, 'armR.r': -0.75, 'foreR.r': 1.6, 'handL.shape': HAND.fist, 'handR.shape': HAND.fist, 'handL.r': 0.5, 'handR.r': -0.5 }, ease: E.io },
  // ...until the knee
  { t: c.knee, dur: 0.12, pose: { 'torso.r': 0.42, 'hips.y': 40, 'head.r': -0.2, ...EXPR.worried, 'eyes.squint': 0.7, 'eyeR.open': 0.3, 'mouth.shape': MOUTH.grimace, 'armR.r': -0.1, 'foreR.r': 0.2, 'handR.shape': HAND.spread, 'handR.r': 0, 'handL.shape': HAND.palm }, ease: E.snap },
]);

// ---------- the flight ----------
// Where his feet would be (the puppet's origin): on the table, along an arc, then on the floor.
export function place(t) {
  const u = inv(c.leave, c.land, t);
  const x = lerp(START, LAND, u), y = lerp(FLOOR - TABLE.h, FLOOR, u) - APEX * 4 * u * (1 - u);
  return [x, y];
}
// The flip: once round, fastest in the middle of the tuck.
export const spin = t => Math.PI * 2 * E.io(inv(c.tuck - 0.02, c.open + 0.06, t));

// Motion over the choreography: the flip, squash and stretch, the shake of the knee.
const bump = (t, t0, d) => { const k = (t - t0) / d; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };
export function extra(t) {
  return {
    'hips.r': spin(t),
    'hips.sy': 1 + bump(t, c.leave, 0.16) * 0.06 - bump(t, c.land, 0.14) * 0.12,
    'hips.sx': 1 - bump(t, c.leave, 0.16) * 0.04 + bump(t, c.land, 0.14) * 0.08,
    'head.r': wiggle(t, c.knee + 0.1, 1.4, 0.05, 5),
    'torso.r': wiggle(t, c.knee + 0.1, 1.4, 0.03, 5),
  };
}

// ---------- contacts ----------
const LEGS = ['legL.r', 'shinL.r', 'footL.r', 'legR.r', 'shinR.r', 'footR.r'];
const ARM_L = ['armL.r', 'foreL.r', 'handL.r'], ARM_R = ['armR.r', 'foreR.r', 'handR.r'];
const w = (t, t0, t1, fadeIn, fadeOut) => Math.min(fadeIn ? inv(t0, t0 + fadeIn, t) : t >= t0 ? 1 : 0, fadeOut ? 1 - inv(t1, t1 + fadeOut, t) : t < t1 ? 1 : 0);
export function withContacts(p, t) {
  // feet on the table until he leaves it
  const onTable = w(t, -9, c.takeoff + 0.03, 0, 0.05);
  if (onTable > 0) p = mixKeys(p, contacts(p, 'stand'), onTable, LEGS);
  // in the tuck, hands on the shins
  const tuck = Math.min(inv(c.tuck, c.tuck + 0.12, t), 1 - inv(c.open, c.open + 0.1, t));
  if (tuck > 0) p = mixKeys(p, contacts(p, 'tuck'), tuck, [...ARM_L, ...ARM_R]);
  // the impact's wide stance, handing over to the hero landing's knee, foot and fist
  if (t >= c.land && t < c.standUp + 0.7) {
    const k = E.out(inv(c.land + 0.04, c.hero + 0.22, t));
    const a = contacts(p, 'impact'), b = contacts(p, 'hero');
    const out = mixKeys(mixKeys(p, a, 1, [...LEGS, ...ARM_L]), b, k, [...LEGS, ...ARM_L]);
    const off = inv(c.standUp + 0.05, c.standUp + 0.6, t);           // standing up: let go of the floor
    p = mixKeys(out, p, E.io(off), [...LEGS, ...ARM_L]);
  }
  if (t >= c.standUp + 0.45) p = mixKeys(p, contacts(p, 'stand'), inv(c.standUp + 0.45, c.standUp + 0.7, t), LEGS);
  // the knee: a hand to it
  if (t >= c.knee) {
    const knee = dex.where('shinL', p, [10, 10]);
    p = mixKeys(p, { ...p, ...dex.reach(p, 'armL', 'foreL', knee, 1) }, E.out(inv(c.knee, c.knee + 0.12, t)), ARM_L);
  }
  return p;
}

// ---------- the camera ----------
export function camera(t) {
  const cam = shot(t, [
    [0, { zoom: 1.12, x: 700, y: 560 }], [c.crouch, { zoom: 1.12, x: 720, y: 560 }], [c.leave, { zoom: 1.0, x: 860, y: 560 }],
    [c.land, { zoom: 1.0, x: 1050, y: 580 }], [c.land + 0.12, { zoom: 1.22, x: 1160, y: 700 }], [c.lookUp, { zoom: 1.28, x: 1180, y: 690 }],
    [c.lookUp + 0.6, { zoom: 1.75, x: 1235, y: 640 }], [c.standUp, { zoom: 1.75, x: 1235, y: 640 }], [c.standUp + 0.7, { zoom: 1.3, x: 1210, y: 600 }],
    [c.knee, { zoom: 1.3, x: 1210, y: 600 }], [c.knee + 0.2, { zoom: 1.45, x: 1210, y: 620 }],
  ]);
  const [sx, sy] = shake(t, LANDED, 0.45, 22);
  return { ...cam, x: cam.x + sx, y: cam.y + sy };
}
export const fade = t => Math.max(1 - clamp(t / 0.4), inv(c.end - 0.5, c.end, t));
export { REST };
