// When things happen: lines are said one after another, and cues land on words, so re-voicing a
// line moves everything keyed to it. scenes/index.js reads the cues as `cue.<name>`.

export function layout(L) {
  L.scene('intro');
  L.say('hello', { at: 0.8 });
  L.at('title', L.w('hello', 'clapper'));        // the title pops in on "Clapper"
  L.sfx('pop', L.cue.title);
  L.say('how', { gap: 0.5 });
  L.at('move', L.w('how', 'move'));              // the dot slides across on "move"
  L.sfx('whoosh', L.cue.move - 0.05, 0.8);
  L.pause(1.2);

  L.scene('end');
  L.pause(1.5);
}

// The moments `clap sheet` checks by default.
export const review = c => [c.title + 0.6, c.move + 0.4, c.move + 1.2];
