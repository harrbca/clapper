// Clapper's intro: Pip explains how a Clapper video is made, with Bolt's help.
import { E, hash, inOut, on, TAU } from '/@kit/core.js';
import { view } from '/@kit/camera.js';
import { caption } from '/@kit/captions.js';
import { starPath, text, withAlpha } from '/@kit/draw.js';
import { tag } from '/@kit/text.js';
import { cue as c, line, scene, TL } from '/@kit/timeline.js';
import { bolt, boltPose } from '../characters/bolt.js';
import { pip, pose } from '../characters/pip.js';
import { boltFace, boltPath, camera, PIP, PIP_MOVES, pipExtra } from './acting.js';
import { balls, bubble, clapperboard, codePanel, filmStrip, noDrag, scriptPage, skeleton, timelinePanel, wavePanel } from './props.js';
import { backdrop, shadow } from './set.js';

export { motionBlur } from './acting.js';

const say = id => line(id);

export function render({ ctx, W, H }, t) {
  const cam = camera(t);
  backdrop(ctx, cam, t, W, H);

  const p = pose(t, PIP_MOVES, { extra: pipExtra });
  const lift = Math.max(0, -(p['hips.y'] ?? 0));
  view(ctx, cam, 1, () => {
    // behind Pip: the panels she points at
    codePanel(ctx, t, c.code - 0.1, say('drawn').end + 0.3);
    filmStrip(ctx, t, c.frames - 0.1, say('drawn').end + 0.4, (g, x, y, n) => {
      const q = pose(c.wave + 0.3 + n * 0.09, PIP_MOVES, { extra: pipExtra, still: true });
      pip.draw(g, q, { x, y, scale: 0.13 });
    });
    scriptPage(ctx, t, c.paper, c.words, scene('script').end - 0.25);
    wavePanel(ctx, t, say('reads').start - 0.3, c.bubble - 0.35, c.moment);
    timelinePanel(ctx, t, scene('change').start + 0.1, scene('change').end - 0.2, c.stretch, c.slide);
    balls(ctx, t, c.bounce - 0.765, scene('look').end - 0.2);

    // Pip, and her bones when she says "drawn by code"
    shadow(ctx, PIP.x, 150, lift * PIP.scale);
    const xray = inOut(t, c.code - 0.1, 0.25, c.frames + 0.35, 0.35);
    withAlpha(ctx, 1 - xray * 0.55, () => pip.draw(ctx, p, PIP));
    skeleton(ctx, pip, p, PIP, xray);
    nameTag(ctx, t, pip.where('head', p, [0, -300]));
    hairSparkles(ctx, t, pip.where('tail', p, [0, 170]));

    // in front: the bubble, the no-dragging sign, the clapperboard, and Bolt
    bubble(ctx, t, c.bubble, c.popped, 1000, 300);
    noDrag(ctx, t, c.nope, say('nodrag').end + 0.25);
    clapperboard(ctx, t, c.clap - 1.1, c.clap, 1330, 460);
    if (t >= c.bolt) {
      const [bx, by] = boltPath(t);
      shadow(ctx, bx, 90, 880 - by - 80);
      bolt.draw(ctx, boltPose(t, boltPath, boltFace(t)), { x: bx, y: by, scale: 0.9 });
    }
  });

  caption(ctx, t, { bottom: 1050, size: 34, lineH: 44 });
  endCard(ctx, t, W, H);
  const black = Math.max(1 - on(t, 0, 0.5), on(t, TL.dur - 0.7, 0.7));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}

// "I'm Pip": a name tag pops up above her head (given in Pip's space) and floats a moment.
function nameTag(ctx, t, [hx, hy]) {
  const k = E.back(on(t, c.name, 0.35)) * (1 - on(t, say('drawn').start + 0.8, 0.3));
  if (k <= 0.01) return;
  const x = PIP.x + hx * PIP.scale + 150, y = PIP.y + hy * PIP.scale + 10;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(0.06);
  tag(ctx, 'Pip', 0, 0, { size: 44, h: 76, fill: '#FF8A1F' });
  ctx.restore();
}

// Twinkles around the ponytail as it swings.
function hairSparkles(ctx, t, [tx, ty]) {
  const k = inOut(t, c.hair + 0.1, 0.2, c.hair + 1.3, 0.4);
  if (k <= 0) return;
  const x = PIP.x + tx * PIP.scale, y = PIP.y + ty * PIP.scale;
  for (let i = 0; i < 7; i++) {
    const a = hash(i) * TAU + t * 1.5, r = 60 + hash(i * 3) * 70, s = (0.5 + 0.5 * Math.sin(t * 9 + i * 2)) * 16 * k;
    if (s < 1) continue;
    starPath(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, s, s * 0.3, 4, 0);
    ctx.fillStyle = i % 2 ? '#FFC24A' : '#FFFFFF'; ctx.fill();
  }
}

function endCard(ctx, t, W, H) {
  const k = on(t, say('wordsin').end + 0.4, 0.5);
  if (k <= 0) return;
  withAlpha(ctx, k, () => text(ctx, 'github.com/harrbca/clapper', W / 2, 96, { size: 34, weight: 500, color: '#8A6A55' }));
}
