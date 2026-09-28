// Hands with a real rig, for skinned characters (rig3d.js): a skeleton after the human hand, one
// smooth skin over it, and the controls that make it move like one.
//
// - Bones: a metacarpal and three phalanges for each finger, and the thumb's metacarpal and two
//   phalanges. The thumb's base joint turns two ways (across the palm, and out from it) and rolls as
//   it crosses, so the thumb can oppose each finger.
// - The skin bends at the knuckles; the palm cups; knuckles stand out on a fist.
// - The finger's end joint follows its middle one, as the tendons make it, and fingers pull their
//   neighbours along a little. Curled fingers close in towards the thumb.
// - grasp: fingers and thumb close round a handle (or a ball) until each segment meets it, so the
//   hand wraps whatever it holds, of any size.
// - touch: the thumb reaches the pad of a finger (0 index .. 3 little finger; between two slides
//   from one to the next), for pinches, the OK sign, and counting on the fingers.
//
// Units are millimetres (the character scales the whole). In the hand's own frame, for the hand on
// the character's +x side (side +1): the fingers hang down -y, the palm faces -x (in towards the
// body), the back of the hand +x, and the thumb is forward, +z. Side -1 mirrors it in x.
//
// Pose keys, for the hand named h ('handL' or 'handR'), in radians:
//   h.i1 h.i2 h.i3   index: the knuckle (MCP), the middle joint (PIP), and the end joint (DIP) on
//                    top of the 0.7 x PIP it follows anyway; h.is spreads the finger out (+) or in (-)
//   h.m*, h.r*, h.p* the middle, ring and little fingers, the same
//   h.t1 h.t1o h.t1r the thumb's base: across the palm, out from it, and extra roll
//   h.t2 h.t3        the thumb's two joints
//   h.cup            the palm cupping, 0..1
//   h.touch h.touchF the thumb touching a finger's pad: how far (0..1), and which finger (0..3)
//   h.grasp          how far the hand has closed round what it holds (0..1): see handRig's pose()
//   h.flex h.dev     the wrist: bent palmwards (+) or back, and tilted towards the thumb (+) or away
//   h.roll           the hand turned round the forearm (a character's arm sets it, to turn the palm)
import { clamp, hash, lerp } from './core.js';
import { choreo } from './puppet.js';
import { THREE } from './scene3d.js';
import { lag, springs } from './spring.js';
import { attach, cone, ell, smooth, turn } from './rig3d.js';
import { ball, solid, toon } from './toon3d.js';

// ---------- anatomy ----------
// For side +1. base: where the metacarpal starts; mcp: the knuckle; spread: the finger's angle at
// rest, towards the thumb (+); len: the three phalanges (the last to the fingertip); r: thickness at
// the knuckle, the middle joint, the end joint and the tip.
export const FINGERS = [
  { id: 'i', base: [3, -24, 12], mcp: [0, -95, 28], spread: 0.11, len: [41, 24, 21], r: [9.2, 8.3, 7.4, 6.8] },
  { id: 'm', base: [3.5, -24, 3], mcp: [1.5, -100, 8.5], spread: 0.02, len: [45, 28, 22], r: [9.5, 8.6, 7.6, 7.0] },
  { id: 'r', base: [3, -24, -6], mcp: [0.5, -95, -10], spread: -0.09, len: [42, 26, 21], r: [8.9, 8.1, 7.2, 6.6] },
  { id: 'p', base: [2, -24, -14], mcp: [-1.5, -85, -26.5], spread: -0.21, len: [33, 19, 18], r: [7.8, 7.1, 6.4, 5.9] },
];
// The thumb's base joint, the way it points at rest, the way it curls (palmwards, towards the little
// finger), its three bones and its thickness at each joint and the tip.
export const THUMB = { cmc: [-9, -26, 19], dir: [-0.3, -0.62, 0.72], curl: [-0.62, -0.1, -0.78], len: [44, 32, 26], r: [12, 10.4, 9.4, 8.3] };
const LIMITS = { mcp: [-0.4, 1.62], pip: [-0.05, 1.95], dip: [-0.2, 1.45], t1: [-0.95, 1.25], t1o: [-0.6, 1.0], t2: [-0.25, 1.1], t3: [-0.4, 1.45] };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mirrorQ = (q, s) => (s > 0 ? q : new THREE.Quaternion(q.x, -q.y, -q.z, q.w));
// The rotation that turns a bone hanging down -y to hang along dir.
const along = dir => new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), V(...dir).normalize());
function thumbRest() {
  const d = V(...THUMB.dir).normalize(), f = V(...THUMB.curl);
  f.addScaledVector(d, -f.dot(d)).normalize();
  const y = d.clone().negate(), x = f.clone().negate(), z = new THREE.Vector3().crossVectors(x, y);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// The bones of a hand, for skeleton(): the wrist `h` (at `at` in `parent`, turned by `rest`), and
// h.i0 (metacarpal) h.i1 h.i2 h.i3 for each finger, h.t1 h.t2 h.t3 for the thumb.
export function handBones(h, s, parent, { at = [0, 0, 0], rest } = {}) {
  const M = ([x, y, z]) => [x * s, y, z];
  const bones = [{ name: h, parent, at, rest }];
  for (const F of FINGERS) {
    const meta = V(...F.mcp).sub(V(...F.base));
    const qm = along(meta.toArray()), qf = along([0, -Math.cos(F.spread), Math.sin(F.spread)]);
    bones.push({ name: `${h}.${F.id}0`, parent: h, at: M(F.base), rest: mirrorQ(qm, s) });
    bones.push({ name: `${h}.${F.id}1`, parent: `${h}.${F.id}0`, at: [0, -meta.length(), 0], rest: mirrorQ(qm.clone().invert().multiply(qf), s) });
    bones.push({ name: `${h}.${F.id}2`, parent: `${h}.${F.id}1`, at: [0, -F.len[0], 0] });
    bones.push({ name: `${h}.${F.id}3`, parent: `${h}.${F.id}2`, at: [0, -F.len[1], 0] });
  }
  bones.push({ name: `${h}.t1`, parent: h, at: M(THUMB.cmc), rest: mirrorQ(thumbRest(), s) });
  bones.push({ name: `${h}.t2`, parent: `${h}.t1`, at: [0, -THUMB.len[0], 0] });
  bones.push({ name: `${h}.t3`, parent: `${h}.t2`, at: [0, -THUMB.len[1], 0] });
  return bones;
}

// The hand's shape, for skinned(): a palm with the fingers and thumb blended into it. `wrist` is an
// extra shape (the end of the forearm, on its own bone) blended into the heel of the hand.
export function handShape(h, s, { wrist } = {}) {
  const b = n => `${h}.${n}`;
  const flat = [0.9, 1, 1];                                // fingers are a little flatter than round
  const palm = smooth(9,
    ell(h, [13, 19, 25], { at: [s * 1, -12, 2] }),                                   // the heel of the hand
    ...FINGERS.map((F, i) => {
      const L = V(...F.mcp).distanceTo(V(...F.base));
      return cone(b(`${F.id}0`), L, [10.5, 10.5, 10, 9.2][i], F.r[0] + 0.6, { scale: [0.95, 1, 1.05] });
    }),
    ell(h, [8.5, 30, 31], { at: [s * -7.5, -60, 2] }),                               // the palm's pad
    ell(b('p0'), [8.5, 27, 10], { at: [s * -6, -32, s * 0 - 3.5], weight: false }),  // the heel under the little finger
    ...(wrist ? [wrist] : []),
  );
  const finger = (F, i) => smooth(3,
    cone(b(`${F.id}1`), F.len[0], F.r[0], F.r[1], { scale: flat }),
    cone(b(`${F.id}2`), F.len[1], F.r[1], F.r[2], { scale: flat }),
    cone(b(`${F.id}3`), F.len[2] - F.r[3], F.r[2], F.r[3], { scale: flat }),
    ell(b(`${F.id}3`), [F.r[3] * 0.62, F.r[3] * 1.15, F.r[3] * 0.82], { at: [-s * F.r[3] * 0.42, -F.len[2] + F.r[3] * 1.35, 0] }),   // the fingertip's pad
    ell(b(`${F.id}0`), [7.5, 7, 8.5], { at: [s * 3.2, -V(...F.mcp).distanceTo(V(...F.base)) + 1, 0], weight: false }),                // the knuckle
  );
  const T = THUMB;
  const thumb = smooth(4,
    cone(b('t1'), T.len[0], T.r[0], T.r[1], { scale: [0.92, 1, 1] }),
    cone(b('t2'), T.len[1], T.r[1], T.r[2], { scale: flat }),
    cone(b('t3'), T.len[2] - T.r[3], T.r[2], T.r[3], { scale: flat }),
    ell(b('t3'), [T.r[3] * 0.6, T.r[3] * 1.2, T.r[3] * 0.85], { at: [-s * T.r[3] * 0.4, -T.len[2] + T.r[3] * 1.4, 0] }),
  );
  const thenar = ell(b('t1'), [12.5, 24, 12], { at: [s * -4.5, -15, 0] });          // the ball of the thumb
  // the thumb joins the palm with a broad web, as far out as its first joint
  return smooth(15, attach(7, palm, ...FINGERS.map(finger)), smooth(10, thenar, thumb));
}

// Fingernails and the thumbnail, on the end bones: small flat shells, a shade lighter than the skin.
export function handNails(sk, h, s, color) {
  const mat = toon(color);
  const nail = (bone, len, r) => {
    const n = solid(ball(1, 24), mat, { ink: 1.3, shadow: false });
    n.scale.set(r * 0.22, len * 0.5, r * 0.78);
    n.position.set(s * r * 0.8, -len * 0.52 - r * 0.3, 0);
    n.rotation.z = s * 0.1;
    sk.by[bone].add(n);
  };
  for (const F of FINGERS) nail(`${h}.${F.id}3`, F.len[2] * 0.55, F.r[3]);
  nail(`${h}.t3`, THUMB.len[2] * 0.55, THUMB.r[3]);
}

// ---------- the controls ----------
const _a = V(), _b = V(), _u = V(), _w = V(), _m = new THREE.Matrix4(), _v = V();

// Segment [a, b] (radius r) to a held thing: its distance, surface to surface (negative inside).
function gap(a, b, r, obj) {
  if (obj.kind === 'ball') {
    _u.subVectors(b, a); _w.subVectors(obj.at, a);
    const t = clamp(_w.dot(_u) / Math.max(_u.lengthSq(), 1e-9));
    return _v.copy(a).addScaledVector(_u, t).distanceTo(obj.at) - obj.r - r;
  }
  // a handle: a cylinder along obj.axis through obj.at, as long as need be
  const d = obj.axis;
  _u.subVectors(b, a); _w.subVectors(a, obj.at);
  _u.addScaledVector(d, -_u.dot(d)); _w.addScaledVector(d, -_w.dot(d));
  const t = clamp(-_w.dot(_u) / Math.max(_u.lengthSq(), 1e-9));
  return _w.addScaledVector(_u, t).length() - obj.r - r;
}

// A hand's controls: pose(p, { hold }) turns its bones from the pose keys. `hold` is what the hand
// holds, in the world: { kind: 'handle', at, axis (a unit Vector3), r } or { kind: 'ball', at, r };
// h.grasp closes the hand round it.
export function handRig(sk, h, s) {
  const bone = n => sk.by[`${h}.${n}`];
  const wrist = sk.by[h];
  const fingers = FINGERS.map(F => ({ F, meta: bone(`${F.id}0`), joints: [bone(`${F.id}1`), bone(`${F.id}2`), bone(`${F.id}3`)], len: F.len, r: F.r }));
  const T = { joints: [bone('t1'), bone('t2'), bone('t3')], len: THUMB.len, r: THUMB.r };
  const Z = a => -s * a;                                           // curling is a turn round the bone's z

  const setFinger = (f, [m, p, d], fan) => {
    turn(f.joints[0], fan, 0, Z(m));
    turn(f.joints[1], 0, 0, Z(p));
    turn(f.joints[2], 0, 0, Z(d));
  };
  const setThumb = ([across, out, m, ip], roll) => {
    turn(T.joints[0], out, -s * roll, Z(across));
    turn(T.joints[1], 0, 0, Z(m));
    turn(T.joints[2], 0, 0, Z(ip));
  };
  // the world scale of the hand (its bones' lengths are in model units)
  const scale = () => { wrist.updateWorldMatrix(true, false); return _v.setFromMatrixScale(wrist.matrixWorld).x; };

  // the segments of a chain, in the world: [[a, b, r], ...]
  const segs = (chain, k) => {
    const j = chain.joints[k];
    j.updateMatrixWorld(true);
    const a = V().setFromMatrixPosition(j.matrixWorld);
    const tip = k === 2 ? chain.len[2] - chain.r[3] : chain.len[k];
    const b = V(0, -tip, 0).applyMatrix4(j.matrixWorld);
    return [a, b, chain.r[k + 1] * 0.5 + chain.r[k] * 0.5];
  };

  // Curl a chain's joints together (at `rates`) until a segment meets the held thing; that joint and
  // those before it stop, and the rest carry on curling, so the fingers wrap round it.
  function wrap(chain, set, ang, lim, rates, obj, sc) {
    ang = [...ang];
    let active = 0;
    const firstHit = a => {
      set(a); chain.joints[0].updateMatrixWorld(true);
      for (let k = active; k < 3; k++) { const [p, q, r] = segs(chain, k); if (gap(p, q, r * sc, obj) < -0.4 * sc) return k; }
      return -1;
    };
    for (let it = 0; it < 40 && active < 3; it++) {
      const next = ang.map((x, j) => (j >= active ? Math.min(lim[j][1], x + 0.07 * rates[j]) : x));
      if (next.every((x, j) => x === ang[j])) break;
      const k = firstHit(next);
      if (k < 0) { ang = next; continue; }
      let lo = 0, hi = 1;
      for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (firstHit(ang.map((x, j) => lerp(x, next[j], mid))) >= 0) hi = mid; else lo = mid; }
      ang = ang.map((x, j) => lerp(x, next[j], lo));
      active = k + 1;
    }
    set(ang);
    return ang;
  }

  // The pad of a finger's tip, in the world.
  const pad = (chain, v) => {
    const j = chain.joints[2], r = chain.r[3];
    j.updateMatrixWorld(true);
    return v.set(-s * r * 0.75, -chain.len[2] + r * 1.1, 0).applyMatrix4(j.matrixWorld);
  };

  // The thumb's pad to `target`: damped least squares over its four angles.
  function reachThumb(ang, target, lim, sc) {
    const x = [...ang], e = V(), J = [[], [], []];
    const at = a => { setThumb(a, 0.55 * a[0]); T.joints[0].updateMatrixWorld(true); return pad(T, V()); };
    for (let it = 0; it < 24; it++) {
      const p = at(x);
      e.subVectors(target, p);
      if (e.length() < 0.3 * sc) break;
      for (let i = 0; i < 4; i++) {
        const y = [...x]; y[i] += 1e-3;
        const q = at(y);
        J[0][i] = (q.x - p.x) / 1e-3; J[1][i] = (q.y - p.y) / 1e-3; J[2][i] = (q.z - p.z) / 1e-3;
      }
      // dx = J^T (J J^T + l^2 I)^-1 e, over the joints that can still move that way: a joint at its
      // limit and pushed further is left out, and the others make up for it
      const free = [1, 1, 1, 1], dx = [0, 0, 0, 0];
      for (let pass = 0; pass < 4; pass++) {
        const l2 = (4 * sc) ** 2, A = [0, 1, 2].map(r => [0, 1, 2].map(c => J[r].reduce((acc, _, i) => acc + free[i] * J[r][i] * J[c][i], 0) + (r === c ? l2 : 0)));
        const y = V(e.x, e.y, e.z).applyMatrix3(new THREE.Matrix3().set(...A.flat()).invert());
        let locked = false;
        for (let i = 0; i < 4; i++) {
          dx[i] = free[i] * (J[0][i] * y.x + J[1][i] * y.y + J[2][i] * y.z);
          if (free[i] && ((x[i] <= lim[i][0] + 1e-4 && dx[i] < 0) || (x[i] >= lim[i][1] - 1e-4 && dx[i] > 0))) { free[i] = 0; locked = true; }
        }
        if (!locked) break;
      }
      for (let i = 0; i < 4; i++) x[i] = clamp(x[i] + dx[i] * 0.8, lim[i][0], lim[i][1]);
    }
    return x;
  }

  return {
    fingers, thumb: T,
    pad(f, v = V()) { return pad(f === 't' ? T : fingers[f], v); },
    pose(p, { hold } = {}) {
      const g = (k, d = 0) => p[`${h}.${k}`] ?? d;
      turn(wrist, -g('dev'), g('roll'), Z(g('flex')), 'YXZ');
      const cup = g('cup');
      // the palm cups: the ring and little fingers' metacarpals fold in a little
      fingers.forEach((f, i) => turn(f.meta, 0, -s * [0, 0, 0.05, 0.14][i] * cup, Z([0, 0, 0.05, 0.16][i] * cup)));
      // each finger's joints, the end joint following the middle one, neighbours pulling a little,
      // and curled fingers closing in towards the thumb
      const raw = fingers.map(f => [g(`${f.F.id}1`), g(`${f.F.id}2`), g(`${f.F.id}3`)]);
      const PULL = [[0, 0.07, 0, 0], [0.06, 0, 0.1, 0], [0, 0.1, 0, 0.18], [0, 0, 0.2, 0]];
      const angs = fingers.map((f, i) => {
        let [m, pp, dd] = raw[i];
        for (let j = 0; j < 4; j++) if (PULL[i][j]) { m += PULL[i][j] * Math.max(0, raw[j][0] - m); pp += PULL[i][j] * Math.max(0, raw[j][1] - pp); }
        return [clamp(m, ...LIMITS.mcp), clamp(pp, ...LIMITS.pip), clamp(pp * 0.7 + dd, ...LIMITS.dip)];
      });
      const fans = fingers.map((f, i) => {
        const curl = clamp(angs[i][0] / 1.5), fan = g(`${f.F.id}s`) - [0, -0.03, 0.1, 0.2][i] * curl;
        return [-1, -1, 1, 1][i] * fan;                          // + spreads the index and middle towards the thumb, the others away
      });
      let th = [g('t1'), g('t1o'), g('t2'), g('t3')];
      const thLim = [LIMITS.t1, LIMITS.t1o, LIMITS.t2, LIMITS.t3];
      th = th.map((x, i) => clamp(x, ...thLim[i]));
      fingers.forEach((f, i) => setFinger(f, angs[i], fans[i]));
      setThumb(th, 0.55 * th[0] + g('t1r'));
      const sc = scale();

      // the thumb to a finger's pad
      const touch = clamp(g('touch'));
      if (touch > 0) {
        const fi = clamp(g('touchF'), 0, 3), i0 = Math.floor(fi), i1 = Math.min(3, i0 + 1);
        wrist.updateMatrixWorld(true);
        const target = pad(fingers[i0], V()).lerp(pad(fingers[i1], V()), fi - i0);
        // pads meet, rather than centres: aim a little short, along the finger's pad normal
        const sol = reachThumb(th, target, thLim, sc);
        th = th.map((x, i) => lerp(x, sol[i], touch));
        setThumb(th, 0.55 * th[0] + g('t1r'));
      }

      // round what the hand holds
      const grasp = clamp(g('grasp'));
      if (grasp > 0 && hold) {
        wrist.updateMatrixWorld(true);
        const lim = [LIMITS.mcp, LIMITS.pip, LIMITS.dip];
        fingers.forEach((f, i) => {
          const set = a => setFinger(f, a, fans[i]);
          const got = wrap(f, set, angs[i], lim, [1, 1.1, 0.8], hold, sc);
          set(angs[i].map((x, j) => lerp(x, got[j], grasp)));
        });
        // the thumb's pad onto the nearest point of what it holds (sweeping it round, as the fingers
        // do, lets it miss a thin handle and fold into the palm)
        T.joints[0].updateMatrixWorld(true);
        const from = pad(T, V()), onto = V();
        if (hold.kind === 'ball') onto.copy(hold.at);
        else onto.copy(hold.at).addScaledVector(hold.axis, _w.subVectors(from, hold.at).dot(hold.axis));
        const n = from.clone().sub(onto);
        onto.addScaledVector(n.normalize(), hold.r + THUMB.r[3] * 0.1 * sc);
        const sol = reachThumb(th, onto, thLim, sc);
        setThumb(th.map((x, i) => lerp(x, sol[i], grasp)), 0.55 * lerp(th[0], sol[0], grasp) + g('t1r'));
      }
    },
  };
}

// ---------- hand shapes ----------
// Partial poses for one hand (h is 'handL' or 'handR'), to key with choreo. Every shape sets every
// finger, so moving from one to another eases every joint.
const IDS = ['i', 'm', 'r', 'p'];
const fingers = (h, mcp, pip, dip = [0, 0, 0, 0], fan = [0, 0, 0, 0]) =>
  Object.fromEntries(IDS.flatMap((f, i) => [[`${h}.${f}1`, mcp[i]], [`${h}.${f}2`, pip[i]], [`${h}.${f}3`, dip[i]], [`${h}.${f}s`, fan[i]]]));
const thumb = (h, across, out, mcp, ip, roll = 0) => ({ [`${h}.t1`]: across, [`${h}.t1o`]: out, [`${h}.t1r`]: roll, [`${h}.t2`]: mcp, [`${h}.t3`]: ip });
const clear = (h, o = {}) => ({ [`${h}.touch`]: 0, [`${h}.grasp`]: 0, [`${h}.cup`]: 0.25, ...Object.fromEntries(Object.entries(o).map(([k, v]) => [`${h}.${k}`, v])) });
const TOGETHER = [-0.09, 0, -0.07, -0.16];                     // fingers side by side, from their rest spread
const FIST = [1.5, 1.72, 0.12];

export const HAND = {
  // hanging loose: each finger a little more curled than the one before, the thumb resting by the index
  relaxed: h => ({ ...fingers(h, [0.2, 0.28, 0.36, 0.46], [0.3, 0.42, 0.52, 0.62], [0, 0, 0, 0], [-0.05, 0, -0.03, -0.08]), ...thumb(h, 0.3, 0.15, 0.12, 0.2), ...clear(h, { cup: 0.35 }) }),
  // fingers and thumb spread wide
  open: h => ({ ...fingers(h, [-0.05, -0.05, -0.05, -0.05], [0.04, 0.04, 0.04, 0.04], [-0.05, -0.05, -0.05, -0.05], [0.12, 0.05, 0.1, 0.14]), ...thumb(h, -0.25, 0.45, 0, -0.1), ...clear(h, { cup: 0 }) }),
  // flat, fingers together, the thumb alongside: a salute, a karate chop, a hand held up to stop
  flat: h => ({ ...fingers(h, [0, 0, 0, 0], [0.03, 0.03, 0.03, 0.03], [-0.05, -0.05, -0.05, -0.05], TOGETHER), ...thumb(h, 0.35, -0.2, 0.05, 0), ...clear(h, { cup: 0 }) }),
  // a fist, the thumb across the first two fingers
  fist: h => ({ ...fingers(h, Array(4).fill(FIST[0]), Array(4).fill(FIST[1]), Array(4).fill(FIST[2]), TOGETHER), ...thumb(h, 0.95, -0.15, 0.55, 0.5), ...clear(h, { cup: 0.6 }) }),
  // pointing with the index, the others curled, the thumb over the middle finger
  point: h => ({ ...fingers(h, [0, FIST[0], FIST[0], FIST[0]], [0.02, FIST[1], FIST[1], FIST[1]], [0, FIST[2], FIST[2], FIST[2]], [0, -0.02, -0.07, -0.16]), ...thumb(h, 0.85, -0.1, 0.5, 0.45), ...clear(h, { cup: 0.5 }) }),
  // the thumb out to the side, square to the fist (up, when the fist is on its side)
  thumbsUp: h => ({ ...fingers(h, Array(4).fill(FIST[0]), Array(4).fill(FIST[1]), Array(4).fill(FIST[2]), TOGETHER), ...thumb(h, -0.85, 0.05, -0.1, -0.15), ...clear(h, { cup: 0.4 }) }),
  peace: h => ({ ...fingers(h, [0, 0, FIST[0], FIST[0]], [0.03, 0.03, FIST[1], FIST[1]], [0, 0, FIST[2], FIST[2]], [0.14, -0.2, -0.07, -0.16]), ...thumb(h, 0.95, -0.1, 0.5, 0.5), ...clear(h, { cup: 0.5 }) }),
  // curled like a claw: knuckles straight, the other joints bent
  claw: h => ({ ...fingers(h, [0.15, 0.15, 0.15, 0.15], [1.35, 1.35, 1.35, 1.35], [0.1, 0.1, 0.1, 0.1], [0.08, 0.04, 0.06, 0.1]), ...thumb(h, 0.1, 0.35, 0.5, 0.8), ...clear(h, { cup: 0.5 }) }),
  // counting on the fingers, 0..5: index first, the thumb last
  count: (h, n) => {
    const up = i => (n > i ? 1 : 0), m = IDS.map((_, i) => (up(i) ? 0 : FIST[0])), p = IDS.map((_, i) => (up(i) ? 0.03 : FIST[1]));
    return { ...fingers(h, m, p, IDS.map((_, i) => (up(i) ? 0 : FIST[2])), IDS.map((_, i) => (up(i) ? 0.06 : TOGETHER[i]))),
      ...(n >= 5 ? thumb(h, -0.25, 0.4, 0, -0.1) : thumb(h, 0.9, -0.1, 0.5, 0.5)), ...clear(h, { cup: n >= 5 ? 0 : 0.5 }) };
  },
  // the thumb's pad on finger f's (0 index .. 3 little), that finger bent to meet it
  touch: (h, f = 0) => {
    const bend = [[0.75, 1.05], [0.85, 1.05], [0.95, 1.05], [1.05, 1.0]];
    const m = IDS.map((_, i) => (i === f ? bend[i][0] : [0.15, 0.2, 0.25, 0.32][i] + (Math.abs(i - f) === 1 ? 0.15 : 0)));
    const p = IDS.map((_, i) => (i === f ? bend[i][1] : [0.2, 0.26, 0.32, 0.4][i]));
    return { ...fingers(h, m, p, [0, 0, 0, 0], [0.04, 0.02, 0.04, 0.08]), ...thumb(h, 0.6, 0.35, 0.25, 0.25), ...clear(h, { cup: 0.35 + f * 0.15, touch: 1, touchF: f }) };
  },
  // the OK sign: thumb and index in a ring, the other fingers fanned up
  ok: h => ({ ...HAND.touch(h, 0), ...fingers(h, [0.8, 0.1, 0.18, 0.28], [1.05, 0.12, 0.2, 0.3], [0, 0, 0, 0], [0.02, 0.1, 0.12, 0.18]) }),
  // open wide and ready, then grasp: 1 to close round what the hand holds (see handRig's pose)
  reach: h => ({ ...fingers(h, [0.12, 0.12, 0.14, 0.16], [0.18, 0.2, 0.22, 0.24], [0, 0, 0, 0], [0.02, 0.01, 0.02, 0.05]), ...thumb(h, 0.1, 0.45, 0.05, 0.05), ...clear(h, { cup: 0.1 }) }),
  grasp: h => ({ ...HAND.reach(h), ...thumb(h, 0.1, 0.12, 0.05, 0.05), ...clear(h, { cup: 0.3, grasp: 1 }) }),
};

// ---------- life ----------
// What the pose keys of a hand should be at t, from moves (as for choreo) of hand shapes: the
// fingers move one after another (the little finger first), each joint on a spring that settles
// without much overshoot, and the fingers trail behind the wrist when it moves fast (feed wristOf,
// the wrist's bend at time u, if it moves). Returns only the hand's own keys (fingers, thumb, palm,
// wrist, touch and grasp), to lay over the rest of a pose.
export function handLife(t, h, rest, moves, { id = h, wristOf, stagger = 0.03, seed = 1 } = {}) {
  const at = u => {
    const q = choreo(u, rest, moves);
    // each finger a moment behind the next, from the little finger to the index, and the thumb
    IDS.forEach((f, i) => {
      const d = (3 - i) * stagger;
      if (!d) return;
      const late = choreo(u - d, rest, moves);
      for (const k of ['1', '2', '3', 's']) q[`${h}.${f}${k}`] = late[`${h}.${f}${k}`];
    });
    return q;
  };
  // the hand's own keys: the fingers', the thumb's, the palm's and the wrist's (not where the hand is)
  const own = k => k.startsWith(h + '.') && /\.([imrp][123s]|t1[or]?|t[23]|cup|flex|dev|roll|touch|touchF|grasp)$/.test(k);
  const keys = Object.keys(rest).filter(own);
  const feel = {};
  for (const k of keys) {
    const joint = k.at(-1);
    feel[k] = joint === '1' ? { stiffness: 320, damping: 30 } : joint === '2' ? { stiffness: 380, damping: 30 } : joint === '3' ? { stiffness: 440, damping: 28 } : { stiffness: 300, damping: 30 };
  }
  for (const k of [`${h}.touch`, `${h}.grasp`, `${h}.touchF`]) delete feel[k];
  const now = at(t), p = Object.fromEntries(keys.map(k => [k, now[k]]));
  Object.assign(p, springs(`${id}.hand`, t, at, feel));
  // follow-through: when the wrist swings, the fingers lag behind it, the ends most
  if (wristOf) {
    const drag = lag(`${id}.drag`, t, wristOf, { stiffness: 240, damping: 11 });
    IDS.forEach((f, i) => {
      p[`${h}.${f}1`] += drag * 0.35; p[`${h}.${f}2`] += drag * 0.45; p[`${h}.${f}3`] += drag * 0.35;
    });
  }
  // and never quite still
  IDS.forEach((f, i) => {
    const n = Math.sin(t * (1.3 + hash(seed + i) * 0.9) + hash(seed * 3 + i) * 6) * 0.018;
    p[`${h}.${f}1`] += n; p[`${h}.${f}2`] += n * 1.2;
  });
  return p;
}
