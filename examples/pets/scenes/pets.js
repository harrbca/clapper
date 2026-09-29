// What the pets' pages share: poses facing either way, still poses for lab pages, paws kept out of
// the floor, and a wag.
import { plant, trailChain } from '/@kit/cutout.js';

// A pose keyed facing right (as the pets' poses are), played on the other side to face left: L for R,
// and turns the other way.
export const facing = (who, p, n) => (n < 0 ? who.play({ dur: 0, moves: [{ t: 0, pose: p }] }, 0, { mirror: true })[0].pose : p);

// A still pose for a lab page: no breathing, blinks or springs, and (the pets having no lines of
// their own) no lip-sync to the narrator.
export const still = (who, p, t = 0) => who.pose(t, [{ t: -1, dur: 0.001, pose: p }], { still: true, twos: false, speaker: who.id });

// The floor line under a pet on a lab page.
export function floor(ctx, x, y, half) {
  ctx.strokeStyle = '#CFC6B4'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - half, y); ctx.lineTo(x + half, y); ctx.stroke();
}

// Paws kept out of the floor. The poses put every paw on it, but moves blend them turn by turn, so
// between two poses a paw can dip below it: any that does is planted on the floor where it is
// (plant, from cutout.js, bending the leg the way its chain's tag says).
export function grounded(who, p) {
  let out = p;
  for (const [name, ch] of who.chainsOf('leg')) {
    const paw = ch.bones[2], floor = who.where(paw, who.rest)[1], [x, y] = who.where(paw, out);
    if (y > floor + 0.25) out = plant(who, out, name, [x, floor], { quiet: true });
  }
  return out;
}

// A side-to-side sway for wagging, as a motion for trailChain: `amp` units either way, `hz` times a
// second, from t0 (easing in over a quarter of a second). amp(u) can be a function of time.
export const sway = ({ hz = 3, amp = 40, t0 = 0 } = {}) => u => {
  if (u < t0) return 0;
  const a = typeof amp === 'function' ? amp(u) : amp;
  return a * Math.sin((u - t0) * hz * 2 * Math.PI) * Math.min(1, (u - t0) * 4);
};

// A wag: the tail's chain swung by trailChain about the pose it's in (posed: true). key names the
// springs, one per pet on the page.
export const wag = (who, p, t, motion, opts = {}) =>
  trailChain(who, p, t, 'tail', u => [motion(u), 0], { posed: true, lag: 0.04, flutter: 0, stiffness: 320, damping: 16, ...opts });
