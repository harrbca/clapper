// The kit's cut-out people, named one by one; each waves on their name.
const NAMES = { floor: ['rosa', 'marcus', 'priya', 'walt', 'jess'], office: ['dana', 'kenji', 'amara', 'greg', 'linda'] };

export function layout(L) {
  L.scene('cast');
  L.say('floor', { at: 0.6 });
  for (const n of NAMES.floor) L.at(n, L.w('floor', n));
  L.say('office', { gap: 0.6 });
  for (const n of NAMES.office) L.at(n, L.w('office', n));
  L.at('all', L.T.office + L.spoken('office') + 0.4);
  L.pause(2.4);
  L.scene('end');
  L.pause(0.4);
}

export const review = c => [0.4, c.rosa + 0.3, c.walt + 0.3, c.jess + 0.5, c.dana + 0.3, c.amara + 0.3, c.linda + 0.4, c.all + 1];
