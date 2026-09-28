// Ray in 3D: import { ray3d, rayPose, RAY_REST, RAY_EXPR } from '/@kit/characters/ray3d.js'.
// A grown-up warehouse lead, rigged for realistic movement rather than toon squash: one skeleton,
// and skinned meshes over it (rig3d.js) that bend at the shoulders, elbows, wrists, hips and knees
// as skin and cloth do, cel-shaded and inked like the rest of the cast.
//
// - Hands from hand3d.js: every finger joint, a thumb that opposes, grips that wrap what they hold.
// - Arms reach by IK; the forearm turns to face the palm where it is asked (split between a twist
//   bone and the wrist, so the forearm turns along its length), and the shoulders lift and come
//   forward with the arm.
// - The spine bends along its length, and the neck and head share a turn.
// - A face painted onto the head for the mouth (the 2D toon mouth, so lip-sync and expressions work
//   as for Pip), eyeballs that turn under lids, brows, and a jaw that drops as he talks.
//
// Units are millimetres: he is 1.76 m tall, feet on y = 0, facing +z at yaw 0; update(pose, { scale })
// sizes him for a scene (0.55 stands him about as tall as Pip). L is on the screen's left when he
// faces us, as for Pip.
//
// Pose keys: as pip3d's (yaw, body.turn, hips.x/y/z, torso.rx/ry/rz, head.rx, head.turn, head.r, the
// face's, handL.x/y/z and px/py/pz, footL.x/y/z ...), shoulderL.up to shrug, elbowL.x/y/z to move
// an elbow's pole, and hand3d's keys for each hand's fingers (handL.i1 ... handL.grasp).
import { clamp, lerp, TAU } from '../core.js';
import { add, choreo } from '../puppet.js';
import { blink, breath, glance, sway } from '../life.js';
import { loudness, mouth as lipsync } from '../lipsync.js';
import { springs } from '../spring.js';
import { paintedTexture, THREE } from '../scene3d.js';
import { attach, box, carve, cone, ell, field, ring, skeleton, skinned, smooth, turn } from '../rig3d.js';
import { HAND, handBones, handLife, handNails, handRig, handShape } from '../hand3d.js';
import { reach, solid, toon } from '../toon3d.js';
import { expressions, INK, mouth as drawMouth, NEUTRAL } from '../toon.js';

export const PAL = {
  skin: '#C98B64', nail: '#E2B196', blush: '#C46F57', hair: '#2B1F1B',
  shirt: '#2F6DB5', collar: '#22507F', pants: '#3A3F4A', boot: '#6E4528', sole: '#2B2420',
  iris: '#6A4526', irisDark: '#43291A', mouth: '#4A1427', tongue: '#D9707A', gum: '#D87880', lip: '#9E5646',
};

const UPPER = 295, FORE = 255, THIGH = 440, SHIN = 390;
const BIND = 0.61;                                        // at rest the arms hang 35 degrees out
const SIDES = [['L', -1], ['R', 1]];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

// A limb's rest turn, as toon3d's reach() would leave it: hanging along dir, bending towards pole.
function limbRest(dir, pole) {
  const U = V(...dir).normalize(), W = V(...pole);
  W.addScaledVector(U, -W.dot(U)).normalize();
  const X = new THREE.Vector3().crossVectors(W, U).normalize(), Y = U.clone().negate(), Z = new THREE.Vector3().crossVectors(X, Y).normalize();
  X.crossVectors(Y, Z).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}

function bones() {
  const list = [
    { name: 'hips', at: [0, 960, 0] },
    { name: 'spine1', parent: 'hips', at: [0, 60, 0] },
    { name: 'spine2', parent: 'spine1', at: [0, 125, 0] },
    { name: 'chest', parent: 'spine2', at: [0, 135, 0] },
    { name: 'neck', parent: 'chest', at: [0, 185, -8] },
    { name: 'head', parent: 'neck', at: [0, 75, 3] },
    { name: 'jaw', parent: 'head', at: [0, 42, 18] },
  ];
  for (const [S, s] of SIDES) {
    list.push({ name: `clav${S}`, parent: 'chest', at: [s * 22, 172, 30] });
    list.push({ name: `arm${S}`, parent: `clav${S}`, at: [s * 168, -17, -35], rest: limbRest([s * Math.sin(BIND), -Math.cos(BIND), 0], [0, 0, -1]) });
    list.push({ name: `elbow${S}`, parent: `arm${S}`, at: [0, -UPPER, 0] });
    list.push({ name: `twist${S}`, parent: `elbow${S}`, at: [0, -FORE / 2, 0] });
    // the hand turned so the palm faces in and the thumb forward, as the arm hangs
    list.push(...handBones(`hand${S}`, s, `twist${S}`, { at: [0, -FORE / 2, 0], rest: [0, Math.PI, 0] }));
    list.push({ name: `thigh${S}`, parent: 'hips', at: [s * 95, -45, 0] });
    list.push({ name: `knee${S}`, parent: `thigh${S}`, at: [0, -THIGH, 0] });
    list.push({ name: `foot${S}`, parent: `knee${S}`, at: [0, -SHIN, 0] });
    list.push({ name: `toe${S}`, parent: `foot${S}`, at: [0, -52, 138] });
  }
  return list;
}

// ---------- shapes ----------
const pantsShape = () => attach(26,
  smooth(30, ell('hips', [160, 100, 116], { at: [0, 15, 0] }), ...[-1, 1].map(s => ell('hips', [86, 88, 78], { at: [s * 66, -35, -42] }))),
  ...SIDES.map(([S]) => smooth(22,
    cone(`thigh${S}`, THIGH, 84, 62),
    ell(`knee${S}`, [57, 58, 60], { at: [0, 0, 6] }),
    cone(`knee${S}`, SHIN - 8, 61, 53),
    ell(`knee${S}`, [56, 24, 60], { at: [0, -SHIN + 30, 4] }),            // the hem, over the boot
  )),
);

// The torso is three rounded blocks, one on each bone of the spine, so it bends along its length, with
// a flat top at the neckline and a flat hem (many small blobs would shade as lumps, and capsules'
// round ends would climb the neck).
const shirtShape = () => attach(26,
  smooth(50,
    box('chest', [152, 106, 106], 62, { at: [0, 64, 6] }),
    box('spine2', [146, 92, 100], 56, { at: [0, 50, 8] }),
    box('spine1', [150, 82, 106], 56, { at: [0, 22, 8] }),
    ...SIDES.map(([S, s]) => ell(`clav${S}`, [96, 28, 58], { at: [s * 88, -14, -30], rot: [0, 0, -s * 0.28] })),   // the slope of the shoulders
  ),
  // short sleeves over the shoulders (the round top of each stays below the shoulder line)
  ...SIDES.map(([S]) => cone(`arm${S}`, 150, 55, 51, { at: [0, -12, 0] })),
);
const collarShape = () => ring('chest', 62, 10, { at: [0, 196, -4], rot: [0.26, 0, 0], scale: [1.05, 0.75, 1.08] });

// An arm, bare from inside the sleeve to the fingertips.
const armShape = (S, s) => handShape(`hand${S}`, s, {
  wrist: smooth(22,
    cone(`arm${S}`, 175, 44, 39, { at: [0, -125, 0] }),
    ell(`elbow${S}`, [36, 40, 38]),
    ell(`elbow${S}`, [17, 22, 15], { at: [0, -4, 27] }),                    // the point of the elbow
    cone(`elbow${S}`, FORE / 2 + 6, 41, 34, { scale: [0.82, 1, 1] }),
    cone(`twist${S}`, FORE / 2, 34, 26, { scale: [0.72, 1, 1] }),
  ),
});

const bootShape = S => smooth(14,
  ell(`foot${S}`, [50, 62, 54], { at: [0, 2, -6] }),
  box(`foot${S}`, [48, 36, 100], 26, { at: [0, -46, 48] }),
  ell(`toe${S}`, [47, 32, 50], { at: [0, 6, 24] }),
  box(`foot${S}`, [52, 8, 122], 6, { at: [0, -77, 56] }),
);

const headShape = () => smooth(12,
  cone('neck', 130, 50, 56, { at: [0, 95, 0], scale: [1, 1, 0.94] }),
  smooth(26,
    ell('head', [80, 102, 98], { at: [0, 108, -8] }),                      // the skull
    ell('head', [64, 80, 66], { at: [0, 72, 34] }),                        // the face
    ell('head', [58, 12, 14], { at: [0, 122, 86] }),                       // the brow
    ell('jaw', [60, 36, 52], { at: [0, -20, 18] }),
    ell('jaw', [22, 16, 16], { at: [0, -38, 56] }),                        // the chin
  ),
  smooth(14,
    ell('head', [10, 24, 12], { at: [0, 82, 96], rot: [-0.3, 0, 0] }),     // the nose
    ell('head', [13, 11, 12], { at: [0, 62, 104] }),
    ...[-1, 1].map(s => ell('head', [9, 8, 9], { at: [s * 13, 58, 97] })),
  ),
  ...[-1, 1].map(s => ell('head', [8, 27, 16], { at: [s * 77, 82, -6], rot: [0, s * 0.35, 0] })),   // ears
);

const hairShape = () => carve(10,
  ell('head', [86, 102, 104], { at: [0, 114, -12] }),
  ell('head', [98, 82, 78], { at: [0, 86, 94] }),                          // the face and forehead
  box('head', [130, 50, 140], 4, { at: [0, 42, 0] }),                      // below the temples
);

// ---------- the face ----------
const EYE = { r: 15, at: [31, 97, 86] };
const irisTexture = () => paintedTexture(512, 256, (g, w, h, pupil = 1) => {
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
  const x = w * 0.25, y = h / 2;
  g.fillStyle = PAL.irisDark; g.beginPath(); g.ellipse(x, y, 50, 50, 0, 0, TAU); g.fill();
  g.fillStyle = PAL.iris; g.beginPath(); g.ellipse(x, y + 4, 43, 43, 0, 0, TAU); g.fill();
  g.fillStyle = '#1A1210'; g.beginPath(); g.ellipse(x, y, 22 * pupil, 22 * pupil, 0, 0, TAU); g.fill();
  g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(x + 16, y - 15, 10, 10, 0, 0, TAU); g.fill();
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, 50, 50, 0, 0, TAU); g.stroke();
});
// The mouth and cheeks, painted onto the front of the face: x -64..64, y 0..96 above the head joint.
const FACE = { x0: -64, x1: 64, y0: 0, y1: 96, px: 4 };
const faceTexture = () => paintedTexture((FACE.x1 - FACE.x0) * FACE.px, (FACE.y1 - FACE.y0) * FACE.px, (g, w, h, pose = {}) => {
  const at = (x, y) => [(x - FACE.x0) * FACE.px, (FACE.y1 - y) * FACE.px];
  g.fillStyle = PAL.skin; g.fillRect(0, 0, w, h);
  g.fillStyle = PAL.blush; g.globalAlpha = 0.12 + 0.2 * clamp(pose['mood.smile'] ?? 0);
  for (const s of [-1, 1]) { const [x, y] = at(s * 40, 52); g.beginPath(); g.ellipse(x, y, 13 * FACE.px, 7 * FACE.px, 0, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  const jaw = clamp((pose['mouth.open'] ?? 0) * 0.55 + (pose.jaw ?? 0), 0, 1.4) * 30;
  const [mx, my] = at(0, 34);
  g.save(); g.translate(mx, my); g.scale(0.72 * FACE.px, 0.72 * FACE.px);
  drawMouth(g, pose, jaw * 0.6, { y: 0, pal: PAL });
  g.restore();
});

// ---------- the model ----------
export function ray3d(layer) {
  const root = new THREE.Group(); layer.scene.add(root);
  const facing = new THREE.Group(); root.add(facing);
  const sk = skeleton(facing, bones());
  const B = sk.by;
  const M = {
    skin: toon(PAL.skin), shirt: toon(PAL.shirt), collar: toon(PAL.collar), pants: toon(PAL.pants), hair: toon(PAL.hair),
    boot: toon('#FFFFFF', { vertexColors: true }),
  };
  const HEAD_AT = V(0, 1540, -5);
  const faceTex = faceTexture();
  M.face = new THREE.MeshToonMaterial({ map: faceTex, gradientMap: M.skin.gradientMap });
  const t0 = performance.now();
  skinned(sk, pantsShape(), M.pants, { cell: 4.4, soft: 16, key: 'ray-pants' });
  skinned(sk, shirtShape(), M.shirt, { cell: 4.2, soft: 16, key: 'ray-shirt' });
  skinned(sk, collarShape(), M.collar, { cell: 2.2, soft: 8, ink: 2, key: 'ray-collar' });
  for (const [S, s] of SIDES) {
    skinned(sk, armShape(S, s), M.skin, { cell: 1.9, soft: 5, key: `ray-arm${S}` });
    handNails(sk, `hand${S}`, s, PAL.nail);
    const [bc, sc] = [new THREE.Color(PAL.boot), new THREE.Color(PAL.sole)].map(c => c.convertSRGBToLinear());
    skinned(sk, bootShape(S), M.boot, { cell: 2.6, soft: 8, key: `ray-boot${S}`, colors: (x, y) => (y < 17 ? sc : bc).toArray() });
  }
  const head = headShape();
  skinned(sk, head, M.face, {
    cell: 2, soft: 7, key: 'ray-head',
    // the front of the face takes the painted texture; everything else a corner of it, bare skin
    uvs: (x, y, z, nx, ny, nz) => {
      const hx = x - HEAD_AT.x, hy = y - HEAD_AT.y, hz = z - HEAD_AT.z;
      if (hz < 25 || nz < 0.1) return [0.004, 0.004];
      return [clamp((hx - FACE.x0) / (FACE.x1 - FACE.x0), 0.004, 0.996), clamp((hy - FACE.y0) / (FACE.y1 - FACE.y0), 0.004, 0.996)];
    },
  });
  skinned(sk, hairShape(), M.hair, { cell: 2.4, soft: 6, key: 'ray-hair' });
  const ms = performance.now() - t0;                        // about 5 s: his meshes are made as the page loads

  // the eyes, on the head: eyeballs under lids, with lash lines
  const LASH = new THREE.MeshBasicMaterial({ color: INK });
  const eyes = SIDES.map(([S, s]) => {
    const shape = new THREE.Group();
    shape.position.set(s * EYE.at[0], EYE.at[1], EYE.at[2]);
    shape.scale.set(1.05, 0.9, 0.9);
    B.head.add(shape);
    const tex = irisTexture();
    const eyeball = solid(new THREE.SphereGeometry(EYE.r, 40, 24), new THREE.MeshToonMaterial({ map: tex, gradientMap: M.skin.gradientMap }), { ink: 2 });
    shape.add(eyeball);
    const upper = solid(new THREE.SphereGeometry(EYE.r * 1.08, 40, 16, 0, TAU, 0, Math.PI / 2), M.skin, { ink: 2.6 });
    const lower = solid(new THREE.SphereGeometry(EYE.r * 1.065, 40, 16, 0, TAU, Math.PI / 2, Math.PI / 2), M.skin, { ink: 1.6 });
    shape.add(upper, lower);
    const rim = (r, w) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 17 }, (_, i) => {
      const a = 0.15 + (i / 16) * (Math.PI - 0.3); return V(-Math.cos(a) * r, 0, Math.sin(a) * r);
    })), 32, w, 8), LASH);
    upper.add(rim(EYE.r * 1.1, 1.5)); lower.add(rim(EYE.r * 1.075, 0.7));
    return { s, S, eyeball, upper, lower, tex, pupil: 1 };
  });
  // the brows, laid on the brow's surface
  const f = field(sk, head);
  const onFace = (x, y) => { let z = 160; while (z > 0 && f(x, y + HEAD_AT.y, z + HEAD_AT.z) > 0) z -= 0.5; return z; };
  const brows = SIDES.map(([S, s]) => {
    const pivot = new THREE.Group(); pivot.position.set(0, 100, -10); B.head.add(pivot);
    const pts = [-26, -8, 10, 26].map((dx, i) => { const x = s * (31 + dx), y = 124 + [0, 5, 5, 1][i]; return V(x, y - 100, onFace(x, y) + 3 + 10); });
    const b = solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 4.2, 10), M.hair, { ink: 1.8 });
    const g = new THREE.Group(); g.add(b); pivot.add(g);
    return { s, S, g, b };
  });

  const W = V(0, 0, 0), Pole = V(0, 0, 0), N0 = V(0, 0, 0), AX = V(0, 0, 0), PD = V(0, 0, 0), T = V(0, 0, 0);
  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), YAXIS = V(0, 1, 0);
  const rigs = Object.fromEntries(SIDES.map(([S, s]) => [S, handRig(sk, `hand${S}`, s)]));
  return {
    root, sk, bones: B, rigs, meshMs: ms,
    // between the world and his own space (origin between his feet, y up, z where he faces, mm)
    local(v) { facing.updateWorldMatrix(true, false); return facing.worldToLocal(v.clone()); },
    world(v) { facing.updateWorldMatrix(true, false); return facing.localToWorld(v.clone()); },
    // the pad of a finger (0 index .. 3 little, or 't'), and the middle of the palm, in the world
    pad(S, f, v) { return rigs[S].pad(f, v); },
    palm(S, v = V(0, 0, 0)) { const h = B[`hand${S}`]; h.updateWorldMatrix(true, false); return v.set(0, -62, 0).applyMatrix4(h.matrixWorld); },
    // pose him. hold: { L, R } what each hand holds (see hand3d's handRig), for grasp
    update(p, { x = 0, y = 0, z = 0, scale = 0.55, hold = {} } = {}) {
      const g = (k, d = 0) => p[k] ?? d;
      sk.reset();
      root.position.set(x, -y, z); root.scale.setScalar(scale);
      facing.rotation.y = g('yaw') + g('body.turn') * 0.8;
      // bending forward (or crouching), the hips go back to keep his weight over his feet
      const lean = Math.max(0, g('torso.rx')) * 150 + Math.max(0, -g('hips.y')) * 0.25;
      B.hips.position.set(g('hips.x'), 960 + g('hips.y'), g('hips.z') - lean);
      turn(B.hips, g('hips.rx'), g('hips.ry'), -g('hips.rz'), 'YXZ');
      // the spine bends along its length
      const tr = [g('torso.rx'), g('torso.ry'), -g('torso.rz') - g('torso.r')];
      [['spine1', 0.3], ['spine2', 0.35], ['chest', 0.35]].forEach(([n, k]) => turn(B[n], tr[0] * k, tr[1] * k, tr[2] * k, 'YXZ'));
      const hd = [g('head.rx'), g('head.turn') * 0.62, -g('head.r')];
      turn(B.neck, hd[0] * 0.4, hd[1] * 0.4, hd[2] * 0.4, 'YXZ');
      turn(B.head, hd[0] * 0.6, hd[1] * 0.6, hd[2] * 0.6, 'YXZ');
      turn(B.jaw, clamp(g('mouth.open') * 0.55 + g('jaw'), 0, 1.4) * 0.13, 0, 0);
      root.updateMatrixWorld(true);

      // legs: IK to the feet, knees forward, the boots kept flat and a little turned out
      for (const [S, s] of SIDES) {
        W.set(g(`foot${S}.x`, s * 100), g(`foot${S}.y`, 85), g(`foot${S}.z`, 8)); facing.localToWorld(W);
        Pole.set(s * 60, 520, 700); facing.localToWorld(Pole);
        reach(B[`thigh${S}`], B[`knee${S}`], THIGH, SHIN, W, Pole);
        B[`knee${S}`].updateWorldMatrix(true, false);
        B[`knee${S}`].getWorldQuaternion(q); facing.getWorldQuaternion(q2);
        B[`foot${S}`].quaternion.copy(q.invert().multiply(q2));
        B[`foot${S}`].rotateY(s * 0.12);
      }
      // arms: the shoulder first (it lifts as the hand rises, and comes forward as it reaches), then
      // IK to the wrist, then the forearm turns the palm to face where it should
      for (const [S, s] of SIDES) {
        const hx = g(`hand${S}.x`, s * 215), hy = g(`hand${S}.y`, 905), hz = g(`hand${S}.z`, 35);
        const lift = 0.3 * sstep(-0.25, 1, (hy - g('hips.y') - 1435) / 550) + g(`shoulder${S}.up`) * 0.25;
        const fwd = 0.18 * clamp(hz / 550, -0.3, 1);
        turn(B[`clav${S}`], 0, -s * fwd, s * lift, 'YXZ');
        B[`clav${S}`].updateMatrixWorld(true);
        W.set(hx, hy, hz); facing.localToWorld(W);
        // where the elbow points: back for a hand hanging low, down and a little out for one in front
        // of the chest, out to the side for one overhead (from the shoulder, in his own space)
        // (a hand held up in front, to count or to show something, keeps its elbow down)
        const u = sstep(850, 1750, hy - g('hips.y')), k1 = clamp(u * 2), k2 = clamp(u * 2 - 1) * (1 - 0.85 * sstep(80, 380, hz) * (1 - sstep(1600, 1850, hy - g('hips.y'))));
        const ex = lerp(lerp(250, 380, k1), 640, k2), ey = lerp(lerp(-600, -560, k1), 150, k2), ez = lerp(lerp(-450, -140, k1), 60, k2);
        Pole.set(s * (190 + ex) + g(`elbow${S}.x`), 1435 + ey + g('hips.y') + g(`elbow${S}.y`), ez + g(`elbow${S}.z`));
        facing.localToWorld(Pole);
        reach(B[`arm${S}`], B[`elbow${S}`], UPPER, FORE, W, Pole);
        // turn the forearm: the palm (local -s x) towards (px, py, pz), half at the twist bone and
        // half at the wrist
        const hand = B[`hand${S}`], tw = B[`twist${S}`];
        hand.updateWorldMatrix(true, false);
        N0.set(-s, 0, 0).transformDirection(hand.matrixWorld);
        AX.set(0, -1, 0).transformDirection(tw.matrixWorld);
        PD.set(g(`hand${S}.px`, -s), g(`hand${S}.py`), g(`hand${S}.pz`));
        if (PD.lengthSq() < 1e-6) PD.copy(N0); else PD.transformDirection(facing.matrixWorld);
        N0.addScaledVector(AX, -N0.dot(AX)); PD.addScaledVector(AX, -PD.dot(AX));
        const th = clamp(Math.atan2(T.crossVectors(N0, PD).dot(AX), N0.dot(PD)), -2.5, 2.5);
        tw.quaternion.setFromAxisAngle(YAXIS, -th / 2);
        rigs[S].pose({ ...p, [`hand${S}.roll`]: -th / 2 + g(`hand${S}.roll`) }, { hold: hold[S] });
      }
      // the face
      const open = clamp(g('eyes.open', 1)), squint = clamp(g('eyes.squint'));
      for (const E of eyes) {
        E.eyeball.rotation.set(g('eyes.y') * 0.35, g('eyes.x') * 0.5, 0, 'YXZ');
        const cover = clamp(Math.max(g('eyes.blink'), g('lids.drop') + g(`lid${E.S}.drop`), 1 - Math.min(open * g(`eye${E.S}.open`, 1), 1)));
        const wide = Math.max(0, open - 1);
        E.upper.rotation.set(lerp(-1.35 - wide * 0.3, 1.45, cover), 0, E.s * clamp(g('lids.slant') + g(`lid${E.S}.slant`), -1, 1) * -0.3);
        E.lower.rotation.set(lerp(1.3, -0.15, squint), 0, 0);
        const pupil = Math.round(g('eyes.pupil', 1) * 10) / 10;
        if (pupil !== E.pupil) { E.pupil = pupil; E.tex.redraw(pupil); }
      }
      for (const Bw of brows) {
        const up = g('brows.up') + g(`brow${Bw.S}.up`), slant = clamp(g('brows.in') + g(`brow${Bw.S}.slant`), -1.2, 1.2);
        Bw.g.rotation.set(-up * 0.09, 0, -Bw.s * slant * 0.12);
      }
      faceTex.redraw(p);
    },
  };
}

// ---------- bringing him to life ----------
export const RAY_REST = {
  ...NEUTRAL, 'mood.smile': 0.15,
  'handL.x': -215, 'handL.y': 905, 'handL.z': 35, 'handR.x': 215, 'handR.y': 905, 'handR.z': 35,
  'handL.px': 1, 'handL.py': 0, 'handL.pz': 0.2, 'handR.px': -1, 'handR.py': 0, 'handR.pz': 0.2,
  'footL.x': -100, 'footL.y': 85, 'footL.z': 8, 'footR.x': 100, 'footR.y': 85, 'footR.z': 8,
  ...HAND.relaxed('handL'), ...HAND.relaxed('handR'),
  'handL.touchF': 0, 'handR.touchF': 0, 'handL.flex': 0, 'handL.dev': 0, 'handR.flex': 0, 'handR.dev': 0,
};
export const RAY_EXPR = expressions({ ...NEUTRAL, 'mood.smile': 0.15 });
const HANDF = { stiffness: 150, damping: 17 }, BODY = { stiffness: 110, damping: 15 }, HEAD = { stiffness: 150, damping: 15 }, PALM = { stiffness: 200, damping: 22 };
const JOINTS = Object.fromEntries([
  ...['handL', 'handR'].flatMap(h => [[`${h}.x`, HANDF], [`${h}.y`, HANDF], [`${h}.z`, HANDF], [`${h}.px`, PALM], [`${h}.py`, PALM], [`${h}.pz`, PALM]]),
  ['head.rx', HEAD], ['head.turn', HEAD], ['head.r', HEAD], ['torso.rx', BODY], ['torso.ry', BODY], ['torso.rz', BODY],
  ['hips.x', BODY], ['hips.y', BODY], ['yaw', BODY], ['body.turn', BODY], ['shoulderL.up', BODY], ['shoulderR.up', BODY],
]);

// Ray at time t, from moves (as for choreo): springs on his hands, body and head; breathing, weight
// shifting from foot to foot, blinking, glancing, the eyes leading the head; lip-sync to his lines;
// and fingers that move one after another and trail his hands (hand3d's handLife).
export function rayPose(t, moves, { speaker, extra, seed = 5, id = 'ray3d' } = {}) {
  const chore = u => {
    const q = choreo(u, RAY_REST, moves);
    q['head.turn'] = (q['head.turn'] ?? 0) + (q['eyes.x'] ?? 0) * 0.45;
    return q;
  };
  let p = chore(t);
  Object.assign(p, springs(`${id}.joints`, t, chore, JOINTS));
  for (const [S, sd] of [['L', 2], ['R', 7]]) {
    const h = `hand${S}`;
    Object.assign(p, handLife(t, h, RAY_REST, moves, { id: `${id}.${h}`, seed: sd, wristOf: u => (chore(u)[`${h}.y`] ?? 905) / -600 }));
  }
  if (extra) p = add(p, extra(t));
  const br = breath(t, seed), sw = sway(t, seed);
  p = add(p, { 'hips.x': sw * 14, 'torso.rz': sw * 0.018, 'head.r': -sw * 0.02, 'torso.rx': br * 0.006, 'shoulderL.up': br * 0.06, 'shoulderR.up': br * 0.06, 'handL.y': br * 2, 'handR.y': br * 2 });
  const gl = glance(t, seed);
  p['eyes.x'] = (p['eyes.x'] ?? 0) + gl[0] * 0.3; p['eyes.y'] = (p['eyes.y'] ?? 0) + gl[1] * 0.3;
  p['eyes.blink'] = Math.max(p['eyes.blink'] ?? 0, blink(t, seed));
  const mo = lipsync(t, { speaker });
  for (const [k, val] of Object.entries(mo)) p[`mouth.${k}`] = val;
  const talk = loudness(t) * (mo.open > 0.05 ? 1 : 0);
  p['head.rx'] = (p['head.rx'] ?? 0) + Math.sin(t * 8 + seed) * 0.018 * talk;
  return p;
}
