// When things happen: lines are said one after another, and cues land on words, so re-voicing a
// line moves everything keyed to it. scenes/index.js reads the cues as `cue.<name>`.
export const FEED = 1.9;                           // seconds for the printer to print a label

export function layout(L) {
  L.scene('intro');
  L.say('hello', { at: 0.8 });
  L.say('print', { gap: 0.4 });
  L.at('print', L.w('print', 'print'));            // on "print" she points, and the printer starts
  L.at('feed', L.cue.print + 0.3);
  L.at('fed', L.cue.feed + FEED);
  L.say('read', { at: Math.max(L.t + 0.4, L.cue.fed - 0.6) });
  L.at('read', L.w('read', 'read'));              // on "read" the label comes up to the camera
  L.sfx('print', L.cue.feed - 0.12, 0.8);
  L.sfx('whoosh', L.cue.read, 0.4);
  L.pause(2.5);

  L.scene('end');
  L.pause(1);
}

// The moments `clap sheet` checks by default.
export const review = c => [0.5, c.print + 0.2, c.feed + 1, c.read + 1.5];
