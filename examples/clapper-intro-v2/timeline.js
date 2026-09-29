// Clapper's intro, laid out on Pip's narration. Every beat is keyed to a word.
import { walk } from '../../web/walk3d.js';
import { BALLS, landings } from './scenes/physics.js';
import { ASIDE, ASIDE_PATH, FEED, WALK, WALK_OPTS, WALK_PATH } from './scenes/plan3d.js';

const TYPE_RATE = 0.085;                            // screen.js types a character this often

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

  // a web page, driven: its capture (capture/print.js) grows out of the studio to fill the frame
  L.scene('web');
  L.say('web', { gap: 0.2 });
  L.at('webCard', L.w('web', 'drive') - 0.2);
  L.at('toWeb', L.w('web', 'page', 'end') + 0.5);
  L.at('start', c.webCard);
  L.say('clicks', { gap: 0.35 });
  L.at('search', L.w('clicks', 'click'));
  L.at('typed', L.w('clicks', 'keystroke', 'end') + 0.05);
  L.at('open', L.w('clicks', 'cue'));
  L.sfx('swoosh', c.webCard, 0.4);
  for (const k of ['search', 'open']) L.sfx('click', c[k], 0.55);
  for (let i = 0; i < 4; i++) L.sfx('key', c.typed + i * TYPE_RATE, 0.35);

  // in 3D: the label prints, Pip tears it off and reads it, and walks it to its bin
  L.scene('dock');
  L.say('print3d', { gap: 0.45 });
  L.at('print', L.w('print3d', 'print') + 0.05);
  L.at('cut3d', L.w('print3d', 'comes'));
  L.at('feed', c.cut3d + 0.3);
  L.at('fed', c.feed + FEED);
  L.say('tear', { at: c.fed + 0.7 });
  L.at('grab', L.w('tear', 'tear') - 0.4);
  L.at('tear', L.w('tear', 'tear') + 0.15);
  L.at('read', L.w('tear', 'label') - 0.1);
  L.at('binLit', L.w('tear', 'read'));               // the label's bin lights up
  L.sfx('click', c.print, 0.55);
  L.sfx('whoosh', c.cut3d - 0.15, 0.25);
  L.sfx('print', c.feed - 0.12, 0.8);
  L.sfx('tear', c.tear, 0.8);
  L.pause(0.5);
  L.scene('walk');
  L.at('walk', L.t);
  L.say('walk', { gap: 0.3 });
  L.at('arrive', c.walk + WALK);

  // the pick, on the scanner: stick the label on, scan it, tap the pick, the bin, Tilly, Done
  L.scene('pick');
  L.say('scan', { gap: 1.0 });
  L.at('stick', L.w('scan', 'stick'));
  L.at('scanOrder', L.w('scan', 'scan') + 0.1);
  L.at('tapPick', L.w('scan', 'tap') + 0.1);
  L.say('tilly', { gap: 0.45 });
  L.at('scanBin', L.w('tilly', 'bin'));
  L.at('tillyStop', L.w('tilly', 'up', 'end'));
  L.at('tillyGo', c.tillyStop - 3.0);
  L.at('scanTo', L.w('tilly', 'her') + 0.1);
  L.say('done', { gap: 0.6 });
  L.at('tapDone', L.w('done', 'done'));
  L.at('aside', c.tapDone + 0.5);
  L.at('turnIn', c.aside + ASIDE - 0.3);
  L.at('forksIn', c.turnIn + 2.4);
  L.at('lift', c.forksIn + 0.3);
  L.at('back', c.lift + 0.8);
  L.at('away', c.back + 1.6);
  for (const [path, t0, t1] of [[WALK_PATH, c.walk, c.arrive], [ASIDE_PATH, c.aside, c.aside + ASIDE]]) {
    const up = {};                                  // footsteps, where her feet land
    for (let t = t0; t <= t1 + 0.2; t += 1 / 60) {
      const w = walk(t, { path, t0, t1, ...WALK_OPTS });
      for (const f of ['L', 'R']) { const y = w.feet[f][1]; if (y > 8) up[f] = true; else if (up[f] && y < 1) { L.sfx('thud', t, 0.1); up[f] = false; } }
    }
  }
  for (const k of ['scanOrder', 'scanBin', 'scanTo']) L.sfx('scan', c[k], 0.5);
  for (const k of ['tapPick', 'tapDone']) L.sfx('tap', c[k], 0.45);
  L.sfx('whoosh', c.tillyGo + 0.3, 0.18);
  L.sfx('bleep', c.tillyStop + 0.1, 0.35);
  L.sfx('chime', c.tapDone + 0.15, 0.3);
  L.sfx('boop', c.lift, 0.25);
  L.pause(c.back + 1.6 - L.t);                      // she backs out with it, then the studio

  // back in the studio: one command puts it on YouTube
  L.scene('share');
  L.at('toStudio', L.t);
  L.say('share', { gap: 0.5 });
  L.at('command', L.w('share', 'command'));
  L.at('youtube', L.w('share', 'youtube'));
  L.sfx('swoosh', c.toStudio + 0.1, 0.4);
  for (let i = 0; i < 11; i++) L.sfx('key', c.command + i * 0.045, 0.2);
  L.sfx('chime', c.youtube, 0.4);
  L.pause(1.0);

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
  c.slide + 0.4, c.bounce + 0.3, c.hair + 0.4, c.webCard + 0.5, c.typed + 0.3, c.print, c.fed - 0.4, c.binLit + 0.3,
  c.walk + 2, c.scanOrder, c.tapPick, c.scanBin, c.scanTo, c.tapDone + 0.2, c.back + 0.5, c.command + 0.4, c.youtube + 0.6, c.clap + 0.3];
