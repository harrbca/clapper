// Pip's turnaround: the body from facing us round to 3/4 each way, then arms that cross the face.
//   clap still 0 --entry scenes/lab-turn.js
import { gradient, text } from '/@kit/draw.js';
import { pip, pose, POSES, REST } from '/@kit/characters/pip.js';

const reachR = (x, y, bend = 1) => { const p = pip.reach(REST, 'armR', 'foreR', [x, y], bend); return { 'armR.r': p['armR.r'], 'foreR.r': p['foreR.r'] }; };
const reachL = (x, y, bend = -1) => { const p = pip.reach(REST, 'armL', 'foreL', [x, y], bend); return { 'armL.r': p['armL.r'], 'foreL.r': p['foreL.r'] }; };

const still = p => pose(0, [{ t: -1, dur: 0.001, pose: p }], { still: true, springy: false, twos: false });

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#E9F4F7', '#CFE6EE');
  [-1, -0.66, -0.33, 0, 0.33, 0.66, 1].forEach((turn, i) => {
    const x = 150 + i * 270;
    pip.draw(ctx, still({ 'body.turn': turn, 'eyes.blink': 0 }), { x, y: 470, scale: 0.44 });
    text(ctx, `turn ${turn}`, x, 500, { size: 22, weight: 500, color: '#3B4A58' });
  });
  const tests = [
    ['chin', { ...reachR(28, -640, -1), 'handR.form': 2 }],
    ['cross', { ...reachL(70, -480, 1), ...reachR(-66, -470, -1) }],
    ['face', { ...reachR(-10, -720, -1), 'handR.form': 0 }],
    ['cheer', POSES.cheer],
    ['3/4 wave', { 'body.turn': 0.7, ...POSES.wave }],
    ['3/4 point', { 'body.turn': -0.7, ...POSES.pointL }],
    ['3/4 shrug', { 'body.turn': 0.6, ...POSES.shrug }],
  ];
  tests.forEach(([n, p], i) => {
    const x = 150 + i * 270;
    pip.draw(ctx, still({ 'eyes.blink': 0, ...p }), { x, y: 1010, scale: 0.44 });
    text(ctx, n, x, 1040, { size: 22, weight: 500, color: '#3B4A58' });
  });
}
