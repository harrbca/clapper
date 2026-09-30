// Driving, as a vehicle really moves: a kinematic model, not physics. A route is laid out as legs (straight
// runs and arcs, forwards or in reverse, and waits), and the vehicle follows it the only way a wheeled
// vehicle can: along the way it points. Its fixed axle (the one that doesn't steer) runs along the route
// and the body turns with it, so a rear-steer forklift pivots on its drive wheels and its tail swings
// out, and a car's front swings round its back axle. One speed profile runs across each run of legs
// (legs between stops): it pulls away smoothly, cruises, slows and stops only where it has to (a wait,
// or a change between forwards and reverse), never at the joins between legs.
//
//   import { route, ride } from '/@kit/drive.js';
//   const R = route({ at: [x, z], yaw, t0: 0.3, axle: 800, wheelbase: 1600, steer: 'rear', speed: 1800, accel: 1100 }, [
//     { straight: 3500 },                       // forwards 3.5 m (units are the set's: mm for the kit's 3D)
//     { arc: Math.PI / 2, r: 1800 },            // a quarter turn, radius 1.8 m at the fixed axle (+ turns yaw up)
//     { straight: 1400, name: 'in' },           // name a leg to know when it starts and ends (R.marks.in)
//     { wait: 1.3, name: 'lift' },
//     { straight: 600, reverse: true, speed: 1200 },
//     { arc: Math.PI / 2, r: 1800, reverse: true },
//     { wait: 0.3 },
//     { straight: 4000 },
//   ]);
//   const s = R.at(t)   // { x, z, yaw, steer, rolled, speed, accel, lateral, moving }
//
// Yaw is walk3d's and the kit's 3D characters': 0 faces +z, heading (sin yaw, cos yaw). An arc's angle is
// how far the yaw turns (for a leg in reverse too). at: and yaw: are where the vehicle's origin is and how
// it faces at t0; axle is how far ahead of the origin its fixed axle is, along its heading (a forklift's
// drive axle is ahead of the middle of its wheelbase, + wheelbase / 2; a car's back axle is behind, -).
// speed and accel are the run's top speed and the most it speeds up or slows (units a second, a second
// squared); a leg can lower speed for its run (reverse slower, say). The state at t:
//   x, z, yaw        the origin and heading, for the vehicle's update
//   steer            the steered wheels' angle (radians; + as tilly3d-v2's steer), from how tightly it turns
//   rolled           the distance driven, signed (+ forwards), for the wheels (Tilly v2: wheels = rolled / 46)
//   speed, accel     along the heading (+ forwards), for pitching the body as it pulls away and brakes
//   lateral          the sideways acceleration in turns (+ to its left), for rolling it and for its riders
//   moving           0..1, how much it's moving (for engine shake, a rider's bob)
// R.marks[name] = { start, end } for named legs, R.t1 when it's done, and R.plan the legs with their times.
//
// ride(state) says how a rider sways with the vehicle: { pitch, roll, bob }. pitch (radians, + leaning
// back) from accel, roll (+ leaning to the vehicle's left) from lateral, bob a small bounce while moving.

const SMOOTH = 0.35;                                  // how long, in s, the steering takes to wind on or off

export function route({ at: start = [0, 0], yaw = 0, t0 = 0, axle = 0, wheelbase = 1600, steer = 'rear', speed = 1500, accel = 1000 } = {}, legs = []) {
  // 1. lay the legs out in space, at the fixed axle: each leg's start pose, length and curvature
  let px = start[0] + Math.sin(yaw) * axle, pz = start[1] + Math.cos(yaw) * axle, h = yaw;
  const laid = [];
  for (const leg of legs) {
    if (leg.wait !== undefined) { laid.push({ ...leg, kind: 'wait', len: 0, x: px, z: pz, yaw: h }); continue; }
    const dir = leg.reverse ? -1 : 1;
    if (leg.straight !== undefined) {
      const len = Math.abs(leg.straight);
      laid.push({ ...leg, kind: 'straight', len, dir, x: px, z: pz, yaw: h, k: 0 });
      px += Math.sin(h) * len * dir; pz += Math.cos(h) * len * dir;
    } else if (leg.arc !== undefined) {
      const r = leg.r ?? 1500, len = Math.abs(leg.arc) * r, k = leg.arc / len;       // yaw turned a unit along the path
      laid.push({ ...leg, kind: 'arc', len, dir, x: px, z: pz, yaw: h, k, r });
      const e = pose(laid.at(-1), len); px = e.x; pz = e.z; h = e.yaw;
    } else throw new Error(`drive.js: a leg needs straight, arc or wait: ${JSON.stringify(leg)}`);
  }
  // 2. group them into runs (a stop between: a wait, or a change of direction), and time each run
  const runs = [];
  let cur = null;
  for (const l of laid) {
    if (l.kind === 'wait') { cur = null; runs.push({ wait: l.wait, legs: [l] }); continue; }
    if (!cur || cur.dir !== l.dir) { cur = { dir: l.dir, legs: [], len: 0, vmax: Infinity }; runs.push(cur); }
    cur.legs.push(l); cur.len += l.len; cur.vmax = Math.min(cur.vmax, l.speed ?? speed);
  }
  let t = t0;
  const marks = {};
  for (const run of runs) {
    run.t0 = t;
    if (run.wait !== undefined) { run.dur = run.wait; }
    else {
      // a smooth profile: acceleration rises and falls as a half-sine, so the speed eases on and off; if the
      // run is too short to reach top speed, it peaks lower
      const amax = accel, v = Math.min(run.vmax, Math.sqrt((run.len * amax) / 2));
      const ta = (2 * v) / amax, sa = (v * ta) / 2;                                  // time and distance to reach v
      run.v = v; run.ta = ta; run.sa = sa; run.cruise = Math.max(0, run.len - 2 * sa) / v;
      run.dur = 2 * ta + run.cruise;
      let s = 0;
      for (const l of run.legs) { l.s0 = s; s += l.len; }
    }
    t += run.dur; run.t1 = t;
    for (const l of run.legs) if (l.name) {
      marks[l.name] = run.wait !== undefined ? { start: run.t0, end: run.t1 } : { start: run.t0 + timeAt(run, l.s0), end: run.t0 + timeAt(run, l.s0 + l.len) };
    }
  }
  const t1 = t;

  // where the fixed axle is, a distance s along a laid leg, and which way it faces
  function pose(l, s) {
    if (l.kind !== 'arc' || l.k === 0) return { x: l.x + Math.sin(l.yaw) * s * (l.dir ?? 1), z: l.z + Math.cos(l.yaw) * s * (l.dir ?? 1), yaw: l.yaw };
    // an arc: the heading turns k a unit along the path; the axle moves (forwards or back) along the heading
    const a = l.k * s, dir = l.dir, R = 1 / l.k;
    // integrate the heading exactly: x = x0 + dir * R (cos yaw0 - cos(yaw0 + a)), z = z0 + dir * R (sin(yaw0 + a) - sin yaw0)
    return { x: l.x + dir * R * (Math.cos(l.yaw) - Math.cos(l.yaw + a)), z: l.z + dir * R * (Math.sin(l.yaw + a) - Math.sin(l.yaw)), yaw: l.yaw + a };
  }
  // the distance along a run at time u into it, and the speed and acceleration there
  function prof(run, u) {
    const { v, ta, sa, cruise, len } = run;
    const up = w => { const q = Math.min(w, ta); return { s: (v / 2) * (q - (ta / Math.PI) * Math.sin((Math.PI * q) / ta)), v: (v / 2) * (1 - Math.cos((Math.PI * q) / ta)), a: (v * Math.PI) / (2 * ta) * Math.sin((Math.PI * q) / ta) }; };
    if (u <= 0) return { s: 0, v: 0, a: 0 };
    if (u < ta) return up(u);
    if (u < ta + cruise) return { s: sa + (u - ta) * v, v, a: 0 };
    if (u < 2 * ta + cruise) { const d = up(2 * ta + cruise - u); return { s: len - d.s, v: d.v, a: -d.a }; }
    return { s: len, v: 0, a: 0 };
  }
  function timeAt(run, s) {                           // when a run reaches distance s (bisection on its profile)
    let a = 0, b = run.dur;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (prof(run, m).s < s) a = m; else b = m; }
    return b;
  }
  // the curvature a distance s along a run, with the steering wound on and off over SMOOTH seconds of travel
  function curvature(run, s, v) {
    const span = Math.max(40, (v || run.v) * SMOOTH), n = 5;
    let sum = 0;
    for (let i = 0; i < n; i++) { const q = s + ((i / (n - 1)) - 0.5) * span; const l = legAt(run, q); sum += l.k ?? 0; }
    return sum / n;
  }
  function legAt(run, s) { for (const l of run.legs) if (s <= l.s0 + l.len + 1e-6) return l; return run.legs.at(-1); }

  function at(u) {
    // before it sets off: parked at the start; after: parked at the end
    let rolled = 0, state = null;
    for (const run of runs) {
      if (run.wait !== undefined) { if (u < run.t1 && u >= run.t0) state = { run, still: true }; continue; }
      const w = u - run.t0;
      if (u >= run.t1) { rolled += run.len * run.dir; continue; }
      if (w < 0) break;
      const p = prof(run, w);
      state = { run, p };
      rolled += p.s * run.dir;
      break;
    }
    // the pose: from the leg the run is in, or where the last moving run ended
    let l, s, v = 0, a = 0, k = 0, dir = 1;
    const moving = runs.filter(r => r.wait === undefined);
    if (state && state.p) {
      const run = state.run; s = state.p.s; l = legAt(run, s); v = state.p.v * run.dir; a = state.p.a * run.dir; dir = run.dir;
      k = curvature(run, s, state.p.v);
      var P = pose(l, s - l.s0);
    } else {
      // parked: find the last run that ended before u (or the first leg, if none)
      const done = moving.filter(r => r.t1 <= u);
      if (done.length) { const r = done.at(-1), last = r.legs.at(-1); P = pose(last, last.len); }
      else if (moving.length) { const f = moving[0].legs[0]; P = { x: f.x, z: f.z, yaw: f.yaw }; }
      else P = { x: px, z: pz, yaw: h };
    }
    const x = P.x - Math.sin(P.yaw) * axle, z = P.z - Math.cos(P.yaw) * axle;
    // steering: the steered wheels' angle for how tightly the body turns for the way it points (in reverse,
    // the same path is the opposite turn for the wheels), rear steer pointing out of the turn
    const kb = k * dir, ang = Math.atan(wheelbase * kb);
    const st = steer === 'rear' ? -ang : ang;
    return { x, z, yaw: P.yaw, steer: st, rolled, speed: v, accel: a, lateral: v * v * kb, moving: Math.min(1, Math.abs(v) / 300) };
  }

  return { at, marks, t1, plan: runs, end: pose };
}

// How a rider sways with a vehicle's state (from route().at): leaning back as it pulls away and forward
// as it brakes, out of the turns, and a small bounce while it moves. Gains are in radians per unit/s^2.
export function ride(s, { t = 0, pitch = 0.00018, roll = 0.00012, bob = 1, seed = 3 } = {}) {
  const b = s.moving * bob * (Math.sin(t * 17 + seed) * 0.6 + Math.sin(t * 7.3 + seed * 2) * 0.4);
  return { pitch: Math.max(-0.25, Math.min(0.25, s.accel * pitch)), roll: Math.max(-0.2, Math.min(0.2, -s.lateral * roll)), bob: b };
}
