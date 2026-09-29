// Clapper's intro: Pip explains how a Clapper video is made, with Bolt's help, in the studio; then what
// the kit does besides: a web page driven click by click, and in 3D a label printed, torn off, walked to
// its bin and picked with a scanner, onto Tilly; and back in the studio, the upload to YouTube.
import { E, hash, inOut, inv, on, TAU, track } from '/@kit/core.js';
import { shot, view } from '/@kit/camera.js';
import { IMG, loadImages } from '/@kit/assets.js';
import { caption } from '/@kit/captions.js';
import { starPath, text, withAlpha } from '/@kit/draw.js';
import { loadCapture, screen, target } from '/@kit/screen.js';
import { marker, tag } from '/@kit/text.js';
import { walk } from '/@kit/walk3d.js';
import { cue as c, line, scene, TL } from '/@kit/timeline.js';
import { boltPose } from '../characters/bolt.js';
import { bolt3d } from '../characters/bolt3d.js';
import { pip, pose } from '../characters/pip.js';
import { boltFace, boltPath, camera, PIP, PIP_MOVES, pipExtra } from './acting.js';
import { balls, bubble, codePanel, filmStrip, noDrag, scriptPage, skeleton, timelinePanel, uploadCard, wavePanel } from './props.js';
import { clapperboard3d, confetti3d } from './props3d.js';
import { layer3d } from '/@kit/scene3d.js';
import { grade } from '/@kit/finish.js';
import { clamp } from '/@kit/core.js';
import { backdrop, shadow } from './set.js';
import * as PL from './plan3d.js';
import * as tour from './tour3d.js';

export { motionBlur } from './acting.js';

// The studio's 3D layer: Bolt, the clapperboard and its confetti, lit to sit in the 2D set. The web
// captures (the order desk, and the scanner's app), and the 3D part (tour3d.js).
let L, bot, board, bits, desk, scan;
export async function setup(stage) {
  L = layer3d(stage);
  L.lights = L.studioLights();
  L.shadowFloor(880, 0.26);
  bot = bolt3d(L);
  board = await clapperboard3d(L);
  bits = confetti3d(L);
  [desk, scan] = await Promise.all([loadCapture('capture/print'), loadCapture('capture/scanner'), loadImages({ label: 'capture/label/00-label.png' })]);
  desk.accent = scan.accent = '#2F6FD0';
  await tour.setup(stage, scan);
}

const say = id => line(id);

export function render(stage, t) {
  const { ctx, W, H } = stage;
  // which world is on screen: the studio, the web page, the 3D warehouse (dissolving between them)
  const web = t >= c.webCard && t < c.cut3d + 0.4, d3 = t >= c.cut3d && t < c.toStudio + 0.4;
  const inStudio = t < c.toWeb || t >= c.toStudio;
  if (inStudio) studio(ctx, t, W, H);
  if (web) webPage(ctx, t);
  if (d3) {
    const k = Math.min(on(t, c.cut3d, 0.4), 1 - on(t, c.toStudio, 0.4));
    if (k > 0) {
      ctx.save(); ctx.globalAlpha = k;
      tour.render(stage, t, cam3d(t));
      ctx.restore();
      labelInsert(ctx, t);
      scannerInset(ctx, t);
    }
  }
  caption(ctx, t, { bottom: 1050, size: 34, lineH: 44 });
  endCard(ctx, t, W, H);
  const black = Math.max(1 - on(t, 0, 0.5), on(t, TL.dur - 0.7, 0.7));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- the studio ----------
function studio(ctx, t, W, H) {
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
    uploadCard(ctx, t, say('share').start - 0.2, c.command, c.youtube, scene('share').end);

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
  });

  // 3D: Bolt turns to face where he is flying, and sways a little when he hovers, so we see his depth
  const [bx, by] = boltPath(t), vx = (boltPath(t + 0.01)[0] - boltPath(t - 0.01)[0]) / 0.02;
  bot.root.visible = t >= c.bolt;
  bot.update(boltPose(t, boltPath, boltFace(t)), { x: bx, y: by, scale: 0.9, yaw: clamp(vx * 0.0006, -0.9, 0.9) + Math.sin(t * 0.7) * 0.28 });
  board.update(t, c.clap - 1.1, c.clap, 1330, 470, 1);
  bits.update(t, c.clap, 1330, 300);
  L.match(cam); L.lights.follow(cam);
  L.draw(ctx);

  grade(ctx);                                            // the finishing pass, before the captions
}

// ---------- the web page ----------
// The order desk's capture: a card beside Pip that grows to fill the frame, then the camera follows the
// clicks: into the search box, over to the order, down to the print button.
const WIN = { x: 0, y: 0, w: 1920 };
const inFrame = cam => ({ ...cam, x: clamp(cam.x, 960 / cam.zoom, 1920 - 960 / cam.zoom), y: clamp(cam.y, 540 / cam.zoom, 1080 - 540 / cam.zoom) });
function webPage(ctx, t) {
  const at = { ...c };
  const grow = E.io(inv(c.webCard + 0.5, c.toWeb, t));
  if (grow < 1) {                                       // the card, over the studio
    const a = E.out(on(t, c.webCard, 0.35));
    const w = 820 + (1920 - 820) * grow, x = (1060 + (1 - a) * 300) * (1 - grow), y = 200 * (1 - grow);
    ctx.save(); ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(120,70,40,0.25)'; ctx.shadowBlur = 30 * (1 - grow); ctx.shadowOffsetY = 12 * (1 - grow);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, w, w * (900 / 1600));
    ctx.shadowColor = 'transparent';
    screen(ctx, t, desk, { at, x, y, w });
    ctx.restore();
    return;
  }
  const [sx, sy] = target(desk, WIN, 'search');
  const cam = inFrame(shot(t, [
    [c.toWeb, { zoom: 1 }],
    [c.search - 0.2, { x: sx + 120, y: sy + 150, zoom: 1.7 }],
    [c.open + 0.2, { x: sx + 120, y: sy + 150, zoom: 1.7 }],
    [c.open + 1.0, { x: 1250, y: 420, zoom: 1.35 }],
    [c.print - 0.5, { x: 1258, y: 708, zoom: 1.45 }],
  ], E.io));
  view(ctx, cam, 1, () => screen(ctx, t, desk, { ...WIN, at }));      // (the 3D part dissolves in over it)
}

// ---------- the 3D camera ----------
const key = (t, keys) => ({ pos: track(t, keys.map(([a, p]) => [a, p.pos])), at: track(t, keys.map(([a, p]) => [a, p.at])) });
function cam3d(t) {
  // at the bin: from the aisle, over her right shoulder, framed so she is in the left third (the inset
  // goes on the right); keys at the same moment are cuts
  const side = { pos: [450, 1900, 2050], at: [3950, 1000, 650] };
  const sideUp = { pos: [450, 2000, 2050], at: [3950, 1250, 500] };
  const twoShot = { pos: [5000, 1950, 4200], at: [5200, 850, 150] };       // Pip and Tilly
  const wide = { pos: [6300, 2300, 4500], at: [4300, 800, 100] };
  const still = key(t, [
    [c.cut3d - 0.4, { pos: [3300, 1800, 1350], at: [-60, 1000, 200] }],
    [c.feed - 0.2, { pos: [3000, 1700, 1100], at: [-60, 1000, 200] }],
    [c.fed + 0.2, { pos: [2800, 1650, 1000], at: [-60, 1000, 250] }],
    [c.read - 0.2, { pos: [2600, 1750, 1150], at: [-100, 1150, 420] }],
    [c.walk, { pos: [2600, 1750, 1150], at: [-100, 1150, 420] }],
    [c.arrive - 0.4, side],
    [c.scanBin - 0.7, side], [c.scanBin - 0.2, sideUp], [c.scanBin + 0.5, side],
    [c.tillyStop - 1.3, side], [c.tillyStop - 1.3, twoShot],
    [c.tapDone + 0.6, twoShot], [c.tapDone + 0.6, wide],
    [c.toStudio + 0.4, { pos: [6450, 2320, 4650], at: [4500, 800, 200] }],
  ]);
  // on the walk the camera goes with her, alongside and a little ahead; at the bin it cuts to the pick
  const w = walk(clamp(t, c.walk, c.arrive), { path: PL.WALK_PATH, t0: c.walk, t1: c.arrive, ...PL.WALK_OPTS });
  const follow = { pos: [w.x + 900, 1650, w.z + 2700], at: [w.x + 450, 980, w.z - 150] };
  const k = E.io(inv(c.walk - 0.1, c.walk + 0.9, t)) * (t < c.arrive - 0.4 ? 1 : 0);
  const mix = (a2, b2) => a2.map((v, i) => v + (b2[i] - v) * k);
  return { pos: mix(still.pos, follow.pos), at: mix(still.at, follow.at) };
}

// ---------- 2D overlays in the 3D part ----------
// The label, large, as she reads it; its bin lit up as she says "read".
function labelInsert(ctx, t) {
  const k = on(t, c.read, 0.35) * (1 - on(t, c.walk + 0.5, 0.35));
  if (k <= 0) return;
  const h = 820, w = h * (4 / 6), x = 1920 - w - 90 + (1 - E.out(k)) * 120, y = 110;
  ctx.save(); ctx.globalAlpha = k;
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 14, y - 14, w + 28, h + 28);
  ctx.shadowColor = 'transparent';
  ctx.drawImage(IMG.label, x, y, w, h);
  const s = w / 800;                                       // the bin, A-01-03, on the 800 x 1200 label
  ctx.globalCompositeOperation = 'multiply';
  marker(ctx, x + 60 * s, y + 190 * s, 522 * s, 118 * s, E.out(inv(c.binLit - 0.4, c.binLit + 0.2, t)));
  ctx.restore();
}
// The scanner's screen, large, beside the action, with the taps on it.
function scannerInset(ctx, t) {
  const k = on(t, c.scanOrder - 1.1, 0.4) * (1 - on(t, c.tapDone + 1.8, 0.4));
  if (k <= 0) return;
  const w = 420, h = w * (518 / 360), x = 1920 - w - 70 + (1 - E.out(k)) * (w + 120), y = (1080 - h) / 2 - 20;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#23272D'; ctx.beginPath(); ctx.roundRect(x - 22, y - 30, w + 44, h + 60, 30); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.clip();
  screen(ctx, t, scan, { at: { home: -1, ...c }, x, y, w, bar: false, pointer: 'touch' });
  ctx.restore();
  ctx.restore();
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
