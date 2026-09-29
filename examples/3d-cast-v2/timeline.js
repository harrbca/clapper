// Tilly and Pip in 3D: a pantomime, timed by hand, with sound effects on the beats.
const BEATS = {
  admire: 0.3, arrive: 2.1, beep: 2.2, stop: 4.3, rock: 4.35, settle: 5.6, look: 6.0, hello: 6.25, cheer: 8.0,
  turn: 9.4, thumbs: 9.75, wink: 10.9,
};
export function layout(L) {
  L.scene('show');
  for (const [k, t] of Object.entries(BEATS)) L.at(k, t);
  L.sfx('bleep', 2.2, 0.5); L.sfx('bleep', 2.45, 0.5);          // her horn
  L.sfx('whoosh', 2.35, 0.3);
  L.sfx('buzz', 4.28, 0.18);                                       // brakes
  L.sfx('tick', 4.45, 0.4); L.sfx('tick', 4.8, 0.35); L.sfx('tick', 5.15, 0.3);   // the crate rocking
  L.sfx('thud', 5.6, 0.45);
  L.sfx('boop', 6.1, 0.45); L.sfx('bleep', 6.45, 0.4);             // hello!
  L.sfx('pop', 8.02, 0.4); L.sfx('chime', 8.08, 0.35);
  L.sfx('pop', 9.8, 0.4); L.sfx('bleep', 9.95, 0.35);
  L.sfx('tick', 10.92, 0.3);
  L.pause(14.2 - L.t);                                             // to 14.2 s in all
  L.scene('end');
  L.pause(0.6);
}
export const review = c => [0.3, 1.4, c.beep + 0.25, 3.3, c.rock + 0.25, c.rock + 0.8, c.settle + 0.3, c.hello + 0.6, c.cheer + 0.3, c.thumbs + 0.4, 12, 13.8];
