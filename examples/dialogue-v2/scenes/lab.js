// The cast sheet: Gus and Pip turning round, Gus's expressions, and the pair of them face to face.
//   clap still 0 --entry scenes/lab.js
import { gradient, text } from '/@kit/draw.js';
import * as G from '/@kit/characters/gus.js';
import * as Pip from '/@kit/characters/pip.js';

// A pose as the pose functions build it (turn offsets, drawing order), frozen at one moment.
const still = (C, p) => C.pose(0, [{ t: -1, dur: 0.001, pose: p }], { still: true, springy: false, twos: false });
const label = (ctx, s, x, y) => text(ctx, s, x, y, { size: 20, weight: 500, color: '#3B4A58' });

export function render({ ctx, W, H }) {
  gradient(ctx, 0, 0, W, H, '#E9F4F7', '#CFE6EE');
  [-1, -0.5, 0, 0.5, 1].forEach((turn, i) => {
    const x = 110 + i * 205;
    G.gus.draw(ctx, still(G, { 'body.turn': turn, 'eyes.blink': 0 }), { x, y: 430, scale: 0.42 });
    label(ctx, `turn ${turn}`, x, 458);
  });
  // the pair, face to face, as in the dialogue
  Pip.pip.draw(ctx, still(Pip, { 'body.turn': 0.6, 'eyes.x': 0.6, 'eyes.blink': 0, ...Pip.EXPR.happy }), { x: 1260, y: 430, scale: 0.42 });
  G.gus.draw(ctx, still(G, { 'body.turn': -0.6, 'eyes.x': -0.6, 'eyes.blink': 0, ...G.EXPR.skeptical, 'glasses.y': 0.6 }), { x: 1560, y: 430, scale: 0.42 });
  label(ctx, 'face to face', 1410, 458);
  // his expressions, head and shoulders
  Object.entries(G.EXPR).forEach(([n, p], i) => {
    const x = 90 + (i % 8) * 240, y = 520 + Math.floor(i / 8) * 270;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 115, y, 230, 230); ctx.clip();
    G.gus.draw(ctx, { ...G.REST, ...p, 'mouth.open': n === 'laugh' ? 0.8 : n === 'shocked' ? 0.6 : n === 'surprised' ? 0.3 : 0 }, { x, y: y + 395, scale: 0.42 });
    ctx.restore();
    label(ctx, n, x, y + 250);
  });
}
