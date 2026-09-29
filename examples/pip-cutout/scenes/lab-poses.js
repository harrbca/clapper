// Pip's poses from the front and 3/4 either way: her stock poses, arms crossed and a hand at her chin
// (arms in front of her face and hair), to check the cuffs on bent arms and what's drawn over what.
//   clap still 0 --entry scenes/lab-poses.js
import { HAND } from '/@kit/cutout.js';
import { text } from '/@kit/draw.js';
import { pip } from '/@kit/characters/pip-cutout.js';

const E = pip.expressions, P = pip.poses;
const still = p => pip.pose(0, [{ t: -1, dur: 0.001, pose: { 'eyes.blink': 0, ...E.happy, ...p } }], { still: true, twos: false });
const CROSSED = { 'armL.r': 0.25, 'foreL.r': -1.9, 'armR.r': -0.25, 'foreR.r': 1.95, 'handL.shape': HAND.fist, 'handR.shape': HAND.fist, 'handL.r': -0.2, 'handR.r': 0.2 };
const CHIN = { 'armR.r': -0.55, 'foreR.r': -2.45, 'handR.shape': HAND.fist, 'handR.r': 0.4 };
const SHOW = [['wave', P.wave], ['point', P.point], ['pointL', P.pointL], ['shrug', P.shrug], ['thumbsUp', P.thumbsUp], ['hips', P.hips], ['cheer', P.cheer],
  ['crossed', CROSSED], ['chin', CHIN]];

export function render({ ctx, W, H }) {
  ctx.fillStyle = '#EDE9E0'; ctx.fillRect(0, 0, W, H);
  [0, 1, -1].forEach((view, r) => SHOW.forEach(([n, p], i) => {
    const x = 110 + i * 212, y = 340 + r * 350;
    pip.draw(ctx, still({ ...p, 'body.view': view }), { x, y, scale: 0.33 });
    text(ctx, `${n} ${view}`, x, y + 22, { size: 16, weight: 500, color: '#4A4640' });
  }));
}
