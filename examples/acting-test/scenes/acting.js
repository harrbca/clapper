// The performance: Pip's moves, keyed to the words, and the camera.
import { clamp, E, on, wiggle } from '/@kit/core.js';
import { shot } from '/@kit/camera.js';
import { moves } from '/@kit/puppet.js';
import { cue as c, line } from '/@kit/timeline.js';
import { EXPR, pip, POSES, REST } from '/@kit/characters/pip.js';

// Waist-up: her feet are below the frame.
export const PIP = { x: 960, y: 1390, scale: 1.36 };

// Arms placed by where the hands go, in Pip's space (origin at her feet, up is -y).
const reachL = (x, y, bend = -1) => { const p = pip.reach(REST, 'armL', 'foreL', [x, y], bend); return { 'armL.r': p['armL.r'], 'foreL.r': p['foreL.r'] }; };
const reachR = (x, y, bend = 1) => { const p = pip.reach(REST, 'armR', 'foreR', [x, y], bend); return { 'armR.r': p['armR.r'], 'foreR.r': p['foreR.r'] }; };
const ARMS = { ...POSES.rest, 'handL.r': 0, 'handR.r': 0 };
const LOOK = (x = 0, y = 0) => ({ 'eyes.x': x, 'eyes.y': y });

const STOP = { ...reachL(-175, -665), ...reachR(175, -665), 'handL.form': 0, 'handR.form': 0 };                  // hands up, palms out, elbows down
const COUNT = { ...reachR(235, -715), 'handR.form': 1, 'armL.r': 0.13, 'foreL.r': -0.14, 'handL.form': 4 };        // a finger up, beside her face
const HIP_R = { ...reachR(102, -392, -1), 'handR.form': 2 };
const PALMS = { ...reachL(-215, -480), ...reachR(215, -480), 'handL.form': 0, 'handR.form': 0, 'handL.r': 0.5, 'handR.r': -0.5 };
const CHIN = { ...reachR(28, -640, -1), 'handR.form': 2, 'handR.r': 0.2, 'armL.r': 0.13, 'foreL.r': -0.14 };
const JAZZ = { ...reachL(-230, -720), ...reachR(230, -720), 'handL.form': 0, 'handR.form': 0 };
const CROSSED = { ...reachL(70, -480, 1), ...reachR(-66, -470, -1), 'handL.form': 4, 'handR.form': 4 };

const say = id => line(id);

export const PIP_MOVES = moves([
  // before anything is said, she is reading something off to her left
  { t: 0, dur: 0.01, pose: { ...EXPR.neutral, ...LOOK(0.75, 0.15) } },
  // "Wait." A take: winds up, then snaps back, eyes wide, hands up
  { t: c.wait - 0.08, dur: 0.2, pose: { ...ARMS, ...STOP, ...EXPR.surprised, ...LOOK(0, 0), 'head.r': -0.07 }, ease: E.snap, anticipate: 0.3 },
  // "It draws every single frame..." A finger up, counting; eyes narrowing
  { t: c.every - 0.2, dur: 0.3, pose: { ...ARMS, ...COUNT, ...EXPR.neutral, 'lids.drop': 0.22, 'brows.in': 0.35, 'mood.smile': 0, ...LOOK(0.15, -0.3), 'head.r': 0 }, ease: E.snap },
  // "...by itself?" A tilted head, a hand on the hip, one brow up
  { t: c.itself - 0.15, dur: 0.3, pose: { ...ARMS, ...HIP_R, ...EXPR.skeptical, ...LOOK(0, 0), 'head.r': 0.15 }, ease: E.snap, anticipate: 0.15 },
  // "No keyframes?" Palms up
  { t: c.keyframes - 0.25, dur: 0.28, pose: { ...ARMS, ...PALMS, ...EXPR.neutral, 'brows.up': 0.7, 'eyes.open': 1.1, 'mood.smile': 0, 'head.r': -0.04, ...LOOK(0.2, 0) }, ease: E.snap },
  // "No timeline?" Looking the other way, one brow higher
  { t: c.timeline - 0.25, dur: 0.28, pose: { 'browL.up': 0.6, 'handL.r': 0.8, 'handR.r': -0.8, 'head.r': 0.06, ...LOOK(-0.6, 0) }, ease: E.snap },
  // "Nothing?" The full shrug
  { t: c.nothing - 0.12, dur: 0.25, pose: { ...ARMS, ...POSES.shrug, ...EXPR.shocked, 'jaw': 0.15, 'mood.smile': -0.2, ...LOOK(0, 0), 'head.r': 0.1 }, ease: E.snap, anticipate: 0.25 },
  // "Okay." A deflating breath: arms drop, eyes close
  { t: c.okay - 0.35, dur: 0.6, pose: { ...ARMS, ...EXPR.deadpan, 'eyes.blink': 1, 'head.r': 0.04, 'head.y': 6 }, ease: E.io },
  { t: c.okay + 0.2, dur: 0.2, pose: { 'eyes.blink': 0 } },
  // "That's actually..." A hand at the chin, eyes up, thinking
  { t: c.actually - 0.3, dur: 0.4, pose: { ...CHIN, ...EXPR.neutral, 'mood.smile': -0.05, 'mouth.cornerL': -0.3, 'browR.up': 0.6, 'head.r': -0.06, ...LOOK(0.5, -0.75) } },
  // "...kind of amazing." Delighted: jazz hands
  { t: c.amazing - 0.15, dur: 0.22, pose: { ...ARMS, ...JAZZ, ...EXPR.delighted, 'head.r': 0, ...LOOK(0, 0) }, ease: E.snap, anticipate: 0.3 },
  // "Not that I needed the help." Arms crossed, turning away, smug
  { t: c.not - 0.2, dur: 0.4, pose: { ...ARMS, ...CROSSED, ...EXPR.smug, 'head.r': -0.1, 'torso.r': -0.04, ...LOOK(-1, -0.05) } },
  // "Obviously." An eye roll, up and over
  { t: c.obviously - 0.05, dur: 0.25, pose: { ...LOOK(-0.2, -1), 'lids.drop': 0.3 } },
  { t: c.obviously + 0.22, dur: 0.3, pose: { ...LOOK(0.9, -0.35), 'lids.drop': 0.45 } },
  // a glance back at us, and a wink
  { t: say('help').end + 0.3, dur: 0.35, pose: { ...LOOK(0, 0), 'head.r': -0.04, 'lids.drop': 0.2, 'mood.smile': 0.7, 'mouth.cornerR': 0.5 } },
  { t: c.wink, dur: 0.08, pose: { 'lidR.drop': 1, 'browR.up': -0.4, 'mood.smile': 0.9 } },
  { t: c.wink + 0.3, dur: 0.1, pose: { 'lidR.drop': 0, 'browR.up': 0 } },
]);

// Motion over the choreography: the take's jolt, the counting taps, a hop on "amazing", the hair flip.
const bump = (t, t0, d = 0.25) => { const k = (t - t0) / d; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };
export function pipExtra(t) {
  const tap = w => bump(t, w, 0.16) * -0.22;
  return {
    'hips.y': bump(t, c.wait - 0.02, 0.3) * 10 - bump(t, c.amazing, 0.35) * 30,
    'torso.sy': 1 - bump(t, c.wait - 0.1, 0.12) * 0.05 + bump(t, c.wait + 0.02, 0.25) * 0.03,
    'foreR.r': tap(c.every) + tap(c.single) + tap(c.frame),
    'head.r': wiggle(t, c.keyframes, 0.8, 0.05, 3) + wiggle(t, c.nothing + 0.1, 0.9, 0.04, 2.5) - bump(t, c.obviously + 0.05, 0.4) * 0.2,
    'handL.r': wiggle(t, c.amazing + 0.1, 1.0, 0.25, 5), 'handR.r': wiggle(t, c.amazing + 0.1, 1.0, 0.25, 5),
  };
}

// The camera: a slow drift, pushing in on the big beats.
export function camera(t) {
  return shot(t, [
    [0, { zoom: 1.02, y: 560 }], [c.wait, { zoom: 1.02, y: 560 }], [c.wait + 0.25, { zoom: 1.06, y: 520 }],
    [c.nothing - 0.2, { zoom: 1.06, y: 520 }], [c.nothing + 0.3, { zoom: 1.14, y: 470, x: 960 }],
    [c.okay - 0.3, { zoom: 1.14, y: 470 }], [c.okay + 0.6, { zoom: 1.04, y: 540 }],
    [c.amazing - 0.1, { zoom: 1.04, y: 540 }], [c.amazing + 0.25, { zoom: 1.12, y: 480 }],
    [c.not - 0.3, { zoom: 1.12, y: 480 }], [c.not + 0.8, { zoom: 1.05, y: 520, x: 930 }],
    [c.wink - 0.4, { zoom: 1.05, y: 520, x: 930 }], [c.wink + 0.2, { zoom: 1.1, y: 480, x: 960 }],
  ], E.io);
}

// No motion blur: Pip is animated on twos, and blur across a change of drawing shows both drawings at
// once. TV animation on twos relies on held drawings and snappy timing instead.
