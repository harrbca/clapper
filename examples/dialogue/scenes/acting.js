// The performances: Pip's and Gus's moves, keyed to the words, and the cutting.
import { E, inv, wiggle } from '/@kit/core.js';
import { moves } from '/@kit/puppet.js';
import { cue as c, line, TL } from '/@kit/timeline.js';
import * as Pip from '/@kit/characters/pip.js';
import * as Gus from '/@kit/characters/gus.js';

// Where they stand: feet below the frame, a few steps apart.
export const PIP = { x: 670, y: 1180, scale: 1 };
export const GUS = { x: 1280, y: 1180, scale: 1 };

// Arms placed by where the hands go, in the character's own space (origin at the feet, up is -y).
// Angles are wrapped to within half a turn of rest, so an arm swings the short way round, not across
// the body.
const wrap = a => a - Math.round(a / (2 * Math.PI)) * 2 * Math.PI;
const reacher = C => (side, x, y, bend) => {
  const S = side < 0 ? 'L' : 'R', p = C[C === Pip ? 'pip' : 'gus'].reach(C.REST, `arm${S}`, `fore${S}`, [x, y], bend ?? (side < 0 ? -1 : 1));
  return { [`arm${S}.r`]: wrap(p[`arm${S}.r`]), [`fore${S}.r`]: wrap(p[`fore${S}.r`]) };
};
const pr = reacher(Pip), gr = reacher(Gus);
const LOOK = (x = 0, y = 0) => ({ 'eyes.x': x, 'eyes.y': y });
const sp = id => line(id);

// ---------- Pip ----------
const P_ARMS = { ...Pip.POSES.rest, 'handL.r': 0, 'handR.r': 0 };
const TO_GUS = { 'body.turn': 0.55, ...LOOK(0.55, 0), 'head.turn': 0 };
const PALMS = { ...pr(-1, -215, -480), ...pr(1, 215, -480), 'handL.form': 0, 'handR.form': 0, 'handL.r': 0.5, 'handR.r': -0.5 };
const US = { 'armR.r': -0.8, 'foreR.r': -0.7, 'handR.form': 0, 'armL.r': 0.3, 'foreL.r': -2.2, 'handL.form': 0, 'handL.r': -0.2 };
const SCRATCH = { ...pr(-1, -160, -780), 'handL.form': 4, 'handL.r': 0.2 };      // the near hand, at the back of her head

export const PIP_MOVES = moves([
  { t: -1, dur: 0.001, pose: { ...P_ARMS, ...Pip.EXPR.neutral, ...TO_GUS, 'mood.smile': 0.45 } },
  { t: c.day, dur: 0.4, pose: { 'brows.up': 0.3 } },
  // she lights up just before she speaks, with a breath in
  { t: sp('p1').start - 0.4, dur: 0.25, pose: { ...Pip.EXPR.delighted, ...TO_GUS, 'eyes.open': 1.2 }, ease: E.snap },
  // "Now" — hands open out; "draws" — arms up, with a hop; "us" — him and her
  { t: c.now - 0.12, dur: 0.25, pose: { ...P_ARMS, ...PALMS }, ease: E.snap, anticipate: 0.2 },
  { t: c.draws - 0.12, dur: 0.22, pose: { ...P_ARMS, ...Pip.POSES.cheer }, ease: E.snap, anticipate: 0.3 },
  { t: c.us - 0.14, dur: 0.3, pose: { ...P_ARMS, ...US, ...Pip.EXPR.happy, ...TO_GUS }, ease: E.snap },
  { t: sp('p1').end + 0.3, dur: 0.5, pose: { ...P_ARMS, ...Pip.EXPR.happy, ...TO_GUS } },
  // "Oh yeah?" — the smile falters; "who draws Clapper?" — uh-oh
  { t: c.yeah + 0.15, dur: 0.3, pose: { ...Pip.EXPR.neutral, 'mood.smile': 0.2, 'brows.up': 0.25 } },
  { t: c.clapper + 0.05, dur: 0.22, pose: { ...Pip.EXPR.worried, ...TO_GUS, 'eyes.pupil': 0.7 }, ease: E.snap },
  // "Um..." — eyes slide away, the near hand goes to the back of her head
  // (a breakdown on the way: the elbow bends first, so the hand arcs up by her shoulder, not out wide)
  { t: c.um - 0.3, dur: 0.18, pose: { 'armL.r': 1.3, 'foreL.r': 1.5, 'handL.form': 4, ...Pip.EXPR.worried, 'mood.smile': 0.1, ...LOOK(-0.25, 0.4), 'head.r': -0.07 }, ease: E.in },
  { t: c.um - 0.12, dur: 0.25, pose: { ...SCRATCH }, ease: E.out },
  // "a robot" — a cringing grin at him; "mostly" — a glance at us
  { t: c.robot - 0.1, dur: 0.2, pose: { ...Pip.EXPR.happy, 'mood.smile': 0.85, 'eyes.squint': 0.55, 'brows.in': -0.6, 'brows.up': 0.45, ...LOOK(0.55, 0) }, ease: E.snap },
  { t: c.mostly - 0.1, dur: 0.25, pose: { ...LOOK(-0.1, 0), 'head.turn': -0.45, 'head.r': 0.06 }, ease: E.snap },
  { t: sp('p2').end + 0.25, dur: 0.45, pose: { ...P_ARMS, ...Pip.EXPR.worried, 'mood.smile': 0.2, ...TO_GUS } },
  // "Hmph." — a blink, she shrinks a touch; then she turns to us and shrugs, grinning
  { t: c.hmph, dur: 0.12, pose: { 'eyes.blink': 1 } },
  { t: c.hmph + 0.15, dur: 0.12, pose: { 'eyes.blink': 0 } },
  { t: c.button - 0.1, dur: 0.35, pose: { ...P_ARMS, ...Pip.POSES.shrug, ...Pip.EXPR.happy, 'mood.smile': 0.85, 'body.turn': 0.15, ...LOOK(0, 0), 'head.turn': 0, 'head.r': 0.1 }, ease: E.snap, anticipate: 0.2 },
]);

const bump = (t, t0, d = 0.25) => { const k = (t - t0) / d; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };
export function pipExtra(t) {
  const n = [c.every, c.hand].reduce((a, w) => a + bump(t, w + 0.05, 0.35), 0);
  return {
    'head.y': n * 8, 'eyes.y': n * 0.2,
    'hips.y': -bump(t, c.draws - 0.02, 0.35) * 30 + bump(t, c.clapper + 0.05, 0.3) * 8 + bump(t, c.hmph, 0.3) * 6,
    'torso.sy': 1 - bump(t, c.clapper + 0.05, 0.2) * 0.03,
    'armR.r': -bump(t, c.mostly, 0.4) * 0.15,
    'handL.r': wiggle(t, c.um - 0.1, 1.2, 0.3, 4),           // scratching
  };
}

// ---------- Gus ----------
const G_ARMS = { ...Gus.POSES.rest, 'handL.r': 0, 'handR.r': 0, 'arms.front': 0 };
const TO_PIP = { 'body.turn': -0.55, ...LOOK(-0.55, 0), 'head.turn': 0 };
const FINGER_UP = { ...gr(1, 170, -690), 'handR.form': 1 };
const HAND_UP = { ...gr(1, -190, -540), 'handR.form': 0, 'handR.r': 0.2 };
const CROSSED = { ...gr(-1, 95, -452, 1), ...gr(1, -95, -446, -1), 'handL.form': 2, 'handR.form': 2, 'arms.front': 1 };
const AT_HER = { ...Gus.POSES.pointL, 'armL.r': 1.25, 'foreL.r': 0.55 };

export const GUS_MOVES = moves([
  { t: -1, dur: 0.001, pose: { ...G_ARMS, ...Gus.EXPR.neutral, ...TO_PIP } },
  // "Back in my day" — he looks up and away at the memory, a finger up
  { t: sp('g1').start - 0.35, dur: 0.4, pose: { ...LOOK(-0.1, -0.7), 'lids.drop': 0.35, 'mood.smile': 0.35, 'brows.up': 0.4, 'head.r': 0.05 } },
  { t: c.day - 0.15, dur: 0.3, pose: { ...FINGER_UP }, ease: E.snap, anticipate: 0.2 },
  // "by hand" — holds his hand up and admires it
  { t: c.hand - 0.25, dur: 0.3, pose: { ...G_ARMS, ...HAND_UP, ...LOOK(-0.25, -0.25), 'lids.drop': 0.2, 'mood.smile': 0.5, 'brows.up': 0.35 }, ease: E.snap },
  { t: sp('g1').end + 0.2, dur: 0.45, pose: { ...G_ARMS, ...Gus.EXPR.neutral, ...TO_PIP } },
  // listening to her: unimpressed on "draws", one brow up on "us"
  { t: c.draws, dur: 0.3, pose: { ...Gus.EXPR.grumpy, ...TO_PIP } },
  { t: c.us + 0.1, dur: 0.3, pose: { 'browL.up': 0.6, 'lidR.drop': 0.3 } },
  // "Oh yeah?" — the glasses slide down, he leans in and peers over them; "who draws Clapper?" — points
  { t: c.yeah - 0.25, dur: 0.35, pose: { ...Gus.EXPR.skeptical, 'glasses.y': 0.9, 'torso.r': -0.05, 'head.r': -0.08, ...LOOK(-0.55, -0.3) }, ease: E.snap, anticipate: 0.2 },
  { t: c.who - 0.15, dur: 0.25, pose: { ...AT_HER, 'brows.up': 0.5 }, ease: E.snap, anticipate: 0.3 },
  { t: c.clapper + 0.45, dur: 0.45, pose: { ...G_ARMS, 'torso.r': 0, 'head.r': 0 } },
  // "a robot" — a flat stare
  { t: c.robot + 0.1, dur: 0.3, pose: { ...Gus.EXPR.deadpan, 'glasses.y': 0.6, ...TO_PIP } },
  // "Hmph." — arms folded, eyes shut, turning away; "Kids these days." — muttering, head shaking
  { t: c.hmph - 0.25, dur: 0.35, pose: { ...CROSSED, ...Gus.EXPR.grumpy, 'eyes.blink': 1, 'body.turn': 0.25, 'head.turn': 0.3, 'head.r': 0.08, 'glasses.y': 0 }, ease: E.snap, anticipate: 0.25 },
  { t: c.kids - 0.1, dur: 0.3, pose: { 'eyes.blink': 0, 'lids.drop': 0.45, ...LOOK(0.3, 0.25) } },
  // and a side-eye back at her
  { t: c.button + 0.5, dur: 0.3, pose: { ...LOOK(-1, 0), 'lids.drop': 0.4, 'head.turn': 0.5 } },
]);

export function gusExtra(t) {
  const tap = w => bump(t, w, 0.16) * 0.2;
  return {
    'foreR.r': tap(c.every) + tap(c.frame),
    'hips.y': bump(t, c.hmph - 0.05, 0.3) * 10,
    'torso.sy': 1 - bump(t, c.hmph - 0.1, 0.14) * 0.04,
    'head.r': wiggle(t, c.kids, 1.1, 0.06, 2.5),
    ...(t > c.yeah - 0.3 && t < c.um ? { 'hips.x': -bump(t, c.yeah - 0.25, 1.6) * 14 } : {}),
  };
}

// ---------- the cutting ----------
// Hard cuts between a two-shot and a single on each of them, each shot creeping in as it runs.
const SHOTS = {
  wide: { x: 975, y: 545, zoom: 1.1 },
  pip: { x: 765, y: 470, zoom: 1.8 },
  gus: { x: 1185, y: 470, zoom: 1.8 },
};
const CUTS = [
  [0, 'wide'], [sp('p1').start - 0.12, 'pip'], [sp('g2').start - 0.15, 'gus'], [sp('p2').start - 0.12, 'pip'], [sp('g3').start - 0.3, 'wide'],
];
export function camera(t) {
  let i = CUTS.length - 1;
  while (i > 0 && t < CUTS[i][0]) i--;
  const [t0, name] = CUTS[i], t1 = CUTS[i + 1]?.[0] ?? TL.dur, s = SHOTS[name];
  const creep = E.io(inv(t0, t1, t)) * 0.035;
  return { x: s.x, y: s.y - creep * 200, zoom: s.zoom * (1 + creep), rot: 0 };
}
