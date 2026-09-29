// Checks that Dex's feet don't slide in the walk: for each drawing (on twos), where each foot is on
// screen, and how far a planted foot moves between drawings. It prints the worst, in pixels.
//   clap still 0 --entry scenes/lab-feet.js
import { onTwos } from '/@kit/core.js';
import { dex } from '/@kit/characters/dex.js';
import { walk } from '/@kit/walk3d.js';
import { cue as c } from '/@kit/timeline.js';
import * as PL from './plan.js';
import { dexAt, setup as setupTour, SHOTS } from './index.js';

let report = '';
export async function setup(stage) {
  await setupTour(stage);
  for (const [name, path, t0, t1] of [['walk', PL.WALK_PATH, c.walk, c.arrive], ['bin', PL.ASIDE_PATH, c.aside, c.aside + PL.ASIDE]]) {
    let worst = 0, n = 0;
    const prev = {};
    for (let t = onTwos(t0) + 1 / 30; t < t1; t += 1 / 15) {           // one sample per drawing
      const wk = walk(onTwos(t), { path, t0, t1, ...PL.WALK_OPTS }), d = dexAt(t, SHOTS[name]);
      for (const s of ['L', 'R']) {
        const [lx, ly] = dex.where(`foot${s}`, d.p), at = [d.x + lx * d.scale, d.y + ly * d.scale];
        const planted = wk.feet[s][1] < 1e-6 && wk.go > 0.99;
        if (planted && prev[s]?.planted) {
          const moved = Math.hypot(at[0] - prev[s].at[0], at[1] - prev[s].at[1]);
          if (moved > 1) console.warn(`${name} ${t.toFixed(3)} foot${s} moved ${moved.toFixed(2)} px: ${prev[s].at.map(v => v.toFixed(1))} -> ${at.map(v => v.toFixed(1))}`);
          worst = Math.max(worst, moved); n++;
        }
        prev[s] = { at, planted };
      }
    }
    report += `${name}: a planted foot moves at most ${worst.toFixed(2)} px between drawings (${n} pairs). `;
  }
  console.warn(report);
}
export function render({ ctx, W, H }) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#000'; ctx.font = '40px Roboto'; ctx.fillText(report, 40, 540, W - 80); }
