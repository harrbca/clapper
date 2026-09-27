// Pip and Gus: five lines, back and forth, with room for the reactions between them. Cues on the
// words the acting keys to.
export function layout(L) {
  L.scene('talk');
  L.say('g1', { at: 1.2 });
  L.at('day', L.w('g1', 'day'));
  L.at('every', L.w('g1', 'every'));
  L.at('frame', L.w('g1', 'frame'));
  L.at('hand', L.w('g1', 'hand'));
  L.say('p1', { gap: 0.45 });
  L.at('now', L.w('p1', 'now'));
  L.at('draws', L.w('p1', 'draws'));
  L.at('us', L.w('p1', 'us'));
  L.say('g2', { gap: 0.7 });
  L.at('yeah', L.w('g2', 'yeah'));
  L.at('who', L.w('g2', 'who'));
  L.at('clapper', L.w('g2', 'clapper'));
  L.say('p2', { gap: 0.6 });
  L.at('um', L.w('p2', 'um'));
  L.at('robot', L.w('p2', 'robot'));
  L.at('mostly', L.w('p2', 'mostly'));
  L.say('g3', { gap: 0.8 });
  L.at('hmph', L.w('g3', 'hmph'));
  L.at('kids', L.w('g3', 'kids'));
  L.at('button', L.T.g3 + L.spoken('g3') + 0.7);
  L.sfx('boop', L.cue.robot, 0.25);
  L.pause(2.2);
  L.scene('end');
  L.pause(0.6);
}

export const review = c => [0.6, c.day, c.hand + 0.2, c.now + 0.1, c.us + 0.1, c.yeah + 0.1, c.who + 0.1, c.clapper + 0.2,
  c.um + 0.1, c.robot + 0.1, c.mostly + 0.3, c.hmph + 0.1, c.kids + 0.2, c.button + 0.3, c.button + 1.2];
