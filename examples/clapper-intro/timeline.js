// Clapper's intro, laid out on Pip's narration. Every beat is keyed to a word.
import { BALLS, landings } from './scenes/physics.js';

export function layout(L) {
  const c = L.cue;

  L.scene('hi');
  L.at('enter', 0.5);                                   // Pip hops in
  L.sfx('swoosh', c.enter - 0.1, 0.6);
  L.at('land', c.enter + 0.55);
  L.sfx('thud', c.land, 0.7);
  L.say('hi', { at: c.land + 0.35 });
  L.at('wave', L.w('hi', 'hi') - 0.15);
  L.at('name', L.w('hi', 'pip'));
  L.sfx('pop', c.name, 0.5);
  L.say('drawn', { gap: 0.5 });
  L.at('code', L.w('drawn', 'code'));
  L.sfx('swoosh', c.code - 0.15, 0.5);
  L.at('frames', L.w('drawn', 'frame'));
  L.pause(0.7);

  L.scene('script');
  L.at('paper', L.t + 0.2);                             // the script flies in
  L.sfx('swoosh', c.paper, 0.7);
  L.say('script', { at: c.paper + 0.5 });
  L.at('words', L.w('script', 'words'));
  L.pause(0.8);

  L.scene('voice');
  L.say('reads', { gap: 0.3 });
  L.at('wave_in', L.T.reads);
  L.sfx('swoosh', c.wave_in - 0.3, 0.5);
  L.at('moment', L.w('reads', 'moment'));
  L.at('every', L.w('reads', 'every'));
  L.say('pop', { gap: 0.45 });
  L.at('bubble', L.T.pop - 0.2);
  L.sfx('tick', c.bubble + 0.05, 0.6);
  L.at('popped', L.w('pop', 'pops'));
  L.sfx('pop', c.popped, 0.9);
  L.say('zoom', { gap: 0.5 });
  L.at('bolt', L.w('zoom', 'bolt'));
  L.at('zoomed', L.w('zoom', 'zoom', 'start', 2));
  L.sfx('whoosh', c.zoomed - 0.1, 1);
  L.at('bolt_back', c.zoomed + 1.1);
  L.sfx('whoosh', c.bolt_back, 0.7);
  L.sfx('bleep', c.bolt_back + 0.55, 0.6);
  L.pause(1.2);

  L.scene('change');
  L.say('change', { gap: 0.3 });
  L.sfx('swoosh', L.T.change - 0.2, 0.5);
  L.at('stretch', L.w('change', 'line'));
  L.at('slide', L.w('change', 'moves'));
  L.say('nodrag', { gap: 0.45 });
  L.at('nope', L.w('nodrag', 'no'));
  L.sfx('buzz', c.nope + 0.25, 0.35);
  L.pause(0.8);

  L.scene('look');
  L.say('look', { gap: 0.3 });
  L.at('camera', L.w('look', 'camera'));
  L.sfx('whoosh', c.camera, 0.6);
  L.at('bounce', L.w('look', 'bounce'));
  // a tap each time a ball lands, softer as they settle (the first landing is on "bounce")
  for (const b of BALLS) for (const [at, k] of landings(c.bounce - 0.765 + b.delay, b.h)) L.sfx('tap', at, 0.9 * k);
  L.sfx('bleep', c.bounce + 0.9, 0.5);
  L.at('hair', L.w('look', 'this'));
  L.pause(1.4);

  L.scene('outro');
  L.say('clapper', { gap: 0.2 });
  L.at('clap', L.w('clapper', 'clapper'));
  L.sfx('swoosh', c.clap - 1.1, 0.5);
  L.sfx('clap', c.clap, 1);
  L.sfx('bleep', c.clap + 1.3, 0.5);
  L.say('wordsin', { gap: 0.4 });
  L.pause(1.5);

  L.scene('end');
  L.pause(1.2);
}

export const review = c => [c.wave + 0.3, c.code + 0.3, c.words + 0.2, c.every, c.popped + 0.1, c.zoomed + 0.1,
  c.slide + 0.4, c.bounce + 0.3, c.hair + 0.4, c.clap + 0.3];
