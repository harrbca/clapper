// Bouncing, as plain arithmetic, shared by the picture (props.js) and the sound (timeline.js, which
// puts a tap on every landing). No imports, so Node and the browser can both load it.

export const G = 2600;               // gravity, px/s²

// A ball dropped from `h` px above the floor at t0, keeping `e` of its speed at each bounce.
// Returns { y (height above the floor), impact (time since the last landing, or null), n (landings) }.
export function drop(t, t0, h, e = 0.62) {
  if (t < t0) return { y: h, impact: null, n: 0 };
  let t1 = Math.sqrt((2 * h) / G), v = G * t1, at = t0 + t1, n = 0;
  if (t < at) { const u = t - t0; return { y: h - 0.5 * G * u * u, impact: null, n: 0 }; }
  while (v > 60) {
    v *= e; n++;
    const flight = (2 * v) / G;
    if (t < at + flight) { const u = t - at; return { y: v * u - 0.5 * G * u * u, impact: u, n }; }
    at += flight;
  }
  return { y: 0, impact: t - at, n };
}

// Every landing time, for the sound.
export function landings(t0, h, e = 0.62) {
  const out = [];
  let t1 = Math.sqrt((2 * h) / G), v = G * t1, at = t0 + t1;
  out.push([at, 1]);
  while (v > 120) { v *= e; at += (2 * v) / G; out.push([at, v / (G * t1)]); }
  return out;
}

export const BALLS = [
  { x: 1230, h: 760, delay: 0, r: 46, col: '#FF8A1F' },
  { x: 1440, h: 820, delay: 0.16, r: 38, col: '#23A89A' },
  { x: 1640, h: 700, delay: 0.3, r: 42, col: '#FFC24A' },
];
