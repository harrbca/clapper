// The performance: Dex's moves keyed to the words, his scanner, the walk off, and the camera.
import { E, inv, wiggle } from '/@kit/core.js';
import { shot } from '/@kit/camera.js';
import { HAND } from '/@kit/cutout.js';
import { moves } from '/@kit/puppet.js';
import { cue as c } from '/@kit/timeline.js';
import { dex, EXPR, POSES, REST } from '/@kit/characters/dex.js';

export const FLOOR = 1010;
export const DEX = { x: 1000, y: FLOOR, scale: 0.9 };

const wrap = a => a - Math.round(a / (2 * Math.PI)) * 2 * Math.PI;
const reachR = (x, y, bend = 1) => { const p = dex.reach(REST, 'armR', 'foreR', [x, y], bend); return { 'armR.r': wrap(p['armR.r']), 'foreR.r': wrap(p['foreR.r']) }; };
const LOOK = (x = 0, y = 0) => ({ 'eyes.x': x, 'eyes.y': y });

// the scanner arm (left): down at his side, up to read it, held out to show us, aimed at a bin
const SCAN_DOWN = { 'armL.r': 0.14, 'foreL.r': -0.3, 'handL.shape': HAND.grip, 'handL.r': -0.2 };
const SCAN_READ = { 'armL.r': 0.25, 'foreL.r': -1.75, 'handL.shape': HAND.grip, 'handL.r': 0.2 };
const SCAN_SHOW = { 'armL.r': 0.55, 'foreL.r': -2.05, 'handL.shape': HAND.grip, 'handL.r': 0.3 };
const SCAN_AIM = { 'armL.r': -1.25, 'foreL.r': -0.25, 'handL.shape': HAND.grip, 'handL.r': 0.05 };
const SCAN_LOW = { 'armL.r': -0.95, 'foreL.r': -0.2, 'handL.shape': HAND.grip, 'handL.r': 0.05 };
const R_DOWN = { 'armR.r': -0.1, 'foreR.r': 0.1, 'handR.shape': HAND.relaxed, 'handR.r': 0, 'handR.flip': 0 };
const CHEST = { ...reachR(12, -572, -1), 'handR.shape': HAND.palm, 'handR.r': 0.5, 'handR.flip': 0 };
const OFFER = { 'armR.r': -0.55, 'foreR.r': -0.95, 'handR.shape': HAND.open, 'handR.flip': 1, 'handR.r': -0.3 };

export const DEX_MOVES = moves([
  // reading his scanner, turned towards the racking
  { t: -1, dur: 0.01, pose: { ...EXPR.neutral, 'body.view': 1, 'head.view': 0, ...SCAN_READ, ...LOOK(-0.2, 0.7), 'head.r': 0.08 } },
  // he notices us: the head turns first, then the body comes round under it
  { t: c.look, dur: 0.22, pose: { 'head.view': -1, ...LOOK(0, 0), 'head.r': 0, 'brows.up': 0.5 }, ease: E.snap },
  { t: c.look + 0.35, dur: 0.4, pose: { 'body.view': 0, 'head.view': 0, ...SCAN_DOWN, 'brows.up': 0 } },
  // "Morning!" a wave
  { t: c.morning - 0.2, dur: 0.25, pose: { ...POSES.wave, ...EXPR.happy }, ease: E.snap, anticipate: 0.25 },
  // "I'm Dex." a hand on his chest
  { t: c.dex - 0.15, dur: 0.25, pose: { ...CHEST, 'mood.smile': 0.5, 'head.r': -0.05 }, ease: E.snap },
  // "...the night shift." an open hand, eyebrows up
  { t: c.night - 0.25, dur: 0.3, pose: { ...OFFER, 'brows.up': 0.4, 'head.r': 0.06, ...LOOK(0.15, 0) } },
  // "See this?" the scanner held up to us
  { t: c.see - 0.3, dur: 0.3, pose: { ...R_DOWN, ...SCAN_SHOW, ...EXPR.neutral, 'brows.up': 0.6, 'mood.smile': 0.3, ...LOOK(-0.45, -0.15), 'head.r': 0 }, ease: E.snap },
  // "Scan the bin," turned to the racking, aiming it
  { t: c.bin - 0.35, dur: 0.3, pose: { 'body.view': 1, ...SCAN_AIM, 'lids.drop': 0.22, 'brows.in': 0.3, ...LOOK(0.4, 0) }, ease: E.snap },
  // "scan the item." lower, at a carton
  { t: c.item - 0.25, dur: 0.22, pose: { ...SCAN_LOW, ...LOOK(0.4, 0.4) }, ease: E.snap },
  // "Done." back to us, a thumbs up
  { t: c.done - 0.25, dur: 0.25, pose: { 'body.view': 0, ...SCAN_DOWN, ...POSES.thumbsUp, ...EXPR.delighted, ...LOOK(0, 0) }, ease: E.snap, anticipate: 0.2 },
  // "Wrong bin?" one brow up, a tilt
  { t: c.wrong - 0.25, dur: 0.3, pose: { ...R_DOWN, ...EXPR.skeptical, 'head.r': 0.12 } },
  // "It beeps at you." a wince, the scanner up
  { t: c.beeps - 0.2, dur: 0.2, pose: { ...SCAN_READ, ...EXPR.worried, 'eyes.squint': 0.5, 'head.r': -0.06, ...LOOK(-0.3, 0.2) }, ease: E.snap },
  // "Loudly." deadpan, straight at us
  { t: c.loudly - 0.15, dur: 0.2, pose: { ...SCAN_DOWN, ...EXPR.deadpan, 'head.r': 0, ...LOOK(0, 0) }, ease: E.snap },
  // "Anyway." a shrug
  { t: c.anyway - 0.2, dur: 0.25, pose: { 'armR.r': -0.55, 'foreR.r': -1.3, 'handR.shape': HAND.open, 'handR.flip': 0, 'handR.r': -0.9, 'armL.r': 0.5, 'foreL.r': 1.2, 'handL.r': 0.6, ...EXPR.neutral, 'brows.up': 0.5, 'lids.drop': 0.25, 'head.r': 0.1 }, ease: E.snap, anticipate: 0.2 },
  // "Aisle twelve..." pointing off to his left, looking there
  { t: c.aisle - 0.25, dur: 0.3, pose: { ...POSES.point, ...SCAN_DOWN, 'head.view': 1, 'head.r': 0, ...LOOK(0.3, 0), 'mood.smile': 0.2 }, ease: E.snap },
  // and off he goes: a turn to profile, arms down
  { t: c.exit, dur: 0.3, pose: { 'body.view': 2, 'head.view': 0, ...R_DOWN, ...SCAN_DOWN, ...EXPR.neutral } },
]);

// The walk off (walk2d): once he's turned side-on, out of the frame to the right, feet planted.
export const WALK = { x0: DEX.x, x1: DEX.x + 1500, t0: c.exit + 0.3, t1: c.exit + 4.3, step: 240, lift: 40 };

// Motion over the choreography: the wave's flap, the thumbs-up's pump, a jolt at the beep.
const bump = (t, t0, d = 0.25) => { const k = (t - t0) / d; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };
export function dexExtra(t) {
  return {
    'handR.r': wiggle(t, c.morning, 0.9, 0.35, 3),
    'foreR.r': -bump(t, c.done, 0.2) * 0.15,
    'head.y': bump(t, c.beeps + 0.05, 0.25) * 8,
    'head.r': wiggle(t, c.wrong + 0.1, 0.5, 0.03, 2),
  };
}

// The scanner's laser and light: two scans, a good beep and a bad one.
export function scanState(t) {
  const flash = (t0, d = 0.35) => (t >= t0 && t < t0 + d ? 1 : 0);
  const laser = Math.max(flash(c.bin + 0.05), flash(c.item + 0.05));
  const light = flash(c.bin + 0.15, 0.4) || flash(c.item + 0.15, 0.4) ? 'ok' : flash(c.beeps + 0.05, 0.6) ? 'bad' : null;
  return { laser, light };
}

// The camera: a medium shot that pushes in on "Loudly." and pulls back to watch him go.
export function camera(t) {
  return shot(t, [
    [0, { zoom: 1.3, x: 1000, y: 520 }], [c.see, { zoom: 1.3, x: 1000, y: 520 }], [c.bin, { zoom: 1.22, x: 1080, y: 540 }],
    [c.done, { zoom: 1.3, x: 1000, y: 520 }], [c.loudly - 0.1, { zoom: 1.3, x: 1000, y: 520 }], [c.loudly + 0.15, { zoom: 1.6, x: 1000, y: 360 }],
    [c.anyway, { zoom: 1.6, x: 1000, y: 360 }], [c.anyway + 0.35, { zoom: 1.3, x: 1000, y: 520 }], [c.exit, { zoom: 1.3, x: 1000, y: 520 }],
    [c.exit + 1.0, { zoom: 1.0, x: 960, y: 540 }],
  ]);
}
export const done = t => inv(c.exit + 2.2, c.exit + 2.8, t);
