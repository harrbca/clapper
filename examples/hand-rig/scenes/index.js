// The hand rig test: one hand, big, going through what the rig can do.
import { E, clamp, inOut, lerp, on, track } from '/@kit/core.js';
import { gradient } from '/@kit/draw.js';
import { grade } from '/@kit/finish.js';
import { HAND, handLife } from '/@kit/hand3d.js';
import { layer3d, THREE } from '/@kit/scene3d.js';
import { TL } from '/@kit/timeline.js';
import { BEATS as TIMES, CAPTIONS as CAPS } from '../timeline.js';
import { hand, handle } from './hand.js';

const h = 'handR', S = 2.3;
const REST = { ...HAND.relaxed(h), [`${h}.touchF`]: 0, [`${h}.flex`]: 0, [`${h}.dev`]: 0 };
const CAPTIONS = [...CAPS, [32.9, '']];

// the moves, as for choreo: hand shapes, and the wrist
function moveList() {
  const T = TIMES, m = [];
  const shape = (t, pose, dur = 0.42, ease = E.io) => m.push({ t, dur, pose, ease });
  shape(T.open, HAND.open(h), 0.5);
  shape(T.close, { ...HAND.fist(h), [`${h}.flex`]: -0.18 }, 0.42);            // a fist cocks the wrist back a little
  shape(T.reopen, { ...HAND.open(h), [`${h}.flex`]: 0 }, 0.5);
  shape(T.relax, HAND.relaxed(h), 0.7);
  for (let n = 1; n <= 5; n++) shape(T.count + (n - 1) * 0.8, HAND.count(h, n), 0.34, E.snap);
  shape(T.count + 4.2, HAND.relaxed(h), 0.5);
  [0, 1, 2, 3, 2, 1, 0].forEach((f, i) => shape(T.touch + i * 0.72, HAND.touch(h, f), 0.4));
  shape(T.touch + 5.2, HAND.relaxed(h), 0.5);
  // the wave: the hand open, the wrist swinging; the fingers are left loose so they trail it
  shape(T.wave, { ...HAND.flat(h), [`${h}.i1`]: 0.05, [`${h}.m1`]: 0.05, [`${h}.r1`]: 0.08, [`${h}.p1`]: 0.12, [`${h}.is`]: 0.02, [`${h}.ps`]: 0.02 }, 0.4);
  for (let i = 0; i < 7; i++) m.push({ t: T.wave + 0.35 + i * 0.3, dur: 0.3, pose: { [`${h}.flex`]: i % 2 ? -0.35 : 0.45, [`${h}.dev`]: i % 2 ? 0.08 : -0.08 }, ease: E.io });
  m.push({ t: T.wave + 0.35 + 7 * 0.3, dur: 0.45, pose: { [`${h}.flex`]: 0, [`${h}.dev`]: 0 } });
  shape(T.wave + 2.9, HAND.relaxed(h), 0.5);
  // the ripple: each finger dips and lifts in turn, little finger first, three times over
  shape(T.ripple - 0.1, HAND.open(h), 0.35);
  for (let r = 0; r < 3; r++) ['p', 'r', 'm', 'i'].forEach((f, i) => {
    const t = T.ripple + 0.3 + r * 0.62 + i * 0.1;
    m.push({ t, dur: 0.14, pose: { [`${h}.${f}1`]: 0.75, [`${h}.${f}2`]: 0.5 }, ease: E.io });
    m.push({ t: t + 0.14, dur: 0.2, pose: { [`${h}.${f}1`]: -0.05, [`${h}.${f}2`]: 0.04 }, ease: E.out });
  });
  shape(T.ripple + 2.4, HAND.relaxed(h), 0.5);
  // the grip: open, ready, and close round the handle as it comes in
  shape(T.grip, HAND.reach(h), 0.45);
  shape(T.grip + 0.75, HAND.grasp(h), 0.55);
  shape(T.release, HAND.reach(h), 0.4);
  shape(T.release + 0.5, HAND.relaxed(h), 0.4);
  shape(T.gestures, HAND.thumbsUp(h), 0.45);
  shape(T.gestures + 1.05, HAND.point(h), 0.4);
  shape(T.gestures + 2.05, HAND.peace(h), 0.4);
  shape(T.gestures + 3.05, HAND.ok(h), 0.45);
  shape(T.done, HAND.relaxed(h), 0.6);
  return m.sort((a, b) => a.t - b.t);
}
const MOVES = moveList();
const wristOf = u => {
  let f = 0;
  for (const mv of MOVES) if (mv.pose[`${h}.flex`] !== undefined && u >= mv.t) f = lerp(f, mv.pose[`${h}.flex`], E.io(clamp((u - mv.t) / mv.dur)));
  return f;
};

// the handle: comes in from the front, into the palm; thick, thicker, then thin; and away again
const T = TIMES;
const radius = t => track(t, [[T.squeeze, 16], [T.squeeze + 1.2, 30], [T.squeeze + 2.2, 30], [T.squeeze + 3.2, 7], [T.release, 7]]);
const inHand = t => on(t, T.grip + 0.1, 0.7) * (1 - on(t, T.release + 0.15, 0.6));

let L, H3, bar;
export function setup(stage) {
  L = layer3d(stage, { fov: 22 });
  L.lights = L.studioLights({ fill: 0.8, key: 2.7, rim: 1.5 });
  H3 = hand(L, { side: 1, fore: 420 });
  bar = handle(L, 1, 190);
}

const P = new THREE.Vector3(), A = new THREE.Vector3(), PALM_AT = new THREE.Vector3(0, 20, 0);
const qBase = new THREE.Quaternion(), qRoll = new THREE.Quaternion(), EU = new THREE.Euler(), ZAXIS = new THREE.Vector3(0, 0, 1);
export function render({ ctx, W, H }, t) {
  gradient(ctx, 0, 0, W, H, '#F1F5F7', '#C9D9E2');
  // the hand points up, palm to us, turning a little now and then so it reads in 3D
  // (side on for the wave and the ripple, whose fingers move towards us and away)
  const yaw = track(t, [[0, -0.35], [4.4, -0.3], [5.2, -0.12], [9.2, -0.12], [9.8, -0.62], [14.8, -0.62], [15.5, -1.15], [18.5, -1.15], [19.0, -0.8], [21.4, -0.8],
    [22.0, -0.95], [27.8, -0.95], [28.3, -0.3], [33.6, -0.2]]);
  // and on its side for the thumbs up, so the thumb points up
  const roll = track(t, [[T.gestures - 0.3, 0], [T.gestures + 0.15, -Math.PI / 2], [T.gestures + 0.8, -Math.PI / 2], [T.gestures + 1.1, 0]]);
  qBase.setFromEuler(EU.set(0, -Math.PI / 2 + yaw, Math.PI, 'YZX'));
  H3.group.quaternion.multiplyQuaternions(qRoll.setFromAxisAngle(ZAXIS, roll), qBase);
  H3.group.scale.setScalar(S);
  // the middle of the palm stays put, whichever way the hand turns
  H3.group.position.copy(PALM_AT).sub(P.copy(H3.palm).multiplyScalar(S).applyQuaternion(H3.group.quaternion));
  H3.group.updateMatrixWorld(true);

  const p = handLife(t, h, REST, MOVES, { wristOf });
  // the handle, held across the palm: its size, and where it sits so it touches the palm
  const k = inHand(t), r = radius(t);
  let hold = null;
  if (k > 0) {
    P.set(-14 - r - (1 - E.out(k)) * 260, H3.palm.y + 3, 4);
    H3.group.localToWorld(P);
    A.set(0.12, -0.35, 1).applyQuaternion(H3.group.quaternion);
    bar.group.visible = true;
    bar.place(P, A, S);
    bar.group.children[0].scale.set(r, 1, r);
    bar.hold.r = r * S;
    hold = bar.hold;
  } else bar.group.visible = false;
  H3.sk.reset();
  H3.rig.pose(p, { hold });

  L.camera.position.set(0, 60, 1850); L.camera.lookAt(0, 60, 0);
  L.camera.near = 50; L.camera.far = 20000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(0, 0, 0);
  L.draw(ctx);
  grade(ctx, { edges: 0.18 });

  // the caption: what is being tested
  let cap = null, t0 = 0;
  for (const [at, text] of CAPTIONS) if (t >= at) { cap = text; t0 = at; }
  if (cap) {
    const next = CAPTIONS.find(([at]) => at > t0)?.[0] ?? TL.dur;
    const a = inOut(t, t0, 0.3, next - 0.35, 0.3);
    ctx.globalAlpha = a;
    ctx.font = '500 34px Roboto'; ctx.fillStyle = '#2E4755'; ctx.textAlign = 'left';
    ctx.fillText(cap, 90, H - 90);
    ctx.globalAlpha = 1;
  }
  const black = Math.max(1 - on(t, 0, 0.3), on(t, TL.dur - 0.5, 0.5));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
