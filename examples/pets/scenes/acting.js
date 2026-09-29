// The performance: Biscuit and Miso's moves keyed to the narrator's words, their tails, and the camera.
// Both face each other at 3/4 (Biscuit facing right, Miso left), and turn their heads to look at us:
// their poses tip their bodies, which reads from the side, so their bodies stay turned side on.
import { E, inv, track } from '/@kit/core.js';
import { shot } from '/@kit/camera.js';
import { moves } from '/@kit/puppet.js';
import { cue as c } from '/@kit/timeline.js';
import { cat } from '/@kit/characters/cat.js';
import { dog } from '/@kit/characters/dog.js';
import { facing, sway } from './pets.js';

export const DOG = { x: 640, y: 930, scale: 1 };
export const CAT = { x: 1330, y: 884, scale: 1 };            // on her cushion

const D = dog.poses, K = dog.expressions, left = p => facing(cat, p, -1), S = cat.poses, X = cat.expressions;
const eyes = (x, y = 0) => ({ 'eyes.x': x, 'eyes.y': y });

export const DOG_MOVES = moves([
  // sitting on the rug, watching Miso sleep, a slow wag
  { t: -1, dur: 0.01, pose: { ...D.sit, ...K.happy, 'mood.smile': 0.4, 'body.view': 1, 'head.view': 0, ...eyes(0.4, 0.2) } },
  // "This is Biscuit." he looks round at us and lifts a paw: hello
  { t: c.biscuit - 0.35, dur: 0.22, pose: { 'head.view': -1, ...K.delighted, ...eyes(0) }, ease: E.snap },
  { t: c.biscuit + 0.05, dur: 0.25, pose: D.pawUp, ease: E.snap },
  { t: c.biscuit + 1.0, dur: 0.3, pose: { ...D.sit, ...K.happy } },
  // "And this is Miso." he turns back to watch her
  { t: c.miso - 0.1, dur: 0.3, pose: { 'head.view': 0, ...eyes(0.5, 0.1) } },
  // "Biscuit would very much like to be friends." up, and a play bow
  { t: c.would - 0.3, dur: 0.35, pose: { ...D.stand, ...K.delighted, ...eyes(0.3) }, ease: E.snap },
  { t: c.like - 0.25, dur: 0.3, pose: { ...D.bow, ...K.delighted, ...eyes(0.4, -0.3) }, ease: E.snap },
  // "Miso is not so sure." up again, hopeful and a little worried
  { t: c.not - 0.3, dur: 0.35, pose: { ...D.stand, ...K.worried, 'mood.smile': 0.1, ...eyes(0.4) } },
  // "Then Miso blinks..." he sits to watch
  { t: c.then - 0.2, dur: 0.45, pose: { ...D.sit, ...K.neutral, 'brows.up': 0.35, ...eyes(0.45) } },
  // "In cat, that means yes." up, delighted
  { t: c.cat - 0.1, dur: 0.3, pose: { ...D.stand, ...K.delighted, ...eyes(0.35) }, ease: E.snap },
  // and a look at us
  { t: c.look, dur: 0.25, pose: { 'head.view': -1, ...K.happy, ...eyes(0) }, ease: E.snap },
]);

export const CAT_MOVES = moves([
  // asleep on her cushion
  { t: -1, dur: 0.01, pose: { ...left(S.lie), ...X.neutral, 'lids.drop': 1, 'mood.smile': 0.2, 'body.view': -1, 'head.view': 0, 'head.y': 10 } },
  // "And this is Miso." an eye opens, then both, and she lifts her head to look at us
  { t: c.miso - 0.15, dur: 0.3, pose: { 'lids.drop': 0.45, 'head.y': 0 } },
  { t: c.miso + 0.25, dur: 0.25, pose: { 'lids.drop': 0, 'head.view': 1, ...eyes(0) }, ease: E.snap },
  // "Biscuit would very much like..." she looks at him
  { t: c.would, dur: 0.3, pose: { 'head.view': 0, ...eyes(-0.3), 'mood.smile': 0 } },
  { t: c.like + 0.3, dur: 0.25, pose: { 'brows.up': 0.6, 'eyes.open': 1.1 }, ease: E.snap },
  // "Miso is not so sure." she turns her nose up and away
  { t: c.not - 0.15, dur: 0.3, pose: { ...X.skeptical, 'eyes.open': 1, 'head.view': 2, ...eyes(0.2) }, ease: E.snap },
  // "Then Miso blinks, very slowly." she looks back at him, and blinks as slowly as a cat can
  { t: c.then - 0.2, dur: 0.4, pose: { ...X.neutral, 'mood.smile': 0.35, 'head.view': 0, ...eyes(-0.35) } },
  { t: c.blinks, dur: 0.75, pose: { 'lids.drop': 1 }, ease: E.io },
  { t: c.blinks + 1.25, dur: 0.75, pose: { 'lids.drop': 0 }, ease: E.io },
  // "In cat, that means yes." she sits up, happy
  { t: c.cat - 0.15, dur: 0.45, pose: { ...left(S.sit), ...X.happy, ...eyes(-0.3) } },
  // a paw raised to him, and a look at us
  { t: c.yes + 0.35, dur: 0.25, pose: left(S.pawUp), ease: E.snap },
  { t: c.look - 0.1, dur: 0.3, pose: left(S.sit) },
  { t: c.look + 0.1, dur: 0.25, pose: { 'head.view': 1, ...eyes(0) }, ease: E.snap },
]);

// Bumps over the moves: head tilts, a nose in the air, and a happy hop.
const bump = (t, t0, d) => { const k = (t - t0) / d; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };
const held = (t, t0, t1, d = 0.25) => Math.min(inv(t0, t0 + d, t), 1 - inv(t1, t1 + d, t));
export const dogExtra = t => ({
  'head.r': 0.3 * bump(t, c.friends - 0.05, 1.2) - 0.22 * bump(t, c.sure + 0.1, 1.1),
  'hips.y': -34 * bump(t, c.yes - 0.02, 0.36),
});
export const catExtra = t => ({ 'head.r': -0.16 * held(t, c.not - 0.1, c.then - 0.3) - 0.12 * bump(t, c.slowly - 0.1, 1.6) });

// The tails: Biscuit wags harder the happier he is; Miso sways hers slowly, with a flick at "sure".
export const dogWag = sway({ hz: 3, amp: u => track(u, [[0, 14], [c.biscuit - 0.3, 14], [c.biscuit, 40], [c.miso, 22], [c.would, 44], [c.not - 0.2, 44], [c.not + 0.2, 10],
  [c.then, 10], [c.blinks, 20], [c.cat, 20], [c.yes - 0.2, 52], [c.look + 2, 40]]) });
const catSlow = sway({ hz: 0.7, amp: u => track(u, [[0, 6], [c.miso, 6], [c.miso + 0.5, 14], [c.cat, 14], [c.yes, 22]]) });
export const catSway = u => catSlow(u) + 34 * bump(u, c.sure - 0.05, 0.3);      // and a flick at "sure"
export const DOG_TAIL = { lag: 0.04, stiffness: 320, damping: 16 };
export const CAT_TAIL = { lag: 0.09, stiffness: 140, damping: 11 };

// The camera: the two of them, then in on each as they're introduced, and on Miso for her blink.
const TWO = { zoom: 1.28, x: 985, y: 690 };
const ON_DOG = { zoom: 1.9, x: 575, y: 700 }, ON_CAT = { zoom: 1.7, x: 1410, y: 720 }, BLINK = { zoom: 2.1, x: 1290, y: 610 };
export function camera(t) {
  return shot(t, [
    [0, TWO], [c.biscuit - 0.9, TWO], [c.biscuit - 0.1, ON_DOG], [c.miso - 0.8, ON_DOG], [c.miso - 0.1, ON_CAT],
    [c.would - 0.5, ON_CAT], [c.would + 0.3, TWO], [c.then - 0.3, TWO], [c.blinks - 0.2, BLINK], [c.slowly + 1.0, BLINK],
    [c.cat - 0.1, TWO], [c.look, TWO], [c.look + 2.2, { zoom: 1.36, x: 985, y: 700 }],
  ]);
}
