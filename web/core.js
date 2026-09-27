// Time and motion. Every frame is a pure function of t, seconds into the video, so the same frame
// comes out identical whether it plays live or renders offline, in any order.

export const TAU = Math.PI * 2;

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, k) => a + (b - a) * k;
// Where x sits between a and b, from 0 to 1.
export const inv = (a, b, x) => (b <= a ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a)));

// Easing curves, 0 -> 1.
export const E = {
  linear: k => k,
  out: k => 1 - Math.pow(1 - k, 3),
  in: k => k * k * k,
  io: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  back: k => 1 + 2.9 * Math.pow(k - 1, 3) + 1.9 * Math.pow(k - 1, 2),          // overshoots, then settles
  el: k => (k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (TAU / 3)) + 1),
  bounce: k => {
    const n1 = 7.5625, d1 = 2.75;
    if (k < 1 / d1) return n1 * k * k;
    if (k < 2 / d1) return n1 * (k -= 1.5 / d1) * k + 0.75;
    if (k < 2.5 / d1) return n1 * (k -= 2.25 / d1) * k + 0.9375;
    return n1 * (k -= 2.625 / d1) * k + 0.984375;
  },
};

// 0 before t0, easing up to 1 over d seconds.
export const on = (t, t0, d = 0.25) => inv(t0, t0 + d, t);
// Fades in from inAt over inDur, and out from outAt over outDur.
export const inOut = (t, inAt, inDur, outAt, outDur) => Math.min(on(t, inAt, inDur), 1 - on(t, outAt, outDur));
export const pop = (t, t0, d = 0.4) => E.back(on(t, t0, d));

export function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); }
export const angleTo = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]);

// A decaying shake from t0: [dx, dy].
export function shake(t, t0, dur = 0.5, amp = 18) {
  const k = t - t0;
  if (k < 0 || k > dur) return [0, 0];
  const d = amp * (1 - k / dur);
  return [Math.sin(k * 90) * d, Math.cos(k * 73) * d * 0.7];
}

// Keyframes: track(t, [[t0, v0], [t1, v1], ...]) eases between neighbours. Values may be numbers
// or arrays of numbers. Repeat a value to hold it.
export function track(t, keys, ease = E.io) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const k = ease(inv(t0, t1, t));
      return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}

// Two-bone limb from the shoulder (sx, sy) reaching for (tx, ty), bones a and b long.
// bend +1 puts the elbow below the reach, -1 above. Returns the elbow and the hand.
export function ik(sx, sy, tx, ty, a, b, bend = 1) {
  const dx = tx - sx, dy = ty - sy;
  const d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 1, a + b - 0.5);
  const base = Math.atan2(dy, dx);
  const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const ang = base + bend * A;
  return { ex: sx + a * Math.cos(ang), ey: sy + a * Math.sin(ang), hx: sx + d * Math.cos(base), hy: sy + d * Math.sin(base) };
}
