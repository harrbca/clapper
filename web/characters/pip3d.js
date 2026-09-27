// Pip in 3D: import { pip3d, pip3dPose, EXPR3, REST3 } from '/@kit/characters/pip3d.js'.
// The same girl as characters/pip.js, cel-shaded and inked, with a rig: IK hands and feet, a head
// that turns and nods, eyeballs that look about under lids that blink and squint, brows, a mouth
// painted onto her face by the same code (and lip-sync, and expressions) as the 2D Pip, a bob cut,
// and a ponytail that swings.
//
// Units are 2D pixels, y up; she stands about 910 tall, feet on y = 0, facing +z (the camera) at yaw 0.
// pip3d(layer).update(pose, { x, y, z, scale }) stands her at the 2D point (x, y), z towards us.
//
// Pose keys, besides the face's (eyes.x/y, eyes.blink, eyes.open, eyes.squint, lids.drop, lids.slant,
// brows.up, brows.in, browL.up ..., mood.smile, mouth.*, jaw, as in toon.js):
//   yaw (radians; body.turn -1..1 turns 3/4 as the 2D one does), hips.x/y/z, torso.rx/ry/rz (lean,
//   twist, side bend), head.rx (nod), head.turn, head.r (tilt), handL.x/y/z and handR.x/y/z (where
//   the wrists go, in her own space: origin between her feet, y up, z forward), handL.form (0 open,
//   1 point, 2 fist, 3 thumbs up, 4 relaxed, 5 grip, 6 pinch), handL.px/py/pz (which way the palm
//   faces), handL.palm (roll), handL.bend (wrist), footL.x/y/z ...
import { clamp, lerp, TAU } from '../core.js';
import { add, choreo } from '../puppet.js';
import { blink, breath, glance, sway } from '../life.js';
import { loudness, mouth as lipsync } from '../lipsync.js';
import { lag, springs } from '../spring.js';
import { paintedTexture, THREE } from '../scene3d.js';
import { ball, joint, limbGeometry, reach, roundBox, solid, toon } from '../toon3d.js';
import { expressions, INK, mouth as drawMouth, NEUTRAL } from '../toon.js';
import { PAL } from './pip.js';

const HEAD_R = 146, HC = 145;
const LASH = new THREE.MeshBasicMaterial({ color: INK });                   // the head's radius, and its centre above the head joint
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

// ---------- the face ----------
// Features sit on the head's surface: at azimuth az (0 is the front, + towards her left, the screen's
// right) and height y. surface() gives a pivot at the head's centre whose +z points there.
function surface(head, az, y) {
  const e = Math.asin(clamp((y - HC) / HEAD_R, -1, 1));
  const p = joint(head, [0, HC, 0]);
  p.rotation.set(-e, az, 0, 'YXZ');
  return p;
}

// The iris and pupil, painted on the eyeball where its front is (u 0.25, v 0.5).
const irisTexture = () => paintedTexture(512, 256, (g, w, h, pupil = 1) => {
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
  const x = w * 0.25, y = h / 2;
  g.fillStyle = '#2C5290'; g.beginPath(); g.ellipse(x, y, 46, 46, 0, 0, TAU); g.fill();
  g.fillStyle = '#3F70B8'; g.beginPath(); g.ellipse(x, y + 4, 40, 40, 0, 0, TAU); g.fill();
  g.fillStyle = '#1A1426'; g.beginPath(); g.ellipse(x, y, 22 * pupil, 22 * pupil, 0, 0, TAU); g.fill();
  g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(x + 16, y - 14, 11, 11, 0, 0, TAU); g.fill();
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, 46, 46, 0, 0, TAU); g.stroke();
});

// The mouth and cheeks, painted onto a patch of the face below the eyes.
const PATCH = { phi0: Math.PI / 2 - 0.85, phiLen: 1.7, th0: Math.PI / 2 + 0.1, thLen: 0.85, w: 640, h: 320 };
function patchPoint(x, y) {                     // a point on the face (head space) to the patch's canvas
  const e = Math.asin(clamp((y - HC) / HEAD_R, -1, 1)), a = Math.asin(clamp(x / (HEAD_R * Math.cos(e)), -1, 1));
  return [((Math.PI / 2 + a - PATCH.phi0) / PATCH.phiLen) * PATCH.w, ((Math.PI / 2 - e - PATCH.th0) / PATCH.thLen) * PATCH.h];
}
const mouthTexture = () => paintedTexture(PATCH.w, PATCH.h, (g, w, h, pose = {}) => {
  // canvas pixels per unit round the mouth, across and down (the patch stretches a little across)
  const kx = w / PATCH.phiLen / (HEAD_R * Math.cos(0.5)), ky = h / PATCH.thLen / HEAD_R;
  g.fillStyle = PAL.blush; g.globalAlpha = 0.85;
  for (const s of [-1, 1]) { const [x, y] = patchPoint(s * 84, 98); g.beginPath(); g.ellipse(x, y, 24 * kx, 13 * ky, 0, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  const jaw = clamp((pose['mouth.open'] ?? 0) * 0.55 + (pose.jaw ?? 0), 0, 1.4) * 30;
  const [mx, my] = patchPoint(0, 74);
  g.save(); g.translate(mx, my); g.scale(kx * 1.08, ky * 1.08);
  drawMouth(g, pose, jaw * 0.6, { y: 0, pal: PAL });
  g.restore();
});

// ---------- hair ----------
// A bob: a shell round the head, tucked in where the face shows and below the jaw, flaring a little
// at the bottom, with a fringe swept up towards her left.
function hairGeometry() {
  const R = 160, c = V(0, HC + 6, -6), geo = new THREE.SphereGeometry(R, 200, 150), pos = geo.attributes.position;
  // the hair's lower edge, all the way round: the fringe across the face, the jaw at the sides, and
  // longer behind, where the skull comes down lower
  const edgeAt = a => {
    const front = smooth(1.3, 0.95, Math.abs(a)), back = smooth(1.4, 2.6, Math.abs(a));
    const fringe = 212 + 46 * smooth(-0.7, 0.8, a) - 14 * Math.exp(-(((a - 0.2) / 0.25) ** 2));
    return lerp(lerp(58, 14, back), fringe, front);
  };
  for (let i = 0; i < pos.count; i++) {
    const d = V(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    const y = c.y + d.y * R, a = Math.atan2(d.x, d.z), across = R * Math.max(0.2, Math.hypot(d.x, d.z));
    // how far below the edge, measured square to it (so steep parts of the edge stay smooth too)
    const edge = edgeAt(a), slope = (edgeAt(a + 0.01) - edgeAt(a - 0.01)) / 0.02 / across;
    const below = (edge - y) / Math.sqrt(1 + slope * slope);
    const tuck = smooth(-6, 6, below);
    const flare = 1 + 0.07 * smooth(175, 75, y) * (1 - smooth(1.3, 0.95, Math.abs(a)));
    const r = lerp(R * flare, HEAD_R * 0.8, tuck);
    pos.setXYZ(i, c.x + d.x * r, c.y + d.y * r, c.z + d.z * r);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------- hands ----------
// Four fingers and a thumb. The palm faces in towards her side at rest, fingers down, thumb forward.
// Each finger bends at two knuckles: [[base, middle] for each finger, index first], then the thumb.
const F4 = (a, b) => [[a, b], [a, b], [a, b], [a, b]];
const CURLS = [
  [F4(0.08, 0.05), 0.05],                                              // 0 open
  [[[0, 0.03], [1.5, 1.6], [1.5, 1.6], [1.5, 1.6]], 1.0],             // 1 pointing
  [F4(1.5, 1.6), 1.1],                                                 // 2 fist
  [F4(1.5, 1.6), -0.7],                                                // 3 thumbs up
  [[[0.22, 0.2], [0.28, 0.26], [0.34, 0.3], [0.4, 0.36]], 0.35],       // 4 relaxed
  [F4(0.8, 1.05), 'grip'],                                             // 5 closed round a handle (see GRIP)
  [[[0.35, 0.35], [0.5, 0.45], [1.35, 1.45], [1.45, 1.5]], 0.7],       // 6 pinching something flat against the thumb
];
// Where a handle sits in a hand closed with form 5, in the hand's own space (for side +1; mirror x
// for side -1): it runs along z, touching the palm, the fingers wrapped round it. Props use it.
export const GRIP = { at: [-24, -40.7, 0], radius: 11, scale: 1.2 };

const WQ = new THREE.Quaternion();
function buildHand(wrist, side, skin) {
  const hand = joint(wrist);
  hand.scale.setScalar(GRIP.scale);
  const palm = solid(ball(24, 32), skin, { ink: 2.2 }); palm.scale.set(0.58, 1.08, 1.12); palm.position.y = -26; hand.add(palm);
  const fingers = [19.5, 6.5, -6.5, -19.5].map((z, i) => {
    const len = [36, 39, 37, 31][i], a = len * 0.54, b = len * 0.46;
    const base = joint(hand, [-side * 6, -45, z]);
    base.add(solid(limbGeometry(a, 6.3, 6, 16), skin, { ink: 2 }));
    const mid = joint(base, [0, -a, 0]);
    mid.add(solid(limbGeometry(b, 6, 5.6, 16), skin, { ink: 2 }));
    return { base, mid, b };
  });
  const thumb = joint(hand, [side * 3, -16, 17]);
  thumb.add(solid(limbGeometry(24, 7.8, 7, 16), skin, { ink: 2 }));
  const T1 = new THREE.Vector3(), T2 = new THREE.Vector3();
  return {
    hand,
    // Between the tips of the thumb and the index finger, in the world: where a pinched thing is held.
    pinch(v = new THREE.Vector3()) {
      hand.updateWorldMatrix(true, true);
      fingers[0].mid.localToWorld(T1.set(0, -fingers[0].b + 4, 0));
      thumb.localToWorld(T2.set(0, -20, 0));
      return v.addVectors(T1, T2).multiplyScalar(0.5);
    },
    // The tip of the index finger, in the world.
    tip(v = new THREE.Vector3()) { hand.updateWorldMatrix(true, true); return fingers[0].mid.localToWorld(v.set(0, -fingers[0].b - 5, 0)); },
    // form, and which way the palm faces: palm (a direction in the world, or null to leave it), then
    // an extra roll and a bend at the wrist
    pose(form, palm, roll, bend) {
      const [curls, th] = CURLS[clamp(Math.round(form), 0, CURLS.length - 1)];
      const splay = Math.round(form) === 0 ? 0.14 : 0.04;               // open fingers fan out
      fingers.forEach((f, i) => {
        f.base.rotation.set((1.5 - i) * splay, 0, -side * curls[i][0], 'ZXY');
        f.mid.rotation.set(0, 0, -side * curls[i][1]);
      });
      if (th === 'grip') thumb.rotation.set(0, 0, -side * 1.37);          // over the top of the handle
      else thumb.rotation.set(th < 0 ? -1.65 : -0.6 - th * 0.3, 0, th < 0 ? -side * 0.25 : -side * th * 0.9);   // thumbs up: square to the fingers
      let twist = 0;
      if (palm) {                               // turn round the forearm so the palm (local -side x) faces it
        wrist.getWorldQuaternion(WQ);
        const n = palm.clone().applyQuaternion(WQ.invert());
        twist = Math.atan2(n.z * side, -n.x * side);
      }
      hand.rotation.set(bend, twist + side * roll, 0, 'YXZ');
    },
  };
}

// ---------- the model ----------
// Options: vest: true dresses her in a hi-vis safety vest over the sweater.
export function pip3d(layer, { vest = false } = {}) {
  const M = {
    skin: toon(PAL.skin), hair: toon(PAL.hair), top: toon(PAL.top), cuff: toon(PAL.cuff), pants: toon(PAL.pants),
    shoe: toon(PAL.shoe), sole: toon(PAL.sole), tie: toon(PAL.tie), white: toon('#FFFFFF'), pin: toon('#1B2330'),
  };
  const root = new THREE.Group(); layer.scene.add(root);
  const facing = joint(root);
  const hips = joint(facing, [0, 360, 0]);

  // hips and legs: navy trousers, and trainers that stay flat on the floor
  const seat = solid(ball(84, 40), M.pants); seat.scale.set(1, 0.6, 0.72); seat.position.y = -30; hips.add(seat);
  const legs = [-1, 1].map(s => {
    const thigh = joint(hips, [s * 44, -12, 0]);
    thigh.add(solid(limbGeometry(160, 33, 29), M.pants));
    const knee = joint(thigh, [0, -160, 0]);
    knee.add(solid(limbGeometry(150, 29, 25), M.pants));
    const ankle = joint(knee, [0, -150, 0]);
    // a trainer: a rounded upper, and a sole that is the same shape squashed flat and a touch bigger,
    // so it follows the upper's outline as a band round the bottom; the floor is at -42
    const shoe = roundBox(60, 50, 100, 22);
    const upper = solid(shoe, M.shoe); upper.position.set(0, -15, 22); ankle.add(upper);
    const sole = solid(shoe, M.sole, { ink: 1.6 }); sole.scale.set(1.035, 0.3, 1.025); sole.position.set(0, -34.5, 22); ankle.add(sole);
    return { s, thigh, knee, ankle };
  });

  // the sweater: a lathe, oval in section, with a ribbed hem and neckline and a pin on the chest
  const torso = joint(hips);
  const prof = [[0.01, -40], [74, -36], [88, -14], [89, 20], [86, 80], [92, 150], [97, 190], [91, 224], [70, 244], [40, 252], [0.01, 255]];
  const body = solid(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 64), M.top);
  body.scale.z = 0.72; torso.add(body);
  const ring = (r, tube, y, mat) => { const m = solid(new THREE.TorusGeometry(r, tube, 12, 64), mat, { ink: 2 }); m.rotation.x = Math.PI / 2; m.scale.set(1, 0.72, 1); m.position.y = y; torso.add(m); return m; };
  ring(84, 9, -26, M.cuff);
  ring(36, 7, 247, M.cuff);
  if (vest) {                               // hi-vis, with two reflective bands and a zip
    const vp = [[96, -24], [95, 20], [92, 80], [98, 150], [103, 190], [97, 222], [78, 240], [54, 248], [50, 246]];
    const shell = solid(new THREE.LatheGeometry(vp.map(([r, y]) => new THREE.Vector2(r, y)), 64), toon('#D6EE1F', { side: THREE.DoubleSide }));
    shell.scale.z = 0.74; torso.add(shell);
    for (const y of [70, 128]) {
      const band = solid(new THREE.CylinderGeometry(94.5 + (y > 100 ? 3 : 0), 94.5 + (y > 100 ? 3 : 0), 18, 64, 1, true), toon('#E6EBEF', { side: THREE.DoubleSide }), { ink: 0 });
      band.scale.z = 0.745; band.position.y = y; torso.add(band);
    }
    const zip = solid(roundBox(6, 250, 4, 2), toon('#8A9A18'), { ink: 0 }); zip.position.set(0, 112, 71); torso.add(zip);
  }
  const pin = new THREE.Group(); pin.position.set(-46, 176, 64); pin.rotation.y = -0.45; torso.add(pin);
  pin.visible = !vest;
  { const b = solid(roundBox(30, 22, 6, 3), M.pin, { ink: 1.6 }); pin.add(b); const top = solid(roundBox(30, 8, 7, 2), M.tie, { ink: 1.6 }); top.position.y = 15; top.rotation.z = -0.12; pin.add(top); }

  // arms, from the shoulders: sleeves with cuffs, and hands
  const arms = [-1, 1].map(s => {
    const shoulder = joint(torso, [s * 86, 214, 0]);
    shoulder.add(solid(limbGeometry(130, 27, 23), M.top));
    const elbow = joint(shoulder, [0, -130, 0]);
    elbow.add(solid(limbGeometry(118, 23, 20), M.top));
    const cuffRing = solid(new THREE.TorusGeometry(20, 6, 10, 32), M.cuff, { ink: 2 }); cuffRing.rotation.x = Math.PI / 2; cuffRing.position.y = -104; elbow.add(cuffRing);
    const wrist = joint(elbow, [0, -118, 0]);
    return { s, shoulder, elbow, wrist, hand: buildHand(wrist, s, M.skin) };
  });

  // neck and head
  const neckJ = joint(torso, [0, 240, 0]);
  const neck = solid(limbGeometry(40, 25, 25), M.skin, { ink: 2 }); neck.rotation.x = Math.PI; neckJ.add(neck);
  const head = joint(neckJ, [0, 30, 0]);
  const skull = solid(ball(HEAD_R, 72), M.skin); skull.position.y = HC; head.add(skull);

  const eyes = [-1, 1].map(s => {
    const pivot = surface(head, s * 0.42, 148);
    const shape = joint(pivot, [0, 0, HEAD_R - 21]);
    shape.scale.set(1.1, 1.3, 0.8);
    const tex = irisTexture();
    const eyeball = solid(ball(34, 48), new THREE.MeshToonMaterial({ map: tex, gradientMap: M.skin.gradientMap }), { ink: 2.4 }); shape.add(eyeball);
    const lidMat = M.skin;
    const upper = solid(new THREE.SphereGeometry(36.5, 40, 16, 0, TAU, 0, Math.PI / 2), lidMat, { ink: 3.6 }); shape.add(upper);
    const lower = solid(new THREE.SphereGeometry(36, 40, 16, 0, TAU, Math.PI / 2, Math.PI / 2), lidMat, { ink: 2 }); shape.add(lower);
    // the lash line along each lid's edge, so a shut eye still shows as a line
    const rim = (r, w) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 17 }, (_, i) => {
      const a = 0.15 + (i / 16) * (Math.PI - 0.3); return V(-Math.cos(a) * r, 0, Math.sin(a) * r);
    })), 32, w, 8), LASH);
    upper.add(rim(37, 3.4)); lower.add(rim(36.3, 1.6));
    return { s, pivot, eyeball, upper, lower, tex, pupil: 1 };
  });
  const brows = [-1, 1].map(s => {
    const pivot = surface(head, s * 0.4, 200);
    const curve = new THREE.QuadraticBezierCurve3(V(-27, -3, 0), V(0, 7, 0), V(27, -1, 0));
    const b = solid(new THREE.TubeGeometry(curve, 16, 6.5, 10), M.hair, { ink: 2 }); b.position.z = HEAD_R + 6;
    const g = joint(pivot); g.add(b);
    return { s, g, b };
  });
  const nose = solid(ball(11, 24), M.skin, { ink: 2 }); nose.scale.set(1.05, 0.8, 1); surface(head, 0, 114).add(nose); nose.position.z = HEAD_R + 3;
  const mouthTex = mouthTexture();
  const patch = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R + 0.8, 48, 24, PATCH.phi0, PATCH.phiLen, PATCH.th0, PATCH.thLen),
    new THREE.MeshToonMaterial({ map: mouthTex, gradientMap: M.skin.gradientMap, transparent: true, depthWrite: false }));
  patch.position.y = HC; patch.renderOrder = 1; head.add(patch);

  const hair = solid(hairGeometry(), M.hair); head.add(hair);
  // the ponytail: a chain of three tapering pieces from a tie at the back of her head, on her left
  const tailBase = joint(head, [106, HC + 78, -116]);
  const tie = solid(new THREE.TorusGeometry(20, 7, 10, 28), M.tie, { ink: 2 }); tie.rotation.x = Math.PI / 2; tailBase.add(tie);
  const tail = [];
  let at = tailBase;
  for (const [len, r1, r2] of [[72, 23, 28], [80, 28, 21], [72, 21, 6]]) {
    const seg = joint(at, [0, tail.length ? -tail[tail.length - 1].len : 0, 0]);
    seg.add(solid(limbGeometry(len, r1, r2), M.hair));
    tail.push({ seg, len }); at = seg;
  }

  // Put every part where the pose says.
  const W = new THREE.Vector3(), Pole = new THREE.Vector3(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  const palmPoint = new THREE.Vector3();
  return {
    root, head,
    // Her hands, to hang props on: hands.L / hands.R are the hand groups (palm facing -x on the
    // right hand, +x on the left, fingers down -y). palm('R', v) is the middle of the palm, in the world.
    hands: { L: arms[0].hand.hand, R: arms[1].hand.hand },
    pinch(side, v) { return arms[side === 'L' ? 0 : 1].hand.pinch(v); },
    // The tip of the index finger (for pointing, tapping a screen, pressing a key), in the world.
    tip(side, v) { return arms[side === 'L' ? 0 : 1].hand.tip(v); },
    palm(side, v = palmPoint) { const h = arms[side === 'L' ? 0 : 1].hand.hand; h.updateWorldMatrix(true, false); return v.set(0, -30, 0).applyMatrix4(h.matrixWorld); },
    // Between the world and her own space (origin between her feet, y up, z where she faces), as
    // hand and foot targets are given.
    local(v) { facing.updateWorldMatrix(true, false); return facing.worldToLocal(v.clone()); },
    world(v) { facing.updateWorldMatrix(true, false); return facing.localToWorld(v.clone()); },
    // Turn a hand to a world orientation after update() (to fit it round something it holds; see
    // scanner3d's handFrame).
    // w eases from the hand's own turn (0) to q (1).
    orientHand(side, q, w = 1) {
      const A = arms[side === 'L' ? 0 : 1];
      if (w <= 0) return;
      A.wrist.updateWorldMatrix(true, false); A.wrist.getWorldQuaternion(WQ);
      const own = A.hand.hand.quaternion.clone();
      A.hand.hand.quaternion.copy(WQ.invert().multiply(q));
      if (w < 1) A.hand.hand.quaternion.slerpQuaternions(own, A.hand.hand.quaternion.clone(), w);
      A.hand.hand.updateMatrixWorld(true);
    },
    update(p, { x = 0, y = 0, z = 0, scale = 1 } = {}) {
      const g = (k, d = 0) => p[k] ?? d;
      root.position.set(x, -y, z); root.scale.setScalar(scale);
      facing.rotation.y = g('yaw') + g('body.turn') * 0.8;
      hips.position.set(g('hips.x'), 360 + g('hips.y'), g('hips.z'));
      torso.rotation.set(g('torso.rx'), g('torso.ry'), -g('torso.rz') - g('torso.r'), 'YXZ');
      torso.scale.y = g('torso.sy', 1);
      head.rotation.set(g('head.rx'), g('head.turn') * 0.62, -g('head.r'), 'YXZ');
      head.position.y = 30 + g('head.y') * -1;
      root.updateMatrixWorld(true);
      // legs: IK to the feet, knees forward, and the shoes kept flat
      for (const L of legs) {
        const S = L.s < 0 ? 'L' : 'R';
        W.set(g(`foot${S}.x`, L.s * 46), g(`foot${S}.y`, 42), g(`foot${S}.z`, 4)); facing.localToWorld(W);
        Pole.set(L.s * 30, 420, 500); facing.localToWorld(Pole);
        reach(L.thigh, L.knee, 160, 150, W, Pole);
        L.knee.updateWorldMatrix(true, false);
        L.knee.getWorldQuaternion(q); facing.getWorldQuaternion(q2);
        L.ankle.quaternion.copy(q.invert().multiply(q2));
        L.ankle.rotateY(L.s * 0.08);
      }
      // arms: IK to the wrists, elbows out and back
      for (const A of arms) {
        const S = A.s < 0 ? 'L' : 'R';
        const hy = g(`hand${S}.y`, 356);
        W.set(g(`hand${S}.x`, A.s * 122), hy, g(`hand${S}.z`, 14)); facing.localToWorld(W);
        // the elbow points down and back for a low hand, out to the side for a raised one
        const up = smooth(470, 660, hy + g('hips.y'));
        Pole.set(A.s * lerp(260, 420, up) + g(`elbow${S}.x`), lerp(420, 520, up) + g('hips.y') + g(`elbow${S}.y`), lerp(-260, 20, up) + g(`elbow${S}.z`));
        facing.localToWorld(Pole);
        reach(A.shoulder, A.elbow, 130, 118, W, Pole);
        A.wrist.updateWorldMatrix(true, false);
        // the palm faces (hand.px, py, pz) in her own space: in towards her by default
        W.set(g(`hand${S}.px`, -A.s), g(`hand${S}.py`), g(`hand${S}.pz`));
        if (W.lengthSq() > 1e-4) W.normalize().applyQuaternion(facing.getWorldQuaternion(q));
        A.hand.pose(g(`hand${S}.form`, 4), W.lengthSq() > 1e-4 ? W : null, g(`hand${S}.palm`), g(`hand${S}.bend`));
      }
      // the face
      const open = clamp(g('eyes.open', 1)), squint = clamp(g('eyes.squint'));
      for (const E of eyes) {
        const S = E.s < 0 ? 'L' : 'R';
        E.eyeball.rotation.set(g('eyes.y') * 0.35, g('eyes.x') * 0.5, 0, 'YXZ');
        const cover = clamp(Math.max(g('eyes.blink'), g('lids.drop') + g(`lid${S}.drop`), 1 - Math.min(open * g(`eye${S}.open`, 1), 1)));
        const wide = Math.max(0, open - 1);
        E.upper.rotation.set(lerp(-1.5 - wide * 0.3, 1.45, cover), 0, E.s * clamp(g('lids.slant') + g(`lid${S}.slant`), -1, 1) * -0.35);
        E.lower.rotation.set(lerp(1.35, -0.25, squint), 0, 0);
        const pupil = Math.round(g('eyes.pupil', 1) * 10) / 10;
        if (pupil !== E.pupil) { E.pupil = pupil; E.tex.redraw(pupil); }
      }
      for (const B of brows) {
        const S = B.s < 0 ? 'L' : 'R';
        const up = g('brows.up') + g(`brow${S}.up`), slant = clamp(g('brows.in') + g(`brow${S}.slant`), -1.2, 1.2);
        B.g.rotation.set(-up * 0.11, 0, 0);
        B.b.rotation.z = -B.s * (0.1 - slant * 0.32);
      }
      skull.scale.y = 1 + clamp(g('mouth.open') * 0.55 + g('jaw'), 0, 1.4) * 0.025;
      mouthTex.redraw(p);
      // the ponytail hangs, and swings behind the head's moves
      tailBase.rotation.set(0.3 + g('tail.rx'), 0, 0.3 + g('tail.rz'));
      tail.forEach((T, i) => T.seg.rotation.set((g('tail.rx') * 0.5 + 0.1) * i, 0, (g('tail.rz') * 0.6 - 0.22) * i));
    },
  };
}

// ---------- bringing her to life ----------
export const REST3 = {
  ...NEUTRAL, 'mood.smile': 0.3,
  'handL.x': -122, 'handL.y': 356, 'handL.z': 14, 'handR.x': 122, 'handR.y': 356, 'handR.z': 14, 'handL.form': 4, 'handR.form': 4,
  'handL.px': 1, 'handL.py': 0, 'handL.pz': 0, 'handR.px': -1, 'handR.py': 0, 'handR.pz': 0,
  'footL.x': -46, 'footL.y': 42, 'footL.z': 4, 'footR.x': 46, 'footR.y': 42, 'footR.z': 4,
};
export const EXPR3 = expressions({ ...NEUTRAL, 'mood.smile': 0.3 });
const HAND = { stiffness: 170, damping: 15 }, BODY = { stiffness: 110, damping: 14 }, HEAD = { stiffness: 150, damping: 14 };
const JOINTS3 = {
  'handL.x': HAND, 'handL.y': HAND, 'handL.z': HAND, 'handR.x': HAND, 'handR.y': HAND, 'handR.z': HAND,
  'head.rx': HEAD, 'head.turn': HEAD, 'head.r': HEAD, 'torso.rx': BODY, 'torso.ry': BODY, 'torso.rz': BODY, 'hips.x': BODY, 'hips.y': BODY, 'yaw': BODY, 'body.turn': BODY,
};

// Pip at time t, from moves (as for choreo), with springs on her hands, head and body, breathing,
// swaying, blinking, glancing, the eyes leading the head, lip-sync to her lines, and the ponytail.
export function pip3dPose(t, moves, { speaker, extra, seed = 3, id = 'pip3d' } = {}) {
  const chore = u => {
    const q = choreo(u, REST3, moves);
    q['head.turn'] = (q['head.turn'] ?? 0) + (q['eyes.x'] ?? 0) * 0.45;
    return q;
  };
  let p = chore(t);
  Object.assign(p, springs(`${id}.joints`, t, chore, JOINTS3));
  if (extra) p = add(p, extra(t));
  const br = breath(t, seed), sw = sway(t, seed);
  p = add(p, { 'torso.sy': 1 + 0.008 * br, 'hips.x': sw * 5, 'torso.rz': sw * 0.015, 'head.r': -sw * 0.02, 'handL.y': br * 1.5, 'handR.y': br * 1.5 });
  const gl = glance(t, seed);
  p['eyes.x'] = (p['eyes.x'] ?? 0) + gl[0] * 0.3; p['eyes.y'] = (p['eyes.y'] ?? 0) + gl[1] * 0.3;
  p['eyes.blink'] = Math.max(p['eyes.blink'] ?? 0, blink(t, seed));
  const mo = lipsync(t, { speaker });
  for (const [k, val] of Object.entries(mo)) p[`mouth.${k}`] = val;
  const talk = loudness(t) * (mo.open > 0.05 ? 1 : 0);
  p['head.rx'] = (p['head.rx'] ?? 0) + Math.sin(t * 9 + seed) * 0.02 * talk;
  // the ponytail trails behind the head and body
  const swingOf = u => { const q = chore(u); return (q['head.r'] ?? 0) * 2 + (q['head.turn'] ?? 0) * 0.8 + (q['hips.x'] ?? 0) / 60 + (q['yaw'] ?? 0) + (q['body.turn'] ?? 0) * 0.8; };
  const nodOf = u => { const q = chore(u); return (q['head.rx'] ?? 0) * 2 + (q['hips.y'] ?? 0) / 80 + (q['torso.rx'] ?? 0); };
  p['tail.rz'] = -clamp(lag(`${id}.tailz`, t, swingOf, { preset: 'wobbly' }), -1.2, 1.2) * 0.8;
  p['tail.rx'] = clamp(lag(`${id}.tailx`, t, nodOf, { preset: 'wobbly' }), -1, 1) * 0.8;
  return p;
}
