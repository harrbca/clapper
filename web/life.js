// The small things that make a character look alive when it isn't doing anything: blinking,
// breathing, glancing about, shifting weight. All deterministic: the same t gives the same moment.
import { clamp, hash } from './core.js';

// Eyelid closure, 0 (open) to 1 (shut). Blinks come every 2 to 5.5 s, sometimes doubled; `seed`
// gives each character its own rhythm. `extra` is a list of times to blink on purpose.
export function blink(t, seed = 1, extra = []) {
  const shut = t0 => {
    const k = t - t0;
    if (k < 0 || k > 0.2) return 0;
    return k < 0.06 ? k / 0.06 : k < 0.09 ? 1 : 1 - (k - 0.09) / 0.11;
  };
  let v = 0;
  for (const t0 of extra) v = Math.max(v, shut(t0));
  let at = 0.6 + hash(seed) * 2;
  for (let i = 0; at <= t + 0.01; i++) {
    if (t - at < 0.5) {
      v = Math.max(v, shut(at));
      if (hash(seed * 7 + i) < 0.18) v = Math.max(v, shut(at + 0.24));
    }
    at += 2 + hash(seed * 13 + i * 1.7) * 3.5;
  }
  return v;
}

// Breathing, -1 to 1, about 15 breaths a minute.
export const breath = (t, seed = 1) => Math.sin((t + hash(seed) * 4) * 1.6);

// Where the eyes drift when idle: small jumps, held a while, as [x, y] in -1..1.
export function glance(t, seed = 1) {
  let at = 0, i = 0, cur = [0, 0], prev = [0, 0];
  while (true) {
    const next = at + 0.8 + hash(seed * 3 + i) * 2.4;
    if (next > t) break;
    prev = cur;
    cur = hash(seed + i * 5.1) < 0.45 ? [0, 0] : [(hash(seed + i * 2.3) - 0.5) * 1.6, (hash(seed + i * 3.7) - 0.5) * 0.8];
    at = next; i++;
  }
  const k = clamp((t - at) / 0.06);                 // eyes jump fast
  return [prev[0] + (cur[0] - prev[0]) * k, prev[1] + (cur[1] - prev[1]) * k];
}

// A slow sway, -1 to 1, for weight shifting from foot to foot.
export const sway = (t, seed = 1) => Math.sin(t * 0.7 + hash(seed) * 6) * 0.7 + Math.sin(t * 1.9 + hash(seed * 2) * 6) * 0.3;
