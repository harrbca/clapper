// Walking side-on in 2D, for characters whose legs are chains of kind 'leg' (side L and R): where the
// body is along the floor, and where each foot is. A foot is planted while the body passes over it,
// then swings forward, lifted, on to its next plant, so feet never slide. The walk sets off from a
// stand with the feet together (the first step is half as long in time), speeds up and slows down,
// and when the body stops, the back foot steps up beside the front one.
//
//   const w = walk2d(t, { x0: 1000, x1: 2500, t0: 20.5, t1: 24.5, step: 240, lift: 40 });
//   w.x                   where the body is: the character's origin, in the scene
//   w.feet.L, w.feet.R    [x, lift, k] of each foot (k: 0 planted, 0-1 through a swing)
//   w.go                  0..1, how much it is walking, for the bob and the arm swing
//   p = walkPose(dex, p, w, { scale })   the pose with its feet planted, a bob and arms swinging
//
// Units are the scene's; `scale` is the character's (its draw call's). The walk is a function of t,
// so call it with the time the character's drawings change on (onTwos), and draw the character at
// w.x from the same time, or its planted feet slip between drawings.
import { clamp } from './core.js';
import { plant } from './cutout.js';

// Distance along the way at k (0..1), speeding up over the first `ramp` of the time and slowing over
// the last, steady between; and the speed there, 0..1 of the steady speed.
function travel(k, ramp) {
  const v = 1 / (1 - ramp);
  if (k <= 0) return [0, 0];
  if (k >= 1) return [1, 0];
  if (k < ramp) return [v * k * k / (2 * ramp), k / ramp];
  if (k > 1 - ramp) return [1 - v * (1 - k) ** 2 / (2 * ramp), (1 - k) / ramp];
  return [v * (ramp / 2 + k - ramp), 1];
}

const smooth = k => k * k * (3 - 2 * k);

export function walk2d(t, { x0, x1, t0, t1, step = 240, lift = 40, ramp = 0.18, close = 0.35 }) {
  const D = Math.abs(x1 - x0), dir = x1 >= x0 ? 1 : -1;
  const [d, speed] = travel((t - t0) / (t1 - t0), ramp);
  const s = d * D, go = clamp(speed * 1.4);
  const at = u => clamp(u, 0, D);
  // Steps take turns, R first: step j swings its foot from (j - 1) steps along to (j + 1) while the
  // body goes from j - 1/2 steps to j + 1/2, so each foot lands half a step ahead of the body. Along
  // the way is clamped to the walk's length: the first step starts from the feet together and the
  // last lands where the body stops.
  const now = Math.floor(s / step + 0.5), feet = {};
  for (const [side, parity] of [['R', 0], ['L', 1]]) {
    const j = now % 2 === parity ? now : now - 1;
    if (j < 0) { feet[side] = [0, 0, 0]; continue; }           // not set off yet: where it started
    const sa = Math.max((j - 0.5) * step, 0), sb = Math.min((j + 0.5) * step, D);
    const A = at((j - 1) * step), B = at((j + 1) * step);
    if (sa >= D) { feet[side] = [A, 0, 0]; continue; }          // a step there's no room for
    const k = s >= sb ? 1 : clamp((s - sa) / (sb - sa));
    feet[side] = k >= 1 ? [B, 0, 0] : [A + (B - A) * smooth(k), lift * Math.sin(Math.PI * k), k];
  }
  // stopped: the back foot steps up beside the front one
  if (t > t1) {
    const k = clamp((t - t1) / close);
    for (const side of ['L', 'R']) {
      const [fx] = feet[side];
      if (fx < D - 0.5) feet[side] = k >= 1 ? [D, 0, 0] : [fx + (D - fx) * smooth(k), lift * 0.6 * Math.sin(Math.PI * k), k];
    }
  }
  const out = { x: x0 + dir * s, dir, go, s, step, feet: {} };
  for (const side of ['L', 'R']) { const [fx, fy, k] = feet[side]; out.feet[side] = [x0 + dir * fx, fy, k]; }
  return out;
}

// The ankle's height in a character's rest pose, for each leg chain: where its feet go.
const ankles = new WeakMap();
function ankleOf(character, chain) {
  if (!ankles.has(character)) ankles.set(character, {});
  const a = ankles.get(character);
  return (a[chain.bones[2]] ??= character.where(chain.bones[2], character.rest)[1]);
}

// A pose walking: the legs planted where walk2d puts the feet (the foot tipping toe down through a
// swing), the arms swinging against the legs, and the hips coming down as far as the legs need to
// reach their feet, with `give` at the knee (a fraction of the leg), so the body rides lowest as the
// feet part and highest over a planted foot. `bob` adds more of that dip. `scale` is the character's
// draw scale. The character should be side-on (body.view 2 or -2).
export function walkPose(character, pose, w, { scale = 1, arms = 0.32, bob = 0, tilt = 0.25, give = 0.03 } = {}) {
  character.needs(['root'], 'walkPose');
  const legs = character.chainsOf('leg').filter(([, c]) => c.side && c.bones.length >= 3);
  if (legs.length < 2) throw new Error(`${character.name}: walkPose needs two leg chains (kind 'leg', side L and R, hip to foot).`);
  const root = character.tags.root, psi = Math.PI * w.s / w.step;
  const p = { ...pose };
  for (const [, ch] of character.chainsOf('arm')) {
    if (!ch.side) continue;
    const b = ch.bones[0];
    p[`${b}.r`] = (p[`${b}.r`] ?? 0) + (ch.side === 'L' ? -1 : 1) * w.dir * arms * Math.sin(psi) * w.go;
  }
  const feet = legs.map(([name, ch]) => {
    const [fx, fy, k] = w.feet[ch.side];
    return { name, ch, k, target: [(fx - w.x) / scale, ankleOf(character, ch) - fy / scale] };
  });
  let drop = bob * w.go * (1 - Math.cos(2 * psi)) / 2;
  for (const { ch, target: [tx, ty] } of feet) {
    const [hx, hy] = character.where(ch.bones[0], p);
    // (a unit short of straight, as IK stops half a unit short)
    const reach = (character.by[ch.bones[0]].len + character.by[ch.bones[1]].len) * (1 - give * w.go) - 1, dx = tx - hx;
    if (Math.abs(dx) < reach) drop = Math.max(drop, ty - hy - Math.sqrt(reach * reach - dx * dx));
  }
  p[`${root}.y`] = (p[`${root}.y`] ?? 0) + drop;
  let out = p;
  for (const { name, k, target } of feet) out = plant(character, out, name, target, { tilt: w.dir * tilt * Math.sin(Math.PI * k) });
  return out;
}
