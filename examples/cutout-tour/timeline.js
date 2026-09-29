// Dex's tour of the warehouse, in cut-out: a label prints at the dock, he tears it off, walks it to its
// bin, sticks it on the order and scans it, and Tilly takes the pallet away. Beats are keyed to words.
import { walk } from '../../web/walk3d.js';
import { ASIDE, ASIDE_PATH, FEED, WALK, WALK_OPTS, WALK_PATH } from './scenes/plan.js';

export function layout(L) {
  const c = L.cue;
  L.scene('dock');
  L.say('print', { at: 0.5 });
  L.at('feed', L.w('print', 'label') + 0.1);
  L.at('fed', c.feed + FEED);
  L.say('tear', { at: c.fed + 0.3 });
  L.at('grab', L.w('tear', 'tear') - 0.4);
  L.at('tear', L.w('tear', 'tear') + 0.15);
  L.at('read', L.w('tear', 'tells') - 0.1);
  L.sfx('print', c.feed - 0.12, 0.8);
  L.sfx('tear', c.tear, 0.8);
  L.pause(0.9);
  L.scene('walk');
  L.at('walk', L.t);
  L.say('walk', { gap: 0.5 });
  L.at('arrive', c.walk + WALK);
  L.pause(Math.max(0, c.arrive - 0.3 - L.t));

  L.scene('bin');
  L.say('stick', { gap: 0.6 });
  L.at('stick', L.w('stick', 'stick'));
  L.at('scanOrder', L.w('stick', 'scan') + 0.1);
  L.say('tilly', { gap: 0.7 });
  L.at('tillyGo', L.w('tilly', 'tilly') - 0.9);
  L.at('tillyStop', c.tillyGo + 2.6);
  L.at('thanks', L.w('tilly', 'thanks'));
  L.at('aside', c.tillyStop + 0.2);
  L.at('turnIn', c.aside + ASIDE - 0.3);
  L.at('forksIn', c.turnIn + 2.4);
  L.at('lift', c.forksIn + 0.3);
  L.at('back', c.lift + 0.8);
  L.at('away', c.back + 1.6);
  for (const [path, t0, t1] of [[WALK_PATH, c.walk, c.arrive], [ASIDE_PATH, c.aside, c.aside + ASIDE]]) {
    const up = {};                                  // footsteps, where his feet land
    for (let t = t0; t <= t1 + 0.2; t += 1 / 60) {
      const w = walk(t, { path, t0, t1, ...WALK_OPTS });
      for (const f of ['L', 'R']) { const y = w.feet[f][1]; if (y > 8) up[f] = true; else if (up[f] && y < 1) { L.sfx('thud', t, 0.1); up[f] = false; } }
    }
  }
  L.sfx('scan', c.scanOrder, 0.5);
  L.sfx('whoosh', c.tillyGo + 0.3, 0.18);
  L.sfx('bleep', c.tillyStop + 0.1, 0.35);
  L.sfx('boop', c.lift, 0.25);
  L.pause(c.away + 2.8 - L.t);
  L.scene('end');
  L.pause(0.5);
}

export const review = c => [c.feed + 0.3, c.fed + 0.2, c.tear + 0.3, c.read + 0.4, c.walk + 1.2, c.walk + 2.6, c.walk + 4.0, c.arrive,
  c.stick + 0.1, c.scanOrder + 0.1, c.tillyStop, c.aside + 1.0, c.forksIn, c.lift + 0.5, c.back + 1.0, c.away + 1.2];
