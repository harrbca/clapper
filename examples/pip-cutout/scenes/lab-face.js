// Pip's faces: the kit's expressions from the front, 3/4 and side on, then her eyes looking about,
// blinking and squinting (the iris under the lids), and her mouth chart.
//   clap still 0 --entry scenes/lab-face.js
import { MOUTH_NAMES } from '/@kit/cutout.js';
import { text } from '/@kit/draw.js';
import { pip } from '/@kit/characters/pip-cutout.js';

const E = pip.expressions, HEAD = -673, S = 0.9;
const still = p => pip.pose(0, [{ t: -1, dur: 0.001, pose: { 'eyes.blink': 0, ...p } }], { still: true, twos: false });
const NAMES = ['neutral', 'happy', 'laugh', 'surprised', 'shocked', 'skeptical', 'smug', 'angry', 'sad', 'worried', 'delighted', 'grumpy'];
const LOOKS = [['look left', { 'eyes.x': -1 }], ['look right', { 'eyes.x': 1 }], ['look up', { 'eyes.y': -1 }], ['look down', { 'eyes.y': 1 }],
  ['half lids', { 'lids.drop': 0.5 }], ['squint', { 'eyes.squint': 0.6 }], ['blink', { 'eyes.blink': 1 }], ['tiny pupils', { 'eyes.pupil': 0.5 }],
  ['wide', { 'eyes.open': 1.35 }], ['wink', { 'lidR.drop': 1 }], ['angry lids', { 'lids.slant': 0.8, 'lids.drop': 0.15 }], ['sad lids', { 'lids.slant': -0.7, 'lids.drop': 0.3 }]];

function cell(ctx, x, y, w, h, pose, label, i) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = i % 2 ? '#E4DFD4' : '#E9E4DA'; ctx.fillRect(x, y, w, h);
  pip.draw(ctx, still(pose), { x: x + w / 2, y: y + 118 - HEAD * S * 0.5, scale: S * 0.5 });
  ctx.restore();
  text(ctx, label, x + w / 2, y + 14, { size: 13, weight: 500, color: '#4A4640' });
}

export function render({ ctx, W, H }) {
  ctx.fillStyle = '#EDE9E0'; ctx.fillRect(0, 0, W, H);
  const w = 158, h = 170;
  [0, 1, 2].forEach((view, r) => NAMES.forEach((n, i) => cell(ctx, 12 + i * w, 10 + r * h, w - 4, h - 4, { ...E[n], 'body.view': view }, `${n} ${view}`, i + r)));
  LOOKS.forEach(([n, p], i) => cell(ctx, 12 + i * w, 10 + 3 * h, w - 4, h - 4, { ...E.neutral, ...p }, n, i));
  MOUTH_NAMES.slice(0, 12).forEach((m, i) => cell(ctx, 12 + i * w, 10 + 4 * h, w - 4, h - 4, { ...E.neutral, 'mouth.shape': i }, m, i + 1));
  MOUTH_NAMES.slice(12).forEach((m, i) => cell(ctx, 12 + i * w, 10 + 5 * h, w - 4, h - 4, { ...E.neutral, 'mouth.shape': i + 12, 'body.view': 1 }, `${m} 3/4`, i));
}
