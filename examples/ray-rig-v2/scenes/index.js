// The Ray rig test: Ray goes through what his rig can do, on a plain floor, with a crate and a
// handle to pick up.
import { E, inOut, on, track } from '/@kit/core.js';
import { gradient } from '/@kit/draw.js';
import { grade } from '/@kit/finish.js';
import { HAND } from '/@kit/hand3d.js';
import { layer3d, THREE } from '/@kit/scene3d.js';
import { roundBox, solid, toon } from '/@kit/toon3d.js';
import { TL } from '/@kit/timeline.js';
import { RAY_EXPR, ray3d, rayPose } from '/@kit/characters/ray3d.js';
import { BEATS as B, CAPTIONS as CAPS } from '../timeline.js';

const SCALE = 0.55, HANDLE_R = 17, HANDLE_LEN = 190;
const CAPTIONS = [...CAPS, [B.done + 0.9, '']];

// ---------- the moves ----------
const m = [];
const move = (t, dur, pose, ease = E.io) => m.push({ t, dur, pose, ease });
const REST_R = { 'handR.x': 215, 'handR.y': 905, 'handR.z': 35, 'handR.px': -1, 'handR.py': 0, 'handR.pz': 0.2, ...HAND.relaxed('handR'), 'handR.flex': 0, 'handR.dev': 0 };
const REST_L = { 'handL.x': -215, 'handL.y': 905, 'handL.z': 35, 'handL.px': 1, 'handL.py': 0, 'handL.pz': 0.2, ...HAND.relaxed('handL'), 'handL.flex': 0, 'handL.dev': 0 };
const LOOK = (x = 0, y = 0) => ({ 'eyes.x': x, 'eyes.y': y });

// a wave: the hand up, palm out, the wrist flapping; the fingers are loose, so they trail it
move(B.wave, 0.55, { 'handR.x': 330, 'handR.y': 1500, 'handR.z': 180, 'handR.px': 0, 'handR.py': 0, 'handR.pz': 1, ...HAND.open('handR'), ...RAY_EXPR.happy, 'head.r': -0.06 }, E.out);
for (let i = 0; i < 7; i++) move(B.wave + 0.55 + i * 0.3, 0.3, { 'handR.flex': i % 2 ? -0.3 : 0.42 });
move(B.wave + 0.55 + 7 * 0.3, 0.3, { 'handR.flex': 0 });
move(B.waveDown, 0.7, { ...REST_R, ...RAY_EXPR.neutral, 'head.r': 0 });
// counting on the left hand, held up to us, looking at it
move(B.count, 0.6, { 'handL.x': -250, 'handL.y': 1400, 'handL.z': 330, 'handL.px': 0, 'handL.py': 0, 'handL.pz': 1, 'handL.flex': -0.2, ...HAND.count('handL', 0), ...LOOK(-0.35, -0.1), 'head.turn': -0.2 });
for (let n = 1; n <= 5; n++) move(B.count + 0.5 + (n - 1) * 0.6, 0.3, HAND.count('handL', n), E.snap);
move(B.countDown, 0.7, { ...REST_L, ...LOOK(), 'head.rx': 0, 'head.turn': 0 });
// pointing off to his left: chest, head and eyes turn that way, the arm straight out
move(B.point, 0.7, { 'torso.ry': 0.3, 'head.turn': 0.75, ...LOOK(0.45, 0.05), 'handR.x': 640, 'handR.y': 1330, 'handR.z': 420, 'handR.px': 0, 'handR.py': -1, 'handR.pz': 0, ...HAND.point('handR') }, E.out);
move(B.pointBack, 0.7, { 'torso.ry': 0, 'head.turn': 0, ...LOOK(), ...REST_R });
// picking up the handle from the crate: look down, bend, hand over it, down onto it, close, lift
const GRIP = { 'handR.x': 470, 'handR.y': 620, 'handR.z': 330, 'handR.px': 0, 'handR.py': -1, 'handR.pz': 0 };
const BEND = { 'torso.rx': 0.55, 'torso.ry': 0.35, 'hips.y': -70, 'head.rx': 0.2, 'head.turn': 0.3, ...LOOK(0.2, -0.45) };
move(B.pick, 0.8, { ...BEND, ...GRIP, 'handR.y': 760, ...HAND.reach('handR') });
move(B.pick + 0.85, 0.45, { 'handR.y': 620 });
move(B.grasp, 0.35, HAND.grasp('handR'), E.out);
move(B.lift, 0.8, { 'torso.rx': 0, 'torso.ry': 0, 'head.turn': 0, 'hips.y': 0, 'head.rx': 0.12, ...LOOK(0.15, -0.3), 'handR.x': 220, 'handR.y': 1180, 'handR.z': 360, 'handR.px': -0.9, 'handR.py': 0.3, 'handR.pz': 0.3 });
// turning it over, and a thumbs up with the other hand
for (let i = 0; i < 4; i++) move(B.lift + 1.0 + i * 0.55, 0.5, { 'handR.roll': i % 2 ? -0.5 : 0.45, 'handR.dev': i % 2 ? 0.15 : -0.2 });
move(B.lift + 1.0 + 4 * 0.55, 0.4, { 'handR.roll': 0, 'handR.dev': 0 });
move(B.thumbs, 0.5, { 'handL.x': -230, 'handL.y': 1180, 'handL.z': 300, 'handL.px': 1, 'handL.py': 0, 'handL.pz': 0, ...HAND.thumbsUp('handL'), ...RAY_EXPR.happy, ...LOOK(0, 0) });
move(B.thumbs + 1.3, 0.6, { ...REST_L, ...RAY_EXPR.neutral });
// and back on the crate
move(B.putDown, 0.8, { ...BEND, ...GRIP });
move(B.release, 0.35, HAND.reach('handR'));
move(B.release + 0.35, 0.5, { 'handR.y': 800 });
move(B.release + 0.9, 0.7, { ...REST_R, 'torso.rx': 0, 'torso.ry': 0, 'head.turn': 0, 'hips.y': 0, 'head.rx': 0, ...LOOK() });
// OK
move(B.ok, 0.55, { 'handR.x': 230, 'handR.y': 1450, 'handR.z': 320, 'handR.px': 0, 'handR.py': 0, 'handR.pz': 1, ...HAND.ok('handR'), ...RAY_EXPR.happy, 'head.r': 0.05 }, E.out);
move(B.ok + 0.7, 0.3, { 'head.rx': 0.12 }); move(B.ok + 1.0, 0.35, { 'head.rx': -0.02 });
move(B.done, 0.7, { ...REST_R, ...RAY_EXPR.neutral, 'head.r': 0, 'head.rx': 0 });
const MOVES = m.sort((a, b) => a.t - b.t);

// ---------- the scene ----------
let L, ray, handle, crate, restAt;
const GRIP_LOCAL = new THREE.Matrix4().compose(new THREE.Vector3(-24, -92, 3),
  new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.12, -0.35, 1).normalize()), new THREE.Vector3(1, 1, 1));
const M4 = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), A = new THREE.Vector3();
const handleAt = (matrix, pos, quat) => { matrix.decompose(pos, quat, S); return { pos, quat }; };

export function setup(stage) {
  L = layer3d(stage, { fov: 22 });
  L.lights = L.studioLights({ key: 2.7, fill: 0.85, rim: 1.4 });
  Object.assign(L.lights.top.shadow.camera, { left: -1500, right: 1500, top: 1500, bottom: -1500 });
  L.lights.top.shadow.camera.updateProjectionMatrix();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.ShadowMaterial({ opacity: 0.25, color: 0x3a4a66 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; L.scene.add(floor);
  ray = ray3d(L);
  // the handle: an orange grip with a dark band
  handle = new THREE.Group();
  const body = solid(new THREE.CylinderGeometry(HANDLE_R, HANDLE_R, HANDLE_LEN, 40), toon('#E57A2C'));
  const band = solid(new THREE.CylinderGeometry(HANDLE_R + 1.2, HANDLE_R + 1.2, 34, 40), toon('#3B3F4A'), { ink: 1.6 });
  band.position.y = HANDLE_LEN / 2 - 28;
  handle.add(body, band); handle.scale.setScalar(SCALE); L.scene.add(handle);
  // where it lies on the crate: where his hand holds it when he closes on it, laid flat
  const probe = rayPose(B.grasp + 0.2, MOVES, { id: 'probe' });
  ray.update(probe, { scale: SCALE });
  ray.bones.handR.updateWorldMatrix(true, false);
  M4.multiplyMatrices(ray.bones.handR.matrixWorld, GRIP_LOCAL);
  const at = handleAt(M4, new THREE.Vector3(), new THREE.Quaternion());
  const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(at.quat); axis.y = 0; axis.normalize();
  restAt = { pos: at.pos.clone(), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis) };
  // the crate under it, its top just below the handle
  const top = restAt.pos.y - HANDLE_R * SCALE;
  crate = solid(roundBox(300, top, 240, 12), toon('#C98B4E'));
  crate.position.set(restAt.pos.x + 60, top / 2, restAt.pos.z + 30);
  crate.receiveShadow = true;
  L.scene.add(crate);
}

export function render({ ctx, W, H }, t) {
  gradient(ctx, 0, 0, W, H, '#EEF2F4', '#C5D3DC');
  const p = rayPose(t, MOVES);
  // the handle: on the crate, or in his hand from when he lifts it until he lets go
  const carry = on(t, B.lift - 0.05, 0.25) * (1 - on(t, B.release - 0.1, 0.25));
  handle.position.copy(restAt.pos); handle.quaternion.copy(restAt.quat);
  const hold = { kind: 'handle', at: new THREE.Vector3(), axis: new THREE.Vector3(), r: HANDLE_R * SCALE };
  if (carry > 0) {
    // pose him once to find his hand, then move the handle with it
    ray.update(p, { scale: SCALE, hold: { R: { ...hold, at: restAt.pos, axis: A.set(0, 1, 0).applyQuaternion(restAt.quat) } } });
    ray.bones.handR.updateWorldMatrix(true, false);
    M4.multiplyMatrices(ray.bones.handR.matrixWorld, GRIP_LOCAL);
    const inHand = handleAt(M4, P, Q);
    handle.position.lerp(inHand.pos, carry); handle.quaternion.slerp(inHand.quat, carry);
  }
  hold.at.copy(handle.position); hold.axis.set(0, 1, 0).applyQuaternion(handle.quaternion);
  ray.update(p, { scale: SCALE, hold: { R: hold } });

  // the camera: the whole of him, closer for the counting, round to the crate for the pick-up
  const shot = track(t, [
    [0, [180, 560, 3050, 40, 480, 0]], [4.6, [180, 560, 3050, 40, 480, 0]], [5.4, [-120, 760, 1700, -40, 660, 0]],
    [8.6, [-120, 760, 1700, -40, 660, 0]], [9.4, [400, 600, 3000, 120, 520, 0]], [11.6, [400, 600, 3000, 120, 520, 0]],
    [12.4, [-1500, 820, 2100, 170, 480, 150]], [14.4, [-1500, 820, 2100, 170, 480, 150]], [15.2, [700, 760, 2300, 60, 620, 100]],
    [17.6, [700, 760, 2300, 60, 620, 100]], [18.4, [-1500, 820, 2100, 170, 480, 150]], [20.2, [-1500, 820, 2100, 170, 480, 150]],
    [20.9, [120, 760, 1900, 60, 700, 0]], [24, [120, 760, 1900, 60, 700, 0]],
  ]);
  L.camera.position.set(shot[0], shot[1], shot[2]); L.camera.lookAt(shot[3], shot[4], shot[5]);
  L.camera.near = 50; L.camera.far = 30000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(0, 0, 0);
  L.draw(ctx);
  grade(ctx, { edges: 0.18 });

  let cap = null, t0 = 0;
  for (const [at, text] of CAPTIONS) if (t >= at) { cap = text; t0 = at; }
  if (cap) {
    const next = CAPTIONS.find(([at]) => at > t0)?.[0] ?? TL.dur;
    ctx.globalAlpha = inOut(t, t0, 0.3, next - 0.35, 0.3);
    ctx.font = '500 34px Roboto'; ctx.fillStyle = '#2E4755'; ctx.textAlign = 'left';
    ctx.fillText(cap, 90, H - 80);
    ctx.globalAlpha = 1;
  }
  const black = Math.max(1 - on(t, 0, 0.3), on(t, TL.dur - 0.5, 0.5));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
