// Close-ups of the props lab, to check the geometry: her feet, her hand round the scanner's handle
// (three ways), a pallet on its beams, a label on its beam, her shoes from the side and front.
//   clap still 0 1 2 3 4 5 6 7 --entry scenes/lab-close.js
import * as main from './index.js';

export const setup = main.setup;
const VIEWS = [
  { pos: [480, 200, 1150], at: [-120, 40, 420] },
  'hand',
  { pos: [1300, 700, -420], at: [300, 520, -450] },
  { pos: [-240, 720, 120], at: [-330, 560, -258] },
  'hand2', 'hand3',
  { pos: [-120 + 600, 30, 420 - 200], at: [-120, 30, 420] },
  { pos: [-120 + 380, 330, 420 + 520], at: [-120, 20, 420] },
];
export function render(args, t) {
  globalThis.CLOSE = VIEWS[Math.round(t)];
  main.render(args, 3);
}
