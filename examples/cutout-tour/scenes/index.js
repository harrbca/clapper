// Dex's warehouse tour in cut-out, laid out in the 3D intro's set (world.js) with the kit's layout pass
// (layout.js). Each shot has a fixed camera: the set is baked from it once, into a picture behind Dex
// and one in front of him (stock on the aisle floor). Dex is drawn in 2D where project() puts him, at
// the size the set is there, his lines as heavy as the set's. The order and Tilly move, so they're
// drawn live in 3D with the baked set holding them out (hidden where racking is in front of them).
// Everything is sorted by depth, so he passes behind the stock and Tilly passes in front of him.
import { clamp, E, inv, lerp, on, onTwos } from '/@kit/core.js';
import { caption } from '/@kit/captions.js';
import { layer3d, THREE } from '/@kit/scene3d.js';
import { tillyPose } from '/@kit/characters/tilly3d.js';
import { requires } from '/@kit/character.js';
import { dex, EXPR, pose as dexPose } from '/@kit/characters/dex.js';
import { HAND, mixKeys, reachChain, withLine } from '/@kit/cutout.js';
import { bakeLayers, drawLayer, inkAt, liveLayer, shotCamera, worldStand, worldWalk } from '/@kit/layout.js';
import { rescaleInk } from '/@kit/toon3d.js';
import { walkPose } from '/@kit/walk2d.js';
import { walk } from '/@kit/walk3d.js';
import { cue as c, TL } from '/@kit/timeline.js';
import * as PL from './plan.js';
import { label, scanner } from './props.js';
import { TILLY_SCALE, world } from './world.js';

requires({ dex: 1 });

const LINE = 2.4;                                         // the ink on screen, px: the set's and Dex's
export const SHOTS = {
  dock: shotCamera({ pos: [420, 1500, 4800], at: [360, 900, 0], fov: 30 }),
  walk: shotCamera({ pos: [2600, 1500, 7800], at: [2600, 820, 600], fov: 30 }),
  bin: shotCamera({ pos: [7000, 1700, 3900], at: [4150, 900, -150], fov: 30 }),
};
const shotAt = t => (t < c.walk ? 'dock' : t < c.arrive - 0.3 ? 'walk' : 'bin');
const LABEL = { w: 101.6, h: 152.4 };                    // the label, mm
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (t, a, b) => E.io(inv(a, b, t));
const turnTo = (a, b, k) => { const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * k; };
let L, Wd, catcher, img, sticker, baked = {};
// the label as a picture: white, inked round the edge, for the sticker on the order
function labelCanvas(im) {
  const c = Object.assign(document.createElement('canvas'), { width: 400, height: 600 }), g = c.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 400, 600);
  g.drawImage(im, 16, 18, 368, 564);
  g.strokeStyle = '#1D1A24'; g.lineWidth = 10; g.strokeRect(5, 5, 390, 590);
  return c;
}

export async function setup(stage) {
  L = layer3d(stage, { fov: 30 });
  L.lights = L.studioLights({ key: 2.6, fill: 0.95, rim: 1.3 });
  Object.assign(L.lights.top.shadow.camera, { left: -2600, right: 2600, top: 2600, bottom: -2600 });
  L.lights.top.shadow.camera.updateProjectionMatrix();
  Wd = world(L);
  rescaleInk(L.scene, inkAt(SHOTS.dock, LINE));          // every shot has the same lens: the ink LINE px wide
  catcher = new THREE.Mesh(new THREE.PlaneGeometry(30000, 12000), new THREE.ShadowMaterial({ opacity: 0.28, color: 0x6b3a1e }));
  catcher.rotation.x = -Math.PI / 2; catcher.position.set(4000, 1, 0); catcher.receiveShadow = true; catcher.visible = false; L.scene.add(catcher);
  img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = '/assets/label.png'; });
  const tex = new THREE.CanvasTexture(labelCanvas(img)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  sticker = new THREE.Mesh(new THREE.PlaneGeometry(LABEL.w, LABEL.h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  sticker.position.copy(STICK); sticker.visible = false; Wd.order.group.add(sticker);
  // the bakes: Tilly is away; the order is baked where it sits still (the dock and the walk)
  Wd.tilly.root.visible = false;
  for (const [name, shot] of Object.entries(SHOTS)) {
    L.lights.rig.position.set(shot.at[0], 0, shot.at[2]);
    Wd.order.group.visible = name !== 'bin';
    baked[name] = bakeLayers(L, shot, { back: name === 'bin' ? Wd.back : [...Wd.back, Wd.order.group], front: Wd.front });
  }
  Wd.tilly.root.visible = true; Wd.order.group.visible = true;
}

// ---------- Tilly: up the aisle, parked, into the bin, lifting, out and away (the intro's drive) ----------
const PARK = [5600, 350], IN = [4000, 60], OUT = [4000, 1150], GONE = [11000, 1150];
const CURVE = [PARK, [4750, 390], [4250, 300], IN];
const bez = u => { const m = 1 - u; return [0, 1].map(i => m * m * m * CURVE[0][i] + 3 * m * m * u * CURVE[1][i] + 3 * m * u * u * CURVE[2][i] + u * u * u * CURVE[3][i]); };
function tillyXZ(u) {
  if (u < c.tillyStop) return [lerp(9800, PARK[0], E.out(inv(c.tillyGo, c.tillyStop, u))), PARK[1], -Math.PI / 2];
  if (u < c.turnIn) return [...PARK, -Math.PI / 2];
  if (u < c.forksIn) {
    const k = E.io(inv(c.turnIn, c.forksIn, u)), [x, z] = bez(k), [ax, az] = bez(Math.max(0, k - 0.01)), [bx, bz] = bez(Math.min(1, k + 0.01));
    return [x, z, Math.atan2(bx - ax, bz - az)];
  }
  if (u < c.back + 1.1) return [IN[0], lerp(IN[1], OUT[1], E.io(inv(c.back, c.back + 1.1, u))), Math.PI];
  if (u < c.away) return [...OUT, turnTo(Math.PI, Math.PI / 2, ease(u, c.back + 1.1, c.away))];
  return [lerp(OUT[0], GONE[0], E.in(inv(c.away, c.away + 3.4, u))), OUT[1], Math.PI / 2];
}
function tillyAt(t) {
  const [x, z, yaw] = tillyXZ(t);
  const lift = 0.3 * ease(t, c.lift, c.lift + 0.7);
  const happy = on(t, c.thanks, 0.2) - on(t, c.thanks + 1.8, 0.3);
  const p = tillyPose(t, [], {
    path: u => tillyXZ(u),
    extra: () => ({ yaw, 'forks.y': -0.08 + lift, 'eyes.mood': happy > 0.5 ? 1 : 0, 'cab.yaw': t < c.turnIn ? 0.5 * on(t, c.tillyStop, 0.5) : 0,
      beacon: (t > c.tillyGo && t < c.tillyStop) || t > c.turnIn ? 1 : 0 }),
  });
  Wd.tilly.update(p, { x, y: 0, z, scale: TILLY_SCALE });
  return [x, z];
}
// the order: in its bin until Tilly lifts it, then on her forks
let orderRest = null;
function placeOrder(t) {
  const g = Wd.order.group;
  orderRest ??= { p: g.position.clone(), q: g.quaternion.clone() };
  g.position.copy(orderRest.p); g.quaternion.copy(orderRest.q);
  if (t < c.lift) return;
  g.updateMatrixWorld(true);
  const rest = g.matrixWorld.clone();
  tillyAt(c.lift); Wd.tilly.root.updateMatrixWorld(true);
  const M0 = Wd.tilly.carriage.matrixWorld.clone();
  tillyAt(t); Wd.tilly.root.updateMatrixWorld(true);
  Wd.tilly.carriage.matrixWorld.clone().multiply(M0.invert()).multiply(rest).decompose(g.position, g.quaternion, g.scale);
}
// where the label goes on the order (its middle): the front of the boxes, facing the aisle
const STICK = V(-130, 400, 395);
function loadSpot() {
  Wd.order.group.updateMatrixWorld(true);
  return Wd.order.group.localToWorld(STICK.clone());
}

// ---------- Dex ----------
const YAW_PRINTER = -1.9, YAW_READ = -0.55, YAW_BIN = Math.PI;
const MOVES = [
  { t: -1, dur: 0.001, pose: { ...EXPR.neutral, 'mood.smile': 0.35 } },
  { t: c.tear - 0.1, dur: 0.25, pose: { ...EXPR.neutral, 'brows.up': 0.3, 'mood.smile': 0.2 } },
  { t: c.read + 0.2, dur: 0.3, pose: { ...EXPR.neutral, 'mood.smile': 0.55, 'brows.up': 0.25, 'eyes.x': -0.7, 'eyes.y': 0.15 } },   // reading it
  { t: c.walk + 0.4, dur: 0.4, pose: { ...EXPR.neutral, 'mood.smile': 0.4 } },
  { t: c.scanOrder + 0.35, dur: 0.3, pose: EXPR.happy },
  { t: c.tillyGo + 0.6, dur: 0.3, pose: { ...EXPR.surprised, 'mood.smile': 0.3 } },
  { t: c.thanks - 0.1, dur: 0.3, pose: EXPR.delighted },
];
// Where he is, facing which way, and his walk if he's walking, in the set.
function body(t) {
  if (t < c.walk) return { at: PL.AT_PRINTER, yaw: turnTo(YAW_PRINTER, YAW_READ, ease(t, c.tear + 0.15, c.read + 0.35)) };
  if (t < c.arrive + 0.4) {
    const wk = walk(t, { path: PL.WALK_PATH, t0: c.walk, t1: c.arrive, ...PL.WALK_OPTS });
    return { wk, yaw: turnTo(turnTo(YAW_READ, wk.yaw, ease(t, c.walk, c.walk + 0.5)), YAW_BIN, ease(t, c.arrive - 0.3, c.arrive + 0.4)) };
  }
  const [tx, tz] = tillyXZ(t), toward = at => Math.atan2(tx - at[0], tz - at[1]);
  if (t < c.aside) {
    const yaw = turnTo(YAW_BIN, toward(PL.AT_BIN), ease(t, c.tillyGo + 0.5, c.tillyGo + 1.1));
    return { at: PL.AT_BIN, yaw };
  }
  const wk = walk(t, { path: PL.ASIDE_PATH, t0: c.aside, t1: c.aside + PL.ASIDE, ...PL.WALK_OPTS });
  return { wk, yaw: turnTo(wk.yaw, toward(PL.WATCH), ease(t, c.aside + PL.ASIDE - 0.4, c.aside + PL.ASIDE + 0.3)) };
}

// His pose at t, placed for the shot: { p, x, y, scale, depth, held }.
export function dexAt(t, shot) {
  const tq = onTwos(t), b = body(tq);
  const place = b.wk
    ? worldWalk(shot, { ...b.wk, yaw: b.yaw }, { unit: PL.DEX_UNIT, step: PL.WALK_OPTS.step, lift: PL.WALK_OPTS.lift })
    : worldStand(shot, b.at, b.yaw, { unit: PL.DEX_UNIT });
  let p = dexPose(t, MOVES, { extra: () => ({ 'body.view': place.view, 'handR.shape': HAND.grip, 'handL.shape': HAND.relaxed }) });
  if (b.wk && b.wk.go > 0.01) p = walkPose(dex, p, place.w, { scale: place.scale });
  const local = ([sx, sy]) => [(sx - place.x) / place.scale, (sy - place.y) / place.scale];
  const s = place.scale;

  // his left hand: to the label at the printer, tearing it, up to read it, down to carry it, onto the order
  const armL = ['armL.r', 'foreL.r'];
  const hand = (target, k, shape) => { if (k > 0) { p = mixKeys(p, reachChain(dex, p, 'armL', target, { quiet: true }), k, armL); if (shape && k > 0.5) p['handL.shape'] = shape; } };
  if (t < c.walk + 0.6) {
    const exit = SHOTS.dock.project(Wd.zt.group.localToWorld(Wd.zt.exit.clone()).toArray());
    const out = clamp((t - c.feed) / PL.FEED) * LABEL.h * exit.scale;
    hand(local([exit.x, exit.y + out * 0.3]), ease(t, c.grab - 0.45, c.grab) * (1 - ease(t, c.tear + 0.05, c.read + 0.3)), HAND.grip);
    hand([-150, -700], ease(t, c.tear + 0.05, c.read + 0.3) * (1 - ease(t, c.walk, c.walk + 0.6)), HAND.grip);
  }
  const labelAt = t > c.stick - 0.8 && t < c.scanOrder + 1 ? local(Object.values(SHOTS.bin.project(loadSpot().toArray())).slice(0, 2)) : null;
  if (labelAt) hand([labelAt[0], labelAt[1] - 40], ease(t, c.stick - 0.55, c.stick) * (1 - ease(t, c.stick + 0.35, c.stick + 0.9)), HAND.palm);
  // his right hand: the scanner, out towards the label on the order, its nose at it
  const aim = ease(t, c.scanOrder - 0.5, c.scanOrder - 0.1) * (1 - ease(t, c.scanOrder + 0.5, c.scanOrder + 0.9));
  let beam = 0;
  if (aim > 0 && labelAt) {
    const sh = dex.where('armR', p), to = [sh[0] + (labelAt[0] - sh[0]) * 0.5, sh[1] + (labelAt[1] - sh[1]) * 0.5];
    const q = reachChain(dex, p, 'armR', to, { quiet: true }), hp = dex.where('handR', q);
    q['handR.r'] = Math.atan2(-(labelAt[0] - hp[0]), labelAt[1] - hp[1]) - dex.angle('foreR', q);
    beam = Math.hypot(labelAt[0] - hp[0], labelAt[1] - hp[1]) / 1.05;
    p = mixKeys(p, q, aim, ['armR.r', 'foreR.r', 'handR.r']);
  }
  const scanning = t > c.scanOrder - 0.05 && t < c.scanOrder + 0.35;

  // what's in his hands: the scanner from the bin on; the label from the tear until it's stuck on
  const hasLabel = t >= c.tear && t < c.stick;
  const held = {
    handL: hasLabel ? g => {
      const m = g.getTransform(), k = Math.hypot(m.a, m.b);          // hangs straight down, however the hand turns
      g.setTransform(k, 0, 0, k, m.e, m.f);
      label(g, img, LABEL.w / PL.DEX_UNIT, LABEL.h / PL.DEX_UNIT);
    } : undefined,
    handR: t >= c.arrive - 0.3 ? g => { g.save(); g.scale(1.05, 1.05); scanner(g, { laser: scanning ? 1 : 0, reach: beam, light: t > c.scanOrder + 0.1 ? 'ok' : undefined }); g.restore(); } : undefined,
  };
  return { p, x: place.x, y: place.y, scale: s, depth: place.depth, held };
}

// ---------- the frame ----------
export function render(stage, t) {
  const { ctx, W, H } = stage;
  const name = shotAt(t), shot = SHOTS[name], bake = baked[name];
  L.lights.rig.position.set(shot.at[0], 0, shot.at[2]);
  tillyAt(t); placeOrder(t);
  sticker.visible = t >= c.stick;
  const d = dexAt(t, shot);
  const drawDex = () => dex.draw(ctx, d.p, { x: d.x, y: d.y, scale: d.scale, line: LINE, held: d.held });
  const items = [{ depth: d.depth, draw: drawDex }];
  if (Wd.front.length) {
    const f = shot.project(Wd.front[0].position.toArray());
    items.push({ depth: f.depth, draw: () => drawLayer(ctx, bake.front) });
  }
  if (name === 'bin') {
    // the order and Tilly, drawn live, each holding the other out, with their shadows
    const o = shot.project(Wd.order.group.position.toArray()), tp = shot.project(Wd.tilly.root.position.toArray());
    items.push({ depth: o.depth, draw: () => {
      Wd.tilly.root.visible = false; catcher.visible = true;
      drawLayer(ctx, liveLayer(L, shot, { show: [Wd.order.group], hold: [...Wd.back, ...Wd.front] }));
      catcher.visible = false; Wd.tilly.root.visible = true;
    } });
    if (t > c.tillyGo) items.push({ depth: tp.depth, draw: () => drawLayer(ctx, liveLayer(L, shot, { show: [Wd.tilly.root, catcher], hold: [...Wd.back, ...Wd.front, Wd.order.group] })) });
  }
  if (name === 'dock' && t < c.tear) {
    // the label, printing out of the slot and hanging there until he tears it off
    const exit = shot.project(Wd.zt.group.localToWorld(Wd.zt.exit.clone()).toArray());
    items.push({ depth: exit.depth, draw: () => withLine(LINE / exit.scale, () => {
      ctx.save(); ctx.translate(exit.x, exit.y); ctx.scale(exit.scale, exit.scale);
      label(ctx, img, LABEL.w, LABEL.h, { shown: clamp((t - c.feed) / PL.FEED) });
      ctx.restore();
    }) });
  }
  ctx.fillStyle = '#C5CDD3'; ctx.fillRect(0, 0, W, H);
  drawLayer(ctx, bake.back);
  items.sort((a, b) => b.depth - a.depth).forEach(i => i.draw());
  caption(ctx, t, { bottom: 1052, size: 34, lineH: 44 });
  const black = Math.max(1 - on(t, 0, 0.4), on(t, TL.dur - 0.6, 0.6));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
