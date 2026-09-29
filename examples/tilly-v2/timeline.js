// Tilly v2: she drives in and brakes, says hello, lifts her forks all the way up and brings them down
// again, looks round the warehouse, and smiles. Laid out with clap voice --draft; her mouth follows the
// lines' words.
export function layout(L) {
  L.scene('show');
  L.at('go', 0.4);                                  // she sets off, from the left of the frame
  L.at('stop', 3.5);                                // and brakes on her mark
  L.say('hello', { at: 3.2 });
  L.say('real', { gap: 0.35 });
  L.at('lift', L.w('real', 'forks'));               // the forks go up as she says it
  L.at('top', Math.max(L.cue.lift + 2.2, L.w('real', 'up', 'end')));
  L.at('down', L.cue.top + 0.9);                    // and come down again (with the mast up, its rails cross her eyes)
  L.at('low', L.cue.down + 1.7);
  L.say('look', { at: L.cue.low - 0.3 });
  L.at('look', L.w('look', 'what'));
  L.say('like', { gap: 1.1 });
  L.at('smile', L.w('like', 'like'));
  L.at('wave', L.cue.smile + 0.9);                  // and a wave of a fork
  L.sfx('bleep', 1.0, 0.3); L.sfx('bleep', 1.2, 0.3);            // her horn as she comes
  L.sfx('buzz', L.cue.stop - 0.25, 0.12);                        // brakes
  L.sfx('swoosh', L.cue.lift + 0.1, 0.25);
  L.sfx('thud', L.cue.top - 0.05, 0.2);
  L.sfx('swoosh', L.cue.down + 0.2, 0.2);
  L.sfx('tick', L.cue.low - 0.05, 0.3);
  L.sfx('chime', L.cue.smile, 0.3);
  L.sfx('pop', L.cue.wave, 0.3);
  L.pause(1.6);
  L.scene('end');
  L.pause(0.5);
}
export const review = c => [1.8, c.stop + 0.3, c.lift + 1.0, c.top + 0.3, c.low + 0.1, c.look + 0.4, c.look + 1.5, c.smile + 0.5];
