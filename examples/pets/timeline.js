// Biscuit and Miso: a narrator introduces them, and they act on the words.
export function layout(L) {
  L.scene('meet');
  L.say('biscuit', { at: 1.2 });
  L.at('biscuit', L.w('biscuit', 'biscuit'));
  L.say('miso', { gap: 0.6 });
  L.at('miso', L.w('miso', 'miso'));
  L.say('friends', { gap: 0.8 });
  L.at('would', L.w('friends', 'would'));
  L.at('like', L.w('friends', 'like'));
  L.at('friends', L.w('friends', 'friends'));
  L.say('sure', { gap: 0.7 });
  L.at('not', L.w('sure', 'not'));
  L.at('sure', L.w('sure', 'sure'));
  L.say('blink', { gap: 0.9 });
  L.at('then', L.w('blink', 'then'));
  L.at('blinks', L.w('blink', 'blinks'));
  L.at('slowly', L.w('blink', 'slowly'));
  L.say('yes', { gap: 0.8 });
  L.at('cat', L.w('yes', 'cat'));
  L.at('yes', L.w('yes', 'yes'));
  L.at('look', L.T.yes + L.spoken('yes') + 0.5);
  L.pause(2.4);
  L.scene('end');
  L.pause(0.4);
}

export const review = c => [0.6, c.biscuit + 0.3, c.biscuit + 0.9, c.miso + 0.5, c.would + 0.4, c.like + 0.5, c.friends + 0.4, c.not + 0.3,
  c.sure + 0.4, c.then + 0.5, c.blinks + 0.6, c.slowly + 0.8, c.cat + 0.5, c.yes + 0.4, c.look + 0.5, c.look + 1.4];

export const sfx = c => [['pop', c.biscuit + 0.12, 0.3], ['chime', c.yes + 0.05, 0.35]];
