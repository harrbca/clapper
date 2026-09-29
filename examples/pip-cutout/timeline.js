// Pip's acting test: four lines, with room between them for the reactions. Cues on the words the
// acting keys to.
export function layout(L) {
  L.scene('test');
  L.say('wait', { at: 1.0 });
  L.at('wait', L.w('wait', 'wait'));
  L.at('every', L.w('wait', 'every'));
  L.at('single', L.w('wait', 'single'));
  L.at('frame', L.w('wait', 'frame'));
  L.at('itself', L.w('wait', 'itself'));
  L.say('nothing', { gap: 0.55 });
  L.at('keyframes', L.w('nothing', 'keyframes'));
  L.at('timeline', L.w('nothing', 'timeline'));
  L.at('nothing', L.w('nothing', 'nothing'));
  L.say('okay', { gap: 0.95 });
  L.at('okay', L.w('okay', 'okay'));
  L.at('actually', L.w('okay', 'actually'));
  L.at('amazing', L.w('okay', 'amazing'));
  L.sfx('pop', L.cue.amazing, 0.35);
  L.say('help', { gap: 0.8 });
  L.at('not', L.w('help', 'not'));
  L.at('obviously', L.w('help', 'obviously'));
  L.sfx('whoosh', L.cue.obviously + 0.05, 0.35);
  L.at('wink', L.T.help + L.spoken('help') + 0.9);
  L.pause(1.6);
  L.scene('end');
  L.pause(0.8);
}

export const review = c => [0.5, c.wait + 0.25, c.every + 0.1, c.itself + 0.3, c.keyframes + 0.2, c.nothing + 0.35,
  c.okay + 0.3, c.actually + 0.3, c.amazing + 0.25, c.not + 0.5, c.obviously + 0.3, c.wink + 0.1];
