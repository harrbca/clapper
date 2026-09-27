// Springs: a value that chases a target with some weight to it, so things overshoot, settle, wobble
// and follow through. Simulated at a fixed step from a start time, so any frame gives the same answer
// whatever order frames are drawn in, and cached, so drawing frames in order is cheap.

const DT = 1 / 240;
const cache = new Map();

export const SPRINGS = {
  gentle: { stiffness: 120, damping: 14 },
  wobbly: { stiffness: 180, damping: 9 },
  bouncy: { stiffness: 260, damping: 14 },
  stiff: { stiffness: 400, damping: 36 },
  slow: { stiffness: 60, damping: 16 },
};

// The spring's value at t. `key` names this spring (keep it unique), `target(t)` is where it is
// being pulled, from t0 onwards; before t0 it sits on the target.
export function spring(key, t, target, { t0 = 0, stiffness = 170, damping = 14, preset } = {}) {
  if (preset) ({ stiffness, damping } = SPRINGS[preset]);
  if (t <= t0) return target(t);
  const N = Math.floor((t - t0) / DT);
  let s = cache.get(key);
  if (!s || s.n > N || s.t0 !== t0 || s.k !== stiffness || s.c !== damping) s = { n: 0, x: target(t0), v: 0, t0, k: stiffness, c: damping };
  let { n, x, v } = s;
  while (n < N) {
    const a = stiffness * (target(t0 + n * DT) - x) - damping * v;
    v += a * DT; x += v * DT; n++;
  }
  cache.set(key, { ...s, n, x, v });
  const f = t - t0 - N * DT, a = stiffness * (target(t0 + N * DT) - x) - damping * v;
  return x + (v + a * f) * f;
}

// A spring on [x, y].
export const spring2 = (key, t, target, o) => [
  spring(key + '.x', t, u => target(u)[0], o),
  spring(key + '.y', t, u => target(u)[1], o),
];

// How far a spring is lagging its target: the wobble alone, for dangling things (hair, antennas,
// tails) that should swing when their parent moves. Feed it the parent's position.
export const lag = (key, t, pos, o) => spring(key, t, pos, o) - pos(t);
