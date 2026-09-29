// The key poses of the stunt, as an animator draws them first: stand, crouch, take-off, tuck, open,
// impact, the hero landing, and the look up. Feet and hands that touch something are placed by IK
// on the finished pose (contacts), so they stay put whatever the body does.
import { bodyAngle, HAND, MOUTH, plant, reachChain } from '/@kit/cutout.js';
import { dex, EXPR } from '/@kit/characters/dex.js';

// the ankle sits this far above the sole (Dex's boots are drawn at 1.2x)
export const ANKLE = -44;

const hands = (L, R) => ({ 'handL.shape': L, 'handR.shape': R, 'handL.flip': 0, 'handR.flip': 0 });
const LEGS0 = { 'legL.r': 0.02, 'legR.r': -0.02, 'shinL.r': 0, 'shinR.r': 0, 'footL.r': 0, 'footR.r': 0 };

export const KEY = {
  // on the table, in profile, sizing up the drop
  stand: { ...LEGS0, 'body.view': 2, 'hips.y': 0, 'hips.r': 0, 'torso.r': 0, 'hips.sy': 1, 'torso.sy': 1, 'head.r': 0.18, 'armL.r': 0.05, 'foreL.r': -0.1, 'armR.r': 0.05, 'foreR.r': -0.1, ...hands(HAND.relaxed, HAND.relaxed), ...EXPR.neutral, 'eyes.y': 0.6 },
  // the wind-up: down, forward, arms back
  crouch: { 'body.view': 2, 'hips.y': 125, 'torso.r': 0.5, 'head.r': -0.35, 'armL.r': 1.25, 'foreL.r': -0.35, 'armR.r': 1.1, 'foreR.r': -0.25, ...hands(HAND.open, HAND.open), ...EXPR.neutral, 'brows.in': 0.6, 'lids.drop': 0.2, 'eyes.y': 0, 'mouth.shape': MOUTH.grimace },
  // off the edge: stretched out, arms thrown up
  takeoff: { 'body.view': 2, 'hips.y': -20, 'hips.sy': 1.08, 'torso.r': 0.12, 'head.r': -0.1, 'legL.r': 0.45, 'shinL.r': 0.2, 'legR.r': 0.25, 'shinR.r': 0.15, 'footL.r': 0.7, 'footR.r': 0.6, 'armL.r': -2.75, 'foreL.r': -0.15, 'armR.r': -2.55, 'foreR.r': -0.1, ...hands(HAND.spread, HAND.spread), ...EXPR.delighted },
  // the tuck: knees to the chest, hands on the shins
  // (the near leg comes in front of the body, so the knees read against the chest)
  tuck: { 'body.view': 2, 'hips.y': 0, 'hips.sy': 1, 'torso.r': 0.85, 'head.r': 0.35, 'legL.r': -1.95, 'shinL.r': 2.25, 'legR.r': -1.8, 'shinR.r': 2.2, 'footL.r': 0.5, 'footR.r': 0.5, 'legL.z': 3, 'footL.z': 3.1, ...hands(HAND.fist, HAND.fist), ...EXPR.neutral, 'eyes.squint': 0.6, 'eyes.blink': 1 },
  // opening out for the landing: legs reach for the floor, arms out for balance
  open: { 'body.view': 2, 'legL.z': 0.3, 'footL.z': 0.4, 'hips.y': 0, 'torso.r': 0.08, 'head.r': 0.2, 'legL.r': -0.4, 'shinL.r': 0.45, 'legR.r': 0.1, 'shinR.r': 0.3, 'footL.r': 0.2, 'footR.r': 0.1, 'armL.r': -1.9, 'foreL.r': -0.3, 'armR.r': 1.9, 'foreR.r': 0.25, ...hands(HAND.spread, HAND.spread), ...EXPR.neutral, 'brows.in': 0.7, 'lids.drop': 0.1, 'eyes.blink': 0, 'eyes.squint': 0, 'eyes.y': 0.6 },
  // impact: turned to us at 3/4, squashed deep
  impact: { 'body.view': 1, 'hips.y': 250, 'hips.sy': 1, 'torso.r': 0.75, 'torso.sy': 0.88, 'head.r': 0.35, 'armL.r': -0.4, 'foreL.r': -0.3, 'armR.r': 1.9, 'foreR.r': 0.2, ...hands(HAND.palm, HAND.spread), ...EXPR.angry, 'eyes.y': 0.7 },
  // the hero landing: a knee down, a fist on the floor, the other arm thrown back, head down
  hero: { 'body.view': 1, 'hips.y': 226, 'torso.r': 1.2, 'torso.sy': 1, 'head.r': 0.1, 'head.view': 0, 'armR.r': 1.6, 'foreR.r': 0.15, 'handR.r': 0.3, ...hands(HAND.fist, HAND.spread), ...EXPR.neutral, 'brows.in': 0.8, 'lids.drop': 0.3, 'eyes.y': 0.8 },
  // ...and the look up, straight at us
  look: { 'head.r': -1.05, 'head.view': -1, 'eyes.y': -0.2, 'eyes.x': 0, 'brows.in': 0.7, 'lids.drop': 0.28, 'mood.smile': 0.3, 'mouth.shape': MOUTH.smirk, 'mouth.cornerR': 0.3 },
};

// The contacts for a finished pose. `which` names the set: feet on the table (x is where he stands),
// the crouch's feet, the impact's, or the hero landing's knee, foot and fist.
export function contacts(p, which, { quiet } = {}) {
  if (which === 'stand') {                                         // each foot under its hip, the near one a little forward side-on
    const side = Math.sin((bodyAngle(p) * Math.PI) / 4);
    for (const [leg, ahead] of [['legL', 16], ['legR', -16]]) p = plant(dex, p, leg, [dex.where(leg, p)[0] + ahead * side, ANKLE]);
    return p;
  }
  if (which === 'tuck') {                                          // hands on the shins, just below the knees
    p = reachChain(dex, p, 'armL', dex.where('shinL', p, [0, 40]), { quiet });
    return reachChain(dex, p, 'armR', dex.where('shinR', p, [0, 30]), { quiet });
  }
  if (which === 'impact') {
    p = plant(dex, p, 'legL', [-120, ANKLE], { quiet });
    p = plant(dex, p, 'legR', [120, ANKLE], { quiet });
    return reachChain(dex, p, 'armL', [158, -80], { quiet });
  }
  if (which === 'hero') {
    p = plant(dex, p, 'legL', [-214, -30], { tilt: 1.3, quiet });  // the knee on the floor, the shin behind
    p = plant(dex, p, 'legR', [150, ANKLE], { quiet });            // the front foot flat, knee up
    const a = reachChain(dex, p, 'armL', [185, -50], { quiet });   // the fist on the floor, under the shoulder
    return { ...a, 'handL.r': -dex.angle('foreL', a) + Math.PI * 0.02 };
  }
  return p;
}
