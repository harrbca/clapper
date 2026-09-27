// Walking, for characters whose feet are placed by IK (pip3d): where the body is along a route and which
// way it faces, and where each foot is. A foot is planted on the floor while the body passes over it,
// then swings forward, lifted, on to its next plant, so feet never slide. The walk speeds up from a
// stand and slows to one, the feet coming together.
//
//   const w = walk(t, { path: [[x0, z0], [x1, z1], ...], t0: 2, t1: 6, step: 400, width: 170, lift: 40 });
//   w.x, w.z, w.yaw     where the body is and which way it faces (yaw 0 faces +z)
//   w.feet.L, w.feet.R  the feet on the floor, [x, y, z] in the world (y is the lift)
//   w.go                0..1, how much it is walking (0 standing), for bob, sway and arm swing
//   w.phase             the stride's phase in radians: 0 when the left foot is under the body
//
// The path is a line through the points, smoothed (Catmull-Rom). Units are the world's. footLocal()
// turns a foot into the character's own space for its pose.
import { clamp } from './core.js';

const routes = new Map();
function route(points) {
  const key = JSON.stringify(points);
  if (routes.has(key)) return routes.get(key);
  const P = points, pts = [];
  const at = (i) => P[Math.max(0, Math.min(P.length - 1, i))];
  for (let i = 0; i < P.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let j = 0; j < 24; j++) {
      const u = j / 24, u2 = u * u, u3 = u2 * u;
      const c = k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3);
      pts.push([c(0), c(1)]);
    }
  }
  pts.push(P.at(-1));
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const r = {
    length: len.at(-1),
    at(s) {
      s = clamp(s, 0, r.length);
      let i = 1;
      while (i < len.length - 1 && len[i] < s) i++;
      const k = (s - len[i - 1]) / (len[i] - len[i - 1] || 1);
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    },
    heading(s) {
      const a = r.at(s - 40), b = r.at(s + 40);
      return Math.atan2(b[0] - a[0], b[1] - a[1]);
    },
  };
  routes.set(key, r);
  return r;
}

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

export function walk(t, { path, t0, t1, step = 400, width = 170, lift = 40, ramp = 0.18 }) {
  const R = route(path), S = R.length;
  const [d, speed] = travel((t - t0) / (t1 - t0), ramp);
  const s = d * S, go = clamp(speed * 1.4);
  const [x, z] = R.at(s), yaw = R.heading(clamp(s, 40, Math.max(40, S - 40)));
  // a foot's place on the floor at distance u along the way, to its own side
  const place = (u, side) => {
    const [px, pz] = R.at(u), h = R.heading(clamp(u, 40, Math.max(40, S - 40)));
    return [px + Math.cos(h) * side * width / 2, pz - Math.sin(h) * side * width / 2];
  };
  const feet = {};
  for (const [name, side, phase] of [['L', -1, 0], ['R', 1, step]]) {
    // each foot's cycle is two steps: planted while the body travels one step over it, then swinging one
    const u = (s + phase) / (2 * step), c = Math.floor(u), f = u - c;
    const plant = c * 2 * step - phase + step / 2;
    let fx, fz, fy = 0;
    if (f < 0.5) [fx, fz] = place(plant, side);
    else {
      const k = (f - 0.5) * 2, e = k * k * (3 - 2 * k), a = place(plant, side), b = place(plant + 2 * step, side);
      fx = a[0] + (b[0] - a[0]) * e; fz = a[1] + (b[1] - a[1]) * e; fy = lift * Math.sin(Math.PI * k);
    }
    // standing, the feet come together under the body
    const [sx, sz] = place(s, side);
    feet[name] = [sx + (fx - sx) * go, fy * go, sz + (fz - sz) * go];
  }
  return { x, z, yaw, feet, go, phase: (s / step) * Math.PI, s, length: S };
}

// A foot from the world into the character's own space (origin between its feet, facing +z), for a
// character standing at (x, z), turned by yaw, at scale.
export function footLocal([fx, fy, fz], { x, z, yaw }, scale = 1) {
  const dx = fx - x, dz = fz - z, c = Math.cos(yaw), s = Math.sin(yaw);
  return [(dx * c - dz * s) / scale, fy / scale, (dx * s + dz * c) / scale];
}
