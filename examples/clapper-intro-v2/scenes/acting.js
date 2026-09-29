// Who does what, when: Pip's moves, Bolt's flight and the camera, all keyed to the cues.
import { clamp, E, inOut, lerp, on, TAU, wiggle } from '/@kit/core.js';
import { shot } from '/@kit/camera.js';
import { moves } from '/@kit/puppet.js';
import { cue as c, line, scene } from '/@kit/timeline.js';
import { pip, POSES, REST } from '../characters/pip.js';

export const PIP = { x: 760, y: 880, scale: 0.8 };

// Arms placed by where the hand should be, in Pip's own space (origin at her feet, up is -y).
const reachL = (x, y, bend = -1) => { const p = pip.reach(REST, 'armL', 'foreL', [x, y], bend); return { 'armL.r': p['armL.r'], 'foreL.r': p['foreL.r'] }; };
const reachR = (x, y, bend = 1) => { const p = pip.reach(REST, 'armR', 'foreR', [x, y], bend); return { 'armR.r': p['armR.r'], 'foreR.r': p['foreR.r'] }; };
const ARMS = { 'armL.r': REST['armL.r'], 'foreL.r': REST['foreL.r'], 'armR.r': REST['armR.r'], 'foreR.r': REST['foreR.r'], 'handL.form': 0, 'handR.form': 0, 'handL.r': 0, 'handR.r': 0 };
const FACE = { 'eyes.x': 0, 'eyes.y': 0, 'head.r': 0, 'brows.up': 0, 'brows.in': 0, 'eyes.squint': 0, 'mood.smile': 0.4 };
const OPEN = { 'armL.r': 0.8, 'foreL.r': 0.75, 'armR.r': -0.8, 'foreR.r': -0.75, 'handL.form': 0, 'handR.form': 0 };

export const LISTEN = { ...reachL(-150, -770), 'handL.form': 0, 'handL.r': -0.4 };
export const CHEST = { ...reachR(20, -500), 'handR.form': 0, 'handR.r': 0.9 };
export const FINGER_UP = { ...reachR(170, -900), 'handR.form': 1 };
export const WAG = { ...reachL(-180, -880), 'handL.form': 1 };
export const HIPS = { ...reachL(-96, -390, 1), ...reachR(96, -390, -1), 'handL.form': 2, 'handR.form': 2 };
export const PALM_UP = { ...reachR(290, -590), 'handR.form': 0, 'handR.r': -1.1 };

const say = id => line(id);

export const PIP_MOVES = moves([
  // hopping in, arms up, and landing
  { t: 0, dur: 0.01, pose: { 'armL.r': 2.4, 'foreL.r': 0.3, 'armR.r': -2.4, 'foreR.r': -0.3, 'mood.smile': 1 } },
  { t: c.land, dur: 0.45, pose: { ...ARMS, 'mood.smile': 0.6 }, ease: E.out },
  // "Hi! I'm Pip."
  { t: c.wave, dur: 0.32, pose: { ...POSES.wave, 'brows.up': 0.6 }, ease: E.back },
  { t: c.name - 0.1, dur: 0.35, pose: { ...ARMS, ...CHEST, 'head.r': -0.06, 'brows.up': 0.3, 'mood.smile': 0.8 } },
  // "Everything you're watching right now was drawn by code, one frame at a time."
  { t: say('drawn').start - 0.1, dur: 0.5, pose: { ...ARMS, ...OPEN, 'head.r': 0, 'brows.up': 0.2 } },
  { t: c.code - 0.3, dur: 0.4, pose: { ...ARMS, ...POSES.point, 'armR.r': -1.85, 'head.r': 0.06, 'eyes.x': 0.9, 'eyes.y': -0.3 }, ease: E.back },
  { t: c.frames - 0.15, dur: 0.35, pose: { 'armR.r': -1.2, 'eyes.y': 0.5 } },
  { t: say('drawn').end + 0.25, dur: 0.6, pose: { ...ARMS, ...FACE } },
  // "It starts with a script: just the words I'm going to say."
  { t: c.paper + 0.15, dur: 0.3, pose: { 'eyes.x': 1, 'head.r': 0.08 } },
  { t: say('script').start, dur: 0.45, pose: { ...PALM_UP, 'handR.r': -0.5, 'eyes.x': 0.6 } },
  { t: c.words - 0.25, dur: 0.35, pose: { ...ARMS, ...POSES.point, 'armR.r': -1.5, 'eyes.x': 0.9 }, ease: E.back },
  { t: say('script').end + 0.15, dur: 0.5, pose: { ...ARMS, ...FACE } },
  // "A voice reads it out, and we get the exact moment of every single word."
  { t: say('reads').start - 0.1, dur: 0.5, pose: { ...LISTEN, 'head.r': 0.1, 'eyes.x': 0.7, 'eyes.y': -0.2 } },
  { t: c.moment - 0.2, dur: 0.35, pose: { ...ARMS, ...FINGER_UP, 'head.r': 0, 'eyes.x': 0.3, 'brows.up': 0.7 }, ease: E.back },
  { t: say('reads').end + 0.1, dur: 0.5, pose: { ...ARMS, ...FACE } },
  // "So when I say pop, something pops."
  { t: c.bubble - 0.1, dur: 0.5, pose: { ...PALM_UP, 'eyes.x': 0.8, 'eyes.y': -0.8, 'head.r': 0.05 } },
  { t: c.popped, dur: 0.12, pose: { ...ARMS, 'armR.r': -0.5, 'foreR.r': -1.4, 'head.r': -0.1, 'eyes.squint': 1, 'mood.smile': 1, 'brows.up': 0.9 }, ease: E.out },
  { t: c.popped + 0.7, dur: 0.6, pose: { ...ARMS, ...FACE, 'mood.smile': 0.8 } },
  // "And when I say zoom, Bolt can zoom."
  { t: say('zoom').start, dur: 0.4, pose: { 'eyes.x': 1, 'head.r': 0.06 } },
  { t: c.zoomed, dur: 0.35, pose: { 'eyes.x': -1, 'head.r': -0.12, 'brows.up': 1, 'mood.smile': 1 }, ease: E.out },
  { t: c.bolt_back + 0.3, dur: 0.5, pose: { ...ARMS, ...reachL(-280, -600), 'handL.form': 0, 'eyes.x': -0.8, 'head.r': -0.05, 'brows.up': 0.3 } },
  { t: c.bolt_back + 1.4, dur: 0.6, pose: { ...ARMS, ...FACE } },
  // "Change a line, and everything keyed to it moves right along with it."
  { t: say('change').start - 0.1, dur: 0.45, pose: { ...POSES.point, 'armR.r': -1.55, 'eyes.x': 0.9 }, ease: E.back },
  { t: c.stretch, dur: 0.3, pose: { 'brows.up': 0.6 } },
  { t: c.slide, dur: 0.9, pose: { 'armR.r': -1.2, 'eyes.x': 1 } },
  // "No dragging keyframes around by hand."
  { t: c.nope - 0.2, dur: 0.35, pose: { ...ARMS, ...WAG, 'eyes.x': 0, 'brows.in': 0.5, 'mood.smile': 0.1 } },
  { t: say('nodrag').end + 0.2, dur: 0.5, pose: { ...ARMS, ...FACE } },
  // "...the camera can move, things can bounce, and my hair can do this."
  { t: say('look').start, dur: 0.5, pose: { ...OPEN } },
  { t: c.camera - 0.1, dur: 0.5, pose: { 'armL.r': 1.2, 'armR.r': -1.2, 'brows.up': 0.7, 'mood.smile': 0.9 } },
  { t: c.bounce - 0.4, dur: 0.4, pose: { ...ARMS, 'eyes.x': 1, 'eyes.y': 0.5, 'head.r': 0.06 } },
  { t: c.hair - 0.45, dur: 0.4, pose: { ...ARMS, ...HIPS, ...FACE, 'mood.smile': 0.9 } },
  { t: c.hair + 1.2, dur: 0.4, pose: { 'eyes.squint': 0.8, 'mood.smile': 1 } },
  // "Clapper can drive a web page, too." (then the page fills the frame)
  { t: say('web').start - 0.1, dur: 0.45, pose: { ...ARMS, ...OPEN, ...FACE } },
  { t: c.webCard - 0.1, dur: 0.4, pose: { ...ARMS, ...POSES.point, 'armR.r': -1.55, 'eyes.x': 0.9 }, ease: E.back },
  // "And when the video's done, one command puts it on YouTube."
  { t: say('share').start - 0.3, dur: 0.5, pose: { ...ARMS, ...FACE, 'eyes.x': 0.6 } },
  { t: c.command - 0.2, dur: 0.4, pose: { ...PALM_UP, 'eyes.x': 0.9 }, ease: E.back },
  { t: c.youtube - 0.1, dur: 0.35, pose: { ...ARMS, ...POSES.point, 'armR.r': -1.45, 'eyes.x': 0.8, 'brows.up': 0.6, 'mood.smile': 1 }, ease: E.back },
  { t: say('share').end + 0.3, dur: 0.5, pose: { ...ARMS, ...FACE } },
  // "That's Clapper. Words in, video out."
  { t: c.clap - 0.25, dur: 0.3, pose: { ...ARMS, ...POSES.cheer, ...FACE, 'mood.smile': 1, 'eyes.squint': 0.6 }, ease: E.back },
  { t: say('wordsin').start, dur: 0.5, pose: { ...ARMS, ...OPEN, 'eyes.squint': 0.3 } },
  { t: say('wordsin').end + 0.2, dur: 0.35, pose: { ...ARMS, ...POSES.wave }, ease: E.back },
]);

// Motion laid over the choreography: the hop in and its landing squash, waves, wags, head shakes.
export function pipExtra(t) {
  const u = on(t, c.enter, c.land - c.enter), flying = t < c.land;
  const hop = t < c.enter ? 900 : flying ? (1 - u) * 900 - 1100 * u * (1 - u) : 0;
  const k = t - c.land, squash = k > 0 && k < 0.8 ? Math.exp(-k * 7) * Math.cos(k * 20) : 0;
  const cheerHop = -Math.max(0, Math.sin(clamp((t - c.clap + 0.15) / 0.45) * Math.PI)) * 60;
  return {
    'hips.y': hop + squash * 22 + cheerHop,
    'torso.sy': 1 - squash * 0.1,
    'foreR.r': wiggle(t, c.wave + 0.25, 1.4, 0.4, 2.6) + wiggle(t, say('wordsin').end + 0.45, 1.6, 0.4, 2.6),
    'handR.r': wiggle(t, c.wave + 0.25, 1.4, 0.3, 2.6),
    'foreL.r': wiggle(t, c.nope, 1.1, 0.3, 3.2),
    'head.r': wiggle(t, c.nope - 0.05, 1.0, 0.1, 2.4) + wiggle(t, c.hair - 0.05, 1.3, 0.34, 2.1),
    'torso.r': wiggle(t, c.hair - 0.05, 1.3, 0.05, 2.1),
  };
}

// ---------- Bolt ----------
// Bolt flies in world space: peeking in, zooming across, and back from the left to Pip's side.
export const BOLT_HOME = [370, 520];
export function boltPath(u) {
  if (u < c.bolt) return [2300, 360];
  if (u < c.zoomed - 0.05) { const k = E.out(on(u, c.bolt, 0.5)); return [lerp(2300, 1770, k), 360]; }
  if (u < c.zoomed + 0.45) { const k = E.io(on(u, c.zoomed - 0.05, 0.5)); return [lerp(1770, -450, k), 360 - Math.sin(k * Math.PI) * 110]; }
  if (u < c.bolt_back) return [-450, 440];
  const k = on(u, c.bolt_back, 0.9);
  let [x, y] = [lerp(-450, BOLT_HOME[0], E.back(k)), lerp(440, BOLT_HOME[1], E.out(k))];
  // a loop-the-loop when the clapperboard snaps
  const l = on(u, c.clap - 0.1, 1.3);
  if (l > 0 && l < 1) { const a = E.io(l) * TAU; x += Math.sin(a) * 90; y += (1 - Math.cos(a)) * -90; }
  return [x, y];
}

export const BLEEPS = [c.bolt_back + 0.55, c.bounce + 0.9, c.clap + 1.3];
export function boltFace(t) {
  const mood = inOut(t, c.bolt_back + 0.45, 0.01, c.bolt_back + 2, 0.01) > 0.5 || t > c.clap ? 1
    : inOut(t, c.camera, 0.01, c.camera + 1.6, 0.01) > 0.5 || inOut(t, c.stretch, 0.01, c.slide + 1, 0.01) > 0.5 ? 2 : 0;
  const beep = Math.max(...BLEEPS.map(b => Math.max(0, Math.sin(clamp((t - b) / 0.3) * Math.PI))));
  return { 'eyes.mood': mood, 'mouth.open': beep };
}

// ---------- the camera ----------
export function camera(t) {
  const s = id => scene(id).start;
  return shot(t, [
    [0, { x: 900, y: 520, zoom: 1.15 }], [2.8, {}],
    [c.code - 0.3, {}], [c.code + 0.7, { x: 1050, y: 520, zoom: 1.03 }],
    [s('script') - 0.2, { x: 1050, y: 520, zoom: 1.03 }], [c.paper + 0.4, { x: 1030, y: 530, zoom: 1 }],
    [say('reads').start, { x: 1030, y: 530 }], [say('reads').start + 0.8, { x: 1060, y: 520 }],
    [c.bubble - 0.3, { x: 1060, y: 520 }], [c.bubble + 0.6, { x: 960, y: 440, zoom: 1.12 }],
    [c.popped + 0.4, { x: 960, y: 440, zoom: 1.12 }], [say('zoom').start + 0.5, {}],
    [s('change'), {}], [s('change') + 0.8, { x: 1050, y: 520 }],
    [say('look').start, { x: 1050, y: 520 }], [say('look').start + 0.6, {}],
    [c.camera - 0.05, {}], [c.camera + 0.8, { x: 760, y: 380, zoom: 1.5, rot: -0.07 }], [c.camera + 2.0, { x: 980, y: 520 }],
    [c.bounce - 0.5, { x: 980, y: 520 }], [c.bounce + 0.2, { x: 1180, y: 540 }],
    [c.hair - 0.45, { x: 1180, y: 540 }], [c.hair + 0.05, { x: 780, y: 330, zoom: 1.45 }],
    [c.hair + 1.7, { x: 780, y: 330, zoom: 1.45 }], [s('web') + 0.6, { x: 1000, y: 520 }],
    [s('share'), { x: 1000, y: 520 }], [s('outro') + 0.4, { x: 1000, y: 520 }],
  ]);
}

// When things move fast enough to smear: 8 samples of motion blur; otherwise none.
const FAST = [[c.enter - 0.05, c.land + 0.3], [c.paper - 0.1, c.paper + 0.9], [c.zoomed - 0.15, c.zoomed + 0.6],
  [c.bolt_back - 0.05, c.bolt_back + 1], [c.camera - 0.1, c.camera + 2.1], [c.hair - 0.5, c.hair + 1.4], [c.clap - 1.2, c.clap + 1.4]];
export const motionBlur = t => (FAST.some(([a, b]) => t >= a && t <= b) ? 8 : 1);
