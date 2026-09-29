// The performance: cut-out Pip's moves, keyed to the same words as the toon acting test
// (examples/acting-test), staged for the cut-out rig: full length, a turn away and a glance back,
// and her ponytail swinging on its own through the take, the hop, the turns and a toss of the head.
import { E, wiggle } from '/@kit/core.js';
import { shot } from '/@kit/camera.js';
import { HAND, reachChain } from '/@kit/cutout.js';
import { moves } from '/@kit/puppet.js';
import { cue as c, line } from '/@kit/timeline.js';
import { EXPR, pip, POSES, REST } from '/@kit/characters/pip-cutout.js';

// Full length, standing on the floor of the room.
export const PIP = { x: 960, y: 1000, scale: 0.98 };

// Arms placed by where the hands go, in Pip's space (origin at her feet, up is -y); `bend` picks
// which way the elbow points. (angles wrapped to within half a turn, so arms swing the short way)
const wrap = a => a - Math.round(a / (2 * Math.PI)) * 2 * Math.PI;
function arm(chain, x, y, bend) {
  const p = reachChain(pip, REST, chain, [x, y], { bend, quiet: true }), [a, b] = pip.chain(chain).bones;
  return { [`${a}.r`]: wrap(p[`${a}.r`]), [`${b}.r`]: wrap(p[`${b}.r`]) };
}
const ARMS = { 'armL.r': REST['armL.r'], 'foreL.r': REST['foreL.r'], 'armR.r': REST['armR.r'], 'foreR.r': REST['foreR.r'],
  'handL.shape': HAND.relaxed, 'handR.shape': HAND.relaxed, 'handL.r': 0, 'handR.r': 0, 'handL.flip': 0, 'handR.flip': 0 };
const LOOK = (x = 0, y = 0) => ({ 'eyes.x': x, 'eyes.y': y });

const COUNT = { ...arm('armR', 176, -792, 1), 'handR.shape': HAND.point, 'handR.r': 0, 'armL.r': REST['armL.r'], 'foreL.r': REST['foreL.r'], 'handL.shape': HAND.relaxed };
const HIP_R = { 'armR.r': POSES.hips['armR.r'], 'foreR.r': POSES.hips['foreR.r'], 'handR.shape': HAND.fist, 'handR.r': -0.5 };
const PALMS = { ...arm('armL', -215, -470, -1), ...arm('armR', 215, -470, 1), 'handL.shape': HAND.open, 'handR.shape': HAND.open, 'handL.r': 0.5, 'handR.r': -0.5 };
const CHIN = { ...arm('armR', 16, -676, -1), 'handR.shape': HAND.fist, 'handR.r': 0.2, 'armL.r': REST['armL.r'], 'foreL.r': REST['foreL.r'] };
const JAZZ = { ...arm('armL', -235, -830, -1), ...arm('armR', 235, -830, 1), 'handL.shape': HAND.spread, 'handR.shape': HAND.spread };
const CROSSED = { 'armL.r': 0.25, 'foreL.r': -1.9, 'armR.r': -0.25, 'foreR.r': 1.95, 'handL.shape': HAND.fist, 'handR.shape': HAND.fist, 'handL.r': -0.2, 'handR.r': 0.2 };

const say = id => line(id);

export const PIP_MOVES = moves([
  // before anything is said, she's reading something off to her left
  { t: 0, dur: 0.01, pose: { ...EXPR.neutral, 'mood.smile': 0.15, ...LOOK(0.75, 0.15) } },
  // "Wait." A take: down, then up, eyes wide, arms out
  ...pip.play('take', c.wait - 0.16),
  { t: c.wait + 0.1, dur: 0.3, pose: { ...EXPR.surprised, ...LOOK(0, 0) } },
  // "It draws every single frame..." A finger up, counting; eyes narrowing
  { t: c.every - 0.2, dur: 0.3, pose: { ...ARMS, ...COUNT, ...EXPR.neutral, 'lids.drop': 0.22, 'brows.in': 0.35, ...LOOK(0.15, -0.3), 'head.r': 0 }, ease: E.snap },
  // "...by itself?" A tilted head, a hand on the hip, one brow up
  { t: c.itself - 0.15, dur: 0.3, pose: { ...ARMS, ...HIP_R, ...EXPR.skeptical, ...LOOK(0, 0), 'head.r': 0.15 }, ease: E.snap, anticipate: 0.15 },
  // "No keyframes?" Palms up
  { t: c.keyframes - 0.25, dur: 0.28, pose: { ...ARMS, ...PALMS, ...EXPR.neutral, 'brows.up': 0.7, 'eyes.open': 1.1, 'head.r': -0.04, ...LOOK(0.2, 0) }, ease: E.snap },
  // "No timeline?" Looking the other way, one brow higher
  { t: c.timeline - 0.25, dur: 0.28, pose: { 'browL.up': 0.6, 'handL.r': 0.8, 'handR.r': -0.8, 'head.r': 0.06, ...LOOK(-0.6, 0) }, ease: E.snap },
  // "Nothing?" The full shrug
  { t: c.nothing - 0.12, dur: 0.25, pose: { ...ARMS, ...POSES.shrug, ...EXPR.shocked, 'mood.smile': -0.2, ...LOOK(0, 0), 'head.r': 0.1 }, ease: E.snap, anticipate: 0.25 },
  // "Okay." A deflating breath: arms drop, eyes close
  { t: c.okay - 0.35, dur: 0.6, pose: { ...ARMS, ...EXPR.deadpan, 'eyes.blink': 1, 'head.r': 0.04, 'head.y': 6 }, ease: E.io },
  { t: c.okay + 0.2, dur: 0.2, pose: { 'eyes.blink': 0 } },
  // "That's actually..." A hand at the chin, eyes up, thinking
  { t: c.actually - 0.3, dur: 0.4, pose: { ...CHIN, ...EXPR.neutral, 'mood.smile': -0.05, 'mouth.cornerL': -0.3, 'browR.up': 0.6, 'head.r': -0.06, 'head.y': 0, ...LOOK(0.5, -0.75) } },
  // "...kind of amazing." Delighted: jazz hands, and a hop (in pipExtra)
  { t: c.amazing - 0.15, dur: 0.22, pose: { ...ARMS, ...JAZZ, ...EXPR.delighted, 'head.r': 0, ...LOOK(0, 0) }, ease: E.snap, anticipate: 0.3 },
  // (the jazz hands come down first, so they don't sweep across her face on the way to crossing)
  { t: c.not - 0.55, dur: 0.25, pose: { ...ARMS, 'handL.shape': HAND.open, 'handR.shape': HAND.open }, ease: E.in },
  // "Not that I needed the help." She turns away, arms crossed, nose in the air
  ...pip.play('turn', c.not - 0.32, { from: 0, to: -1 }),
  { t: c.not - 0.22, dur: 0.35, pose: { ...CROSSED, ...EXPR.smug, 'head.r': 0.08, ...LOOK(-1, -0.05) } },
  // "Obviously." An eye roll, up and over, and a toss of the head (in pipExtra)
  { t: c.obviously - 0.05, dur: 0.25, pose: { ...LOOK(-0.2, -1), 'lids.drop': 0.3 } },
  { t: c.obviously + 0.22, dur: 0.3, pose: { ...LOOK(0.9, -0.35), 'lids.drop': 0.45 } },
  // her head comes back round to us, and a wink
  { t: say('help').end + 0.3, dur: 0.3, pose: { 'head.view': 1, ...LOOK(0, 0), 'head.r': 0, 'lids.drop': 0.2, 'mood.smile': 0.7, 'mouth.cornerR': 0.5 }, ease: E.snap },
  { t: c.wink, dur: 0.08, pose: { 'lidR.drop': 1, 'browR.up': -0.4, 'mood.smile': 0.9 } },
  { t: c.wink + 0.3, dur: 0.1, pose: { 'lidR.drop': 0, 'browR.up': 0 } },
]);

// Motion over the choreography: the counting taps, a hop on "amazing", a toss of the head on
// "Obviously", wiggles. The ponytail answers all of it.
const bump = (t, t0, d = 0.25) => { const k = (t - t0) / d; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };
export const hop = t => bump(t, c.amazing, 0.42) * 46;
export function pipExtra(t) {
  const tap = w => bump(t, w, 0.16) * -0.22;
  return {
    'hips.y': -hop(t),
    'foreR.r': tap(c.every) + tap(c.single) + tap(c.frame),
    'head.r': wiggle(t, c.keyframes, 0.8, 0.05, 3) + wiggle(t, c.nothing + 0.1, 0.9, 0.04, 2.5) + bump(t, c.obviously + 0.02, 0.4) * 0.24,
    'handL.r': wiggle(t, c.amazing + 0.1, 1.0, 0.25, 5), 'handR.r': wiggle(t, c.amazing + 0.1, 1.0, 0.25, 5),
  };
}

// The camera: all of her to start, pushing in on the big beats, back out for the turn.
export function camera(t) {
  return shot(t, [
    [0, { zoom: 1, y: 540 }], [c.wait, { zoom: 1, y: 540 }], [c.wait + 0.3, { zoom: 1.2, y: 450 }],
    [c.nothing - 0.2, { zoom: 1.2, y: 450 }], [c.nothing + 0.3, { zoom: 1.45, y: 370 }],
    [c.okay - 0.3, { zoom: 1.45, y: 370 }], [c.okay + 0.6, { zoom: 1.15, y: 470 }],
    [c.amazing - 0.2, { zoom: 1.15, y: 470 }], [c.amazing + 0.2, { zoom: 1.05, y: 520 }],
    [c.not - 0.3, { zoom: 1.05, y: 520 }], [c.not + 0.8, { zoom: 1.25, y: 430, x: 930 }],
    [c.wink - 0.45, { zoom: 1.25, y: 430, x: 930 }], [c.wink + 0.15, { zoom: 1.6, y: 330, x: 950 }],
  ], E.io);
}
