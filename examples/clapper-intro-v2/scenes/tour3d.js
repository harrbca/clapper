// The 3D part of the intro: a label prints at the dock, Pip tears it off and reads its bin, walks there,
// sticks it on the order and picks it with the scanner (whose screen plays capture/scanner), then Tilly
// takes the pallet away. Everything is a function of t: poses are worked out afresh each frame from cues.
import { clamp, E, inv, lerp, on } from '/@kit/core.js';
import { layer3d, paintedTexture, poseBetween, THREE } from '/@kit/scene3d.js';
import { scanner3d } from '/@kit/props3d.js';
import { loadPicture, printedLabel } from '/@kit/printers3d.js';
import { EXPR3, GRIP, pip3d, pip3dPose } from '/@kit/characters/pip3d.js';
import { tillyPose } from '/@kit/characters/tilly3d.js';
import { footLocal, walk } from '/@kit/walk3d.js';
import { screen } from '/@kit/screen.js';
import { cue as c } from '/@kit/timeline.js';
import * as PL from './plan3d.js';
import { TILLY_SCALE, world } from './world3d.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const S = PL.PIP_SCALE;
const TAP = { tapPick: [0.5, 0.288], tapDone: [0.5, 0.923] };      // where the taps land on the screen (from the capture)
const BARS = { order: [0.5, 0.8] };                                 // the label's barcode, on its picture
const BIN = 'A-01-03';
let L, W, pip, scanner, label, cap, screenTex, AT;

export async function setup(stage, scanCap) {
  cap = scanCap;
  AT = { home: -1, ...c };
  L = layer3d(stage, { fov: 30 });
  L.lights = L.studioLights({ key: 2.6, fill: 0.95, rim: 1.3 });
  Object.assign(L.lights.top.shadow.camera, { left: -2600, right: 2600, top: 2600, bottom: -2600 });
  W = world(L);
  pip = pip3d(L, { vest: true });
  screenTex = paintedTexture(480, 690, (g, w, h, t = 0) => {
    g.fillStyle = '#F3F5F8'; g.fillRect(0, 0, w, h);
    screen(g, t, cap, { at: AT, x: 0, y: 0, w, bar: false, pointer: 'touch' });
  });
  scanner = scanner3d(L, { screen: screenTex, scale: 0.9 * S });
  label = printedLabel(await loadPicture('/capture/label/00-label.png'), { h: 152.4, w: 101.6 }); L.scene.add(label.group);
}

// ---------- small helpers ----------
const turnTo = (a, b, k) => { const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * k; };
const ease = (t, a, b) => E.io(inv(a, b, t));
// her own space (her units, origin between her feet, facing +z) from the world and back, for a body
const toLocal = (P, b) => { const [x, y, z] = footLocal([P.x, P.y, P.z], b, S); return V(x, y, z); };
const toWorld = (p, b) => { const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw); return V(b.x + (p.x * cy + p.z * sy) * S, p.y * S, b.z + (-p.x * sy + p.z * cy) * S); };
// keyframes of anything, as [t, value] with functions for values worked out at t, eased between
function keyed(t, keys, mix) {
  keys = keys.slice().sort((a, b) => a[0] - b[0]);            // cues on words can land close together
  if (t <= keys[0][0]) return keys[0][1](t);
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return mix(keys[i - 1][1](t), keys[i][1](t), ease(t, keys[i - 1][0], keys[i][0]));
  return keys.at(-1)[1](t);
}
const mixV = (a, b, k) => a.clone().lerp(b, k);

// ---------- Pip's body: where she stands, which way, and her feet ----------
const YAW_TILLY = 1.35, YAW_WATCH = 2.45, READ_YAW = Math.PI - 0.75;
function body(t) {
  const stand = (x, z, yaw) => ({ x, z, yaw, go: 0, feet: null });
  if (t < c.walk) return { ...stand(...PL.AT_PRINTER, turnTo(Math.PI, READ_YAW, ease(t, c.tear + 0.2, c.read + 0.3))), shuffle: [[c.tear + 0.2, c.read + 0.3]] };
  if (t < c.arrive + 0.4) {
    const w = walk(t, { path: PL.WALK_PATH, t0: c.walk, t1: c.arrive, ...PL.WALK_OPTS });
    return { ...w, yaw: turnTo(turnTo(READ_YAW, w.yaw, ease(t, c.walk, c.walk + 0.7)), Math.PI, ease(t, c.arrive - 0.3, c.arrive + 0.4)) };
  }
  if (t < c.aside) {
    let yaw = Math.PI;
    yaw = turnTo(yaw, YAW_TILLY, ease(t, c.scanTo - 1.1, c.scanTo - 0.4));
    yaw = turnTo(yaw, Math.PI, ease(t, c.scanTo + 0.4, c.scanTo + 1.0));
    return { ...stand(...PL.AT_BIN, yaw), shuffle: [[c.scanTo - 1.1, c.scanTo - 0.4], [c.scanTo + 0.4, c.scanTo + 1.0]] };
  }
  const w = walk(t, { path: PL.ASIDE_PATH, t0: c.aside, t1: c.aside + PL.ASIDE, ...PL.WALK_OPTS });
  const yaw = turnTo(turnTo(Math.PI, w.yaw, ease(t, c.aside, c.aside + 0.6)), YAW_WATCH, ease(t, c.aside + PL.ASIDE - 0.2, c.aside + PL.ASIDE + 0.5));
  return { ...w, yaw, shuffle: [[c.aside + PL.ASIDE - 0.2, c.aside + PL.ASIDE + 0.5]] };
}

// ---------- Tilly: up the aisle, parked, into the bin, lifting, out and away ----------
const PARK = [5600, 350], IN = [4000, 60], OUT = [4000, 1150], GONE = [11000, 1150];
const CURVE = [PARK, [4750, 390], [4250, 300], IN];
const bez = u => { const m = 1 - u; return [0, 1].map(i => m * m * m * CURVE[0][i] + 3 * m * m * u * CURVE[1][i] + 3 * m * u * u * CURVE[2][i] + u * u * u * CURVE[3][i]); };
function tillyXZ(u) {                                   // where she is at u, and which way she faces
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
  const happy = on(t, c.scanTo, 0.2) - on(t, c.scanTo + 1.6, 0.3);
  const p = tillyPose(t, [], {
    path: u => tillyXZ(u),
    extra: () => ({ yaw, 'forks.y': -0.08 + lift, 'eyes.mood': happy > 0.5 ? 1 : 0, 'cab.yaw': t < c.turnIn ? 0.5 * on(t, c.tillyStop, 0.5) : 0,
      beacon: (t > c.tillyGo && t < c.tillyStop) || t > c.turnIn ? 1 : 0 }),
  });
  W.tilly.update(p, { x, y: 0, z, scale: TILLY_SCALE });
}

// ---------- the scanner in her right hand ----------
// A way of holding it: where her hand is (her space), what the nose points at and where the screen faces.
const HEAD = V(0, 790, 40);
function holding(t, b) {
  const head = toWorld(HEAD, b), fwd = (y, z) => toWorld(V(95, y, z + 600), b);
  const carry = () => ({ hand: toWorld(V(100, 390, 130), b), aim: fwd(200, 130), face: head });
  const look = () => ({ hand: toWorld(V(45, 465, 245), b), aim: toWorld(V(30, 330, 900), b), face: head });   // at her chest, screen up to her eyes
  const at = T => () => ({ hand: toWorld(V(90, 610, 310), b), aim: T(), face: head });
  const scanKeys = (cue, T) => [[c[cue] - 0.55, look], [c[cue] - 0.15, at(T)], [c[cue] + 0.25, at(T)], [c[cue] + 0.7, look]];
  if (t < c.arrive + 0.5) return carry();
  return keyed(t, [
    [c.arrive + 0.5, carry], [c.scanOrder - 0.8, carry],
    ...scanKeys('scanOrder', () => label.at(...BARS.order)),
    ...scanKeys('scanBin', () => W.labels[BIN].getWorldPosition(V())),
    ...scanKeys('scanTo', () => W.tl.getWorldPosition(V())),
    [c.tapDone + 0.6, look], [c.tapDone + 1.2, carry],
  ], (a, b2, k) => ({ hand: mixV(a.hand, b2.hand, k), aim: mixV(a.aim, b2.aim, k), face: mixV(a.face, b2.face, k) }));
}
const SCANS = ['scanOrder', 'scanBin', 'scanTo'];
const scanning = t => SCANS.find(k => t > c[k] - 0.15 && t < c[k] + 0.35);

// ---------- her left hand: the label and the taps ----------
// Each key gives where the hand goes: { at (world), grip: 'pinch' | 'tip' | null (the wrist), form }.
function leftHand(t, b) {
  const own = (x, y, z, form = 6) => () => ({ at: toWorld(V(x, y, z), b), grip: null, form });
  const rest = own(-122, 360, 20, 4), carry = own(-112, 470, 190), hang = own(-140, 390, 40), read = own(-60, 590, 200);
  const onPrinter = () => ({ at: W.zt.hung(label).c.clone().add(W.zt.hung(label).u.multiplyScalar(label.pitch / 2 - 6)), grip: 'pinch', form: 6 });
  const onLoad = () => ({ at: loadSpot().c.clone().add(V(0, label.pitch / 2 - 6, 3)), grip: 'pinch', form: 6 });
  const tap = which => () => ({ at: scanner.screenAt(...TAP[which], 1).at, grip: 'tip', form: 1 });
  const press = (cue, to, back) => [[c[cue] - 0.45, back], [c[cue] - 0.06, to], [c[cue] + 0.1, to], [c[cue] + 0.5, back]];
  return keyed(t, [
    [c.fed - 0.2, rest], [c.grab - 0.05, onPrinter], [c.tear - 0.05, onPrinter], [c.tear + 0.3, own(-90, 560, 260)], [c.read, read],
    [c.walk - 0.15, read], [c.walk + 0.6, hang], [c.arrive - 0.3, hang], [c.arrive + 0.4, carry],
    [c.stick - 0.6, carry], [c.stick + 0.05, onLoad], [c.stick + 0.4, onLoad], [c.stick + 0.9, rest],
    ...press('tapPick', tap('tapPick'), rest), ...press('tapDone', tap('tapDone'), rest),
  ], (a, b2, k) => ({ at: mixV(a.at, b2.at, k), form: k < 0.5 ? a.form : b2.form,
    // how much the fingers (rather than the wrist) are put on the spot, and which fingers
    fix: (a.grip ? 1 - k : 0) + (b2.grip ? k : 0), grip: (k < 0.5 ? a.grip ?? b2.grip : b2.grip ?? a.grip) }));
}

// Where the label goes on the order: the front of the boxes, facing the aisle.
function loadSpot() {
  W.order.group.updateMatrixWorld(true);
  return {
    c: W.order.group.localToWorld(V(-130, 440, W.order.front + 2)),
    f: V(0, 0, 1).transformDirection(W.order.group.matrixWorld), u: V(0, 1, 0).transformDirection(W.order.group.matrixWorld),
  };
}

// What she looks at.
function lookAt(t, b) {
  const scr = () => scanner.screenAt(0.5, 0.45).at;
  const ahead = () => toWorld(V(0, 700, 1600), b);
  const T = keyed(t, [
    [c.feed - 0.3, () => W.zt.hung(label).c], [c.tear + 0.2, () => W.zt.hung(label).c], [c.read, () => label.at(0.5, 0.45)], [c.walk, () => label.at(0.5, 0.45)],
    [c.walk + 0.6, ahead], [c.arrive - 0.6, ahead], [c.arrive, () => loadSpot().c], [c.stick + 0.7, () => loadSpot().c],
    [c.scanOrder - 0.6, () => label.at(...BARS.order)], [c.scanOrder + 0.35, scr],
    [c.scanBin - 0.5, () => W.labels[BIN].getWorldPosition(V())], [c.scanBin + 0.4, scr],
    [c.tillyStop - 1.2, () => W.tilly.root.position.clone().add(V(0, 600, 0))], [c.scanTo + 0.4, () => W.tl.getWorldPosition(V())], [c.scanTo + 0.8, scr],
    [c.tapDone + 0.6, scr], [c.aside + 0.3, ahead], [c.aside + PL.ASIDE, () => W.tilly.root.position.clone().add(V(0, 500, 0))],
  ], mixV);
  const p = toLocal(T, b), d = p.clone().sub(HEAD);
  return { 'head.turn': clamp(Math.atan2(d.x, d.z) / 0.62, -1.4, 1.4), 'head.rx': clamp(Math.atan2(-d.y, Math.hypot(d.x, d.z)), -0.45, 0.65), 'eyes.y': clamp(-d.y / 900, -0.4, 0.5) };
}

// ---------- the frame ----------
const MOVES = [{ t: -1, dur: 0.001, pose: { ...EXPR3.neutral, 'mood.smile': 0.4, 'handR.form': 5, 'handR.px': -1, 'handR.py': 0, 'handR.pz': 0 } }];
export function render(stage, t, cam) {
  const { ctx } = stage;
  L.camera.position.set(...cam.pos); L.camera.lookAt(...cam.at);
  L.camera.near = 30; L.camera.far = 60000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(cam.at[0], 0, cam.at[2]);
  screenTex.redraw(t);

  // the printer: its screen, lights, and the label coming out
  const printing = t >= c.feed - 0.3 && t < c.fed + 0.3;
  W.zt.update({ screen: printing ? { state: 'printing', sub: 'Order 4821', name: 'Label printer 1' } : { state: 'ready', name: 'Label printer 1' },
    led: { data: t >= c.feed && t < c.fed && Math.floor(t * 8) % 2 ? 'green' : 'off' } });
  tillyAt(t);

  // the order's pallet: in its bin, until Tilly lifts it, then on her forks
  if (t >= c.lift) {
    tillyAt(c.lift); W.tilly.root.updateMatrixWorld(true);
    const M0 = W.tilly.carriage.matrixWorld.clone(), rest = restOfOrder();
    tillyAt(t); W.tilly.root.updateMatrixWorld(true);
    W.tilly.carriage.matrixWorld.clone().multiply(M0.invert()).multiply(rest).decompose(W.order.group.position, W.order.group.quaternion, W.order.group.scale);
  } else placeOrderAtRest();

  if (t >= c.stick) placeLabel(t);                             // on the load already: the scanner may aim at it
  // Pip
  const b = body(t);
  const pose = pip3dPose(t, MOVES, { id: 'pip3d' });
  pose.yaw = b.yaw;
  Object.assign(pose, lookAt(t, b));
  if (b.feet) {
    for (const f of ['L', 'R']) { const [x, y, z] = footLocal(b.feet[f], b, S); Object.assign(pose, { [`foot${f}.x`]: x, [`foot${f}.y`]: 42 + y, [`foot${f}.z`]: z }); }
    pose['hips.y'] = (pose['hips.y'] ?? 0) - 28 * b.go + 7 * b.go * Math.cos(2 * b.phase);
    pose['torso.ry'] = (pose['torso.ry'] ?? 0) + 0.07 * b.go * Math.sin(b.phase);
    pose['torso.rx'] = (pose['torso.rx'] ?? 0) + 0.05 * b.go;
  }
  for (const [a, z] of b.shuffle ?? []) {                       // turning on the spot: a small step with each foot
    const k = inv(a, z, t);
    pose['footL.y'] = 42 + 22 * Math.max(0, Math.sin(Math.PI * clamp(k * 2)));
    pose['footR.y'] = 42 + 22 * Math.max(0, Math.sin(Math.PI * clamp(k * 2 - 1)));
  }
  pose['torso.rx'] = (pose['torso.rx'] ?? 0) + 0.2 * (on(t, c.stick - 0.6, 0.4) - on(t, c.stick + 0.5, 0.4));   // reaching down to the load
  const place = { x: b.x, y: 0, z: b.z, scale: S };
  const lh = leftHand(t, b);
  pose['handL.form'] = lh.form; pose['handL.px'] = lh.form === 1 ? 0.2 : 1; pose['handL.py'] = lh.form === 1 ? -0.9 : 0; pose['handL.pz'] = 0;
  pip.update(pose, place);
  const l0 = pip.local(lh.at); Object.assign(pose, { 'handL.x': l0.x, 'handL.y': l0.y, 'handL.z': l0.z });
  // the scanner, then her right hand round its handle
  const h = holding(t, b);
  scanner.hold(h.hand, h.aim.clone().sub(h.hand), h.face.clone().sub(h.hand));
  const grip = scanner.handFrame(GRIP, 1), wr = pip.local(grip.wrist);
  Object.assign(pose, { 'handR.x': wr.x, 'handR.y': wr.y, 'handR.z': wr.z });
  // the left hand's fingers (a pinch, or a fingertip) put exactly where they go
  const fix = lh.fix ?? (lh.grip ? 1 : 0);
  if (fix > 0) {
    const target = leftHand(t, b).at;                            // worked out again, now the scanner is placed
    for (let i = 0; i < 2; i++) {
      pip.update(pose, place);
      const want = pip.local(target), got = pip.local(lh.grip === 'tip' ? pip.tip('L') : pip.pinch('L'));
      pose['handL.x'] += (want.x - got.x) * fix; pose['handL.y'] += (want.y - got.y) * fix; pose['handL.z'] += (want.z - got.z) * fix;
    }
  }
  pip.update(pose, place);
  pip.orientHand('R', grip.quat);

  // the scanner: its beam at whatever it is reading, the light green as it reads
  const sc = scanning(t);
  scanner.update({ trigger: sc ? 1 : 0, led: sc && t > c[sc] ? 'green' : 'off', camera: L.camera,
    beam: sc ? { to: holding(c[sc], b).aim, k: clamp((t - c[sc] + 0.15) / 0.1) * (1 - on(t, c[sc] + 0.25, 0.1)) } : null });

  placeLabel(t);                                                // printing, torn off, read, carried, stuck on the load
  ctx.fillStyle = '#C5CDD3'; ctx.fillRect(0, 0, stage.W, stage.H);
  L.draw(ctx);
}

let orderRest = null;
function placeOrderAtRest() {
  if (!orderRest) orderRest = { p: W.order.group.position.clone(), q: W.order.group.quaternion.clone() };
  W.order.group.position.copy(orderRest.p); W.order.group.quaternion.copy(orderRest.q);
}
function restOfOrder() { placeOrderAtRest(); W.order.group.updateMatrixWorld(true); return W.order.group.matrixWorld.clone(); }

function placeLabel(t) {
  if (t < c.grab) { W.zt.hang(label, t < c.feed ? 0 : label.pitch * lerp(clamp((t - c.feed) / PL.FEED), E.io(clamp((t - c.feed) / PL.FEED)), 0.25)); return; }
  const p = pip.pinch('L');
  // held by its top edge, between her finger and thumb: which way it faces as she handles it
  const toHer = pip.head.getWorldPosition(V()).sub(p).setY(0).normalize();
  const side = V(-1, 0, 0).applyQuaternion(pip.root.children[0].getWorldQuaternion(new THREE.Quaternion()));
  const held = f => ({ c: p.clone().add(V(0, -label.pitch / 2 + 6, 0)), f, u: V(0, 1, 0) });
  let pose;
  if (t < c.tear) pose = W.zt.hung(label);
  else if (t < c.stick + 0.05) {
    const f = toHer.clone().lerp(side, ease(t, c.walk, c.walk + 0.6) * (1 - ease(t, c.arrive, c.arrive + 0.5))).normalize();
    pose = poseBetween(W.zt.hung(label), held(f), ease(t, c.tear, c.tear + 0.3));
    const spot = loadSpot();
    pose = poseBetween(pose, { ...spot, c: spot.c.clone().add(V(0, 0, 60)) }, ease(t, c.stick - 0.5, c.stick + 0.05));
  } else pose = loadSpot();
  label.place(pose.c, pose.f, pose.u);
}
