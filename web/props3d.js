// 3D props for the toon kit: a handheld scanner with a live screen and a scan beam, bin labels whose
// backing peels off, pallet racking with places for labels on its beams, cartons and pallets.
// Cel-shaded and inked like the characters. Units are the 2D scene's pixels, y up (see scene3d.js).
import { clamp, hash, TAU } from './core.js';
import { paintedTexture, THREE } from './scene3d.js';
import { ball, joint, roundBox, solid, toon } from './toon3d.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ---------- barcodes ----------
// Bars made up from the text: they look like a barcode but are decorative on purpose, so nothing in a
// video can be scanned for real. The same text always gives the same bars.
export function decorativeBars(g, x, y, w, h, text, color = '#1B1B1B') {
  let seed = 0;
  for (const ch of String(text)) seed = (seed * 31 + ch.charCodeAt(0)) % 100003;
  g.fillStyle = color;
  for (let i = 0, cx = x; ; i++) {
    const bw = (1 + Math.floor(hash(seed + i) * 3)) * (w / 60), gap = (1 + Math.floor(hash(seed + i * 7 + 99) * 2)) * (w / 60);
    if (cx + bw > x + w) break;
    g.fillRect(cx, y, bw, h);
    cx += bw + gap;
  }
}

// ---------- labels ----------
// A bin label: the location in big type on the left, bars and their number on the right. Old labels
// are yellowed and a little stained; new ones are bright white.
function labelTexture({ title, value, old }) {
  return paintedTexture(512, 200, (g, w, h) => {
    g.fillStyle = old ? '#E8DBB6' : '#FFFFFF'; g.fillRect(0, 0, w, h);
    if (old) for (let i = 0; i < 7; i++) {                     // age: faint stains
      g.fillStyle = `rgba(150,120,60,${0.05 + hash(i + value.length) * 0.07})`;
      g.beginPath(); g.ellipse(hash(i * 3.1) * w, hash(i * 7.3) * h, 20 + hash(i) * 50, 10 + hash(i * 2) * 25, hash(i * 5) * 3, 0, TAU); g.fill();
    }
    g.fillStyle = '#1B1B1B'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.font = '700 104px Roboto'; g.fillText(title, 136, h / 2 + 4, 250);
    decorativeBars(g, 290, 30, 196, 100, value);
    g.font = '500 32px Roboto'; g.fillStyle = '#3A3A3A'; g.fillText(value, 388, 162);
    g.strokeStyle = old ? '#BFAE80' : '#C9CFD6'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  });
}

// label3d({ title, value, old }) -> { group, setLiner(k) }. The group's face points along +z; its
// origin is the label's middle. setLiner(k) peels the backing paper off, hinged at the left edge,
// from 0 (on) to 1 (off and gone).
export function label3d({ title, value, old = false, w = 172, h = 67 }) {
  const group = new THREE.Group();
  group.add(solid(roundBox(w, h, 2.4, 3, 2), toon(old ? '#E8DBB6' : '#FFFFFF'), { ink: 1.8 }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 3, h - 3), new THREE.MeshBasicMaterial({ map: labelTexture({ title, value, old }), toneMapped: false }));
  face.position.z = 1.35; group.add(face);
  const hinge = new THREE.Group(); hinge.position.set(-w / 2, 0, -1.6); group.add(hinge);
  const liner = solid(roundBox(w, h, 1.2, 3, 1), toon('#D8CFBE'), { ink: 1.4 }); liner.position.x = w / 2; hinge.add(liner);
  hinge.visible = !old;
  return {
    group, face,
    setLiner(k) {
      k = clamp(k);
      hinge.visible = !old && k < 0.999;
      hinge.rotation.set(0, -k * 2.6, -k * k * 0.6);             // swings off the back, and droops
      hinge.position.y = -k * k * 60;
      liner.scale.setScalar(1 - k * 0.2);
    },
  };
}

// ---------- the scanner ----------
// A rugged handheld with a pistol grip. In its own space the nose (the scan window) points +y, the
// screen faces +z, and the grip hangs off the back (-z). screen is a texture (a canvas the video
// paints) shown at full brightness on the screen.
export function scanner3d(layer, { screen = null, scale = 1 } = {}) {
  const dark = toon('#2A2E33'), edge = toon('#3C4148'), key = toon('#1E2125'), accent = toon('#FF8A1F');
  const root = new THREE.Group(); layer.scene.add(root);
  const body = joint(root); body.scale.setScalar(scale);
  const slab = solid(roundBox(94, 204, 30, 14), dark); body.add(slab);
  const bumper = solid(roundBox(100, 34, 34, 12), edge); bumper.position.y = 90; body.add(bumper);
  const foot = solid(roundBox(100, 26, 34, 12), edge); foot.position.y = -92; body.add(foot);
  // the screen, glass-dark round a picture that glows
  // (the picture is 80 x 115, a phone's shape, 480 x 692 for a texture)
  const SCR = { w: 80, h: 115, y: 20, z: 17.2 };
  const bezel = solid(roundBox(SCR.w + 8, SCR.h + 7, 3, 6), toon('#0A0C0E'), { ink: 1.4 }); bezel.position.set(0, SCR.y, 15.5); body.add(bezel);
  const screenMat = new THREE.MeshBasicMaterial({ color: screen ? '#FFFFFF' : '#14213D', map: screen, toneMapped: false });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), screenMat); glass.position.set(0, SCR.y, SCR.z); body.add(glass);
  // keys, three rows of four; the last (bottom right) is Enter
  const keys = [];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) {
    const k = solid(roundBox(16, 9, 3, 2), key, { ink: 1 }); k.position.set(-27 + i * 18, -52 - r * 13, 15.8); body.add(k);
    keys.push(k);
  }
  // the scan window on the nose, and an indicator light
  const win = solid(roundBox(62, 5, 18, 2), new THREE.MeshBasicMaterial({ color: '#7A1010' }), { ink: 1.4 }); win.position.set(0, 107, 0); body.add(win);
  const ledMat = new THREE.MeshBasicMaterial({ color: '#223322' });
  const led = new THREE.Mesh(ball(3.6, 12), ledMat); led.position.set(34, 92, 17.5); body.add(led);
  // the pistol grip and its trigger
  // (slim enough for a toon hand to close round: see handFrame)
  const gripJ = joint(body, [0, -18, -15]); gripJ.rotation.x = 0.32;
  const grip = solid(roundBox(28, 30, 112, 12), edge); grip.position.z = -54; gripJ.add(grip);
  const band = solid(roundBox(30, 10, 60, 4), accent, { ink: 1.4 }); band.position.set(0, -12, -64); gripJ.add(band);
  const trigger = solid(roundBox(12, 14, 24, 5), accent, { ink: 1.4 }); trigger.position.set(0, 20, -22); gripJ.add(trigger);

  // the beam: a fan of red light from the window to where it is aimed, and a bright line there
  const beamMat = new THREE.MeshBasicMaterial({ color: '#FF2A2A', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const lineMat = new THREE.MeshBasicMaterial({ color: '#FF4040', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const quad = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; };
  const fan = new THREE.Mesh(quad(), beamMat), spot = new THREE.Mesh(quad(), lineMat);
  fan.frustumCulled = spot.frustumCulled = false; fan.renderOrder = spot.renderOrder = 5;
  layer.scene.add(fan, spot);
  const setQuad = (m, pts) => { const a = m.geometry.attributes.position; pts.forEach((p, i) => a.setXYZ(i, p.x, p.y, p.z)); a.needsUpdate = true; m.geometry.computeBoundingSphere(); };

  const X = V(), Y = V(), Z = V(), M4 = new THREE.Matrix4(), P = V(), Q = V(), S = V(), D = V(), N = V();
  const HANDLE = V(0, 0, -48), FLIP = new THREE.Quaternion().setFromAxisAngle(V().set(0, 0, 1), Math.PI);
  const LED = { off: '#223322', green: '#39E26A', red: '#FF3B30', amber: '#FFB21F' };
  return {
    root, body, screen: glass, grip: gripJ, keys,
    // The top of key i (0..11, by rows; 11 is Enter), lifted off it by `lift`, in the world.
    keyAt(i, lift = 0) { root.updateMatrixWorld(true); const k = keys[i]; return body.localToWorld(V(k.position.x, k.position.y, k.position.z + 1.5 + lift)); },
    // Hold it with the middle of the handle at `hand`, the nose pointing along `aim`, and the screen
    // turned towards `face` (all in the world): the scanner's own "look at".
    hold(hand, aim, face) {
      Y.copy(aim).normalize();
      Z.copy(face).addScaledVector(Y, -face.dot(Y)).normalize();         // the screen's way, square to the aim
      X.crossVectors(Y, Z).normalize(); Z.crossVectors(X, Y);
      root.quaternion.setFromRotationMatrix(M4.makeBasis(X, Y, Z));
      root.position.set(0, 0, 0); root.updateMatrixWorld(true);
      gripJ.localToWorld(P.copy(HANDLE));
      root.position.copy(hand).sub(P);
      root.updateMatrixWorld(true);
    },
    // Where a hand goes to hold it, pistol-fashion: closed round the handle (hand form 5) with the index
    // finger at the top by the trigger and the forearm behind. grip is the character's GRIP (where a
    // handle sits in its closed hand); side is the hand's (+1 or -1). -> { wrist, quat } in the world,
    // for the arm's IK target and orientHand.
    handFrame(grip, side = 1) {
      const quat = new THREE.Quaternion(); gripJ.getWorldQuaternion(quat); quat.multiply(FLIP);
      const at = V().set(side * grip.at[0], grip.at[1], grip.at[2]).multiplyScalar(grip.scale).applyQuaternion(quat);
      return { wrist: gripJ.localToWorld(V().copy(HANDLE)).sub(at), quat };
    },
    // A point on the screen, u across and v down (0..1, as on the picture), lifted off the glass by
    // `lift`, in the world; and the screen's facing. -> { at, normal }
    screenAt(u, v, lift = 0) {
      root.updateMatrixWorld(true);
      const at = body.localToWorld(V(-SCR.w / 2 + SCR.w * u, SCR.y + SCR.h / 2 - SCR.h * v, SCR.z + lift));
      const normal = V(0, 0, 1).applyQuaternion(body.getWorldQuaternion(new THREE.Quaternion()));
      return { at, normal };
    },
    // Where the scan window is, in the world.
    nose(v = V()) { root.updateMatrixWorld(true); return v.set(0, 110, 0).applyMatrix4(body.matrixWorld); },
    // trigger 0..1; led 'off' | 'green' | 'red' | 'amber'; beam { to: world point, k: 0..1 } or null;
    // camera, so the beam's fan faces it.
    update({ trigger: pull = 0, led: light = 'off', beam = null, camera } = {}) {
      trigger.position.y = 30 - clamp(pull) * 10;
      ledMat.color.set(LED[light] ?? light);
      fan.visible = spot.visible = !!(beam && beam.k > 0.01);
      if (!fan.visible) return;
      this.nose(P); Q.copy(beam.to);
      D.subVectors(Q, P).normalize();
      camera.getWorldPosition(N); N.sub(Q).normalize();
      S.crossVectors(D, N).normalize();
      const near = 3, far = 42 * scale, k = beam.k;
      setQuad(fan, [P.clone().addScaledVector(S, near), Q.clone().addScaledVector(S, far), Q.clone().addScaledVector(S, -far), P.clone().addScaledVector(S, -near)]);
      const up = V().crossVectors(S, N).normalize().multiplyScalar(3.4 * scale);
      const L = 44 * scale;
      setQuad(spot, [Q.clone().addScaledVector(S, L).add(up), Q.clone().addScaledVector(S, -L).add(up), Q.clone().addScaledVector(S, -L).sub(up), Q.clone().addScaledVector(S, L).sub(up)]);
      beamMat.opacity = 0.5 * k; lineMat.opacity = k;
    },
  };
}

// ---------- racking ----------
// Pallet racking: blue uprights, orange beams, bays side by side along x, the beams' faces towards +z.
// levels are the beams' heights (their middles); the bottom level is the floor. slot(bay, level, dx)
// says where a label goes on a front beam (its middle, facing out); spot(bay, level) where a pallet
// goes, resting on the front and back beams (level -1: on the floor); PALLET is the size that spans them.
export function rack3d({ bays = 3, bayW = 440, levels = [560, 1080], depth = 300, height = 1500, upright = '#2F5F9E', beam = '#E36F22' } = {}) {
  const group = new THREE.Group();
  const up = toon(upright), bm = toon(beam), brace = toon('#5A7FB5');
  const BEAM = { h: 64, d: 26 };
  const x0 = -(bays * bayW) / 2;
  for (let i = 0; i <= bays; i++) {
    const x = x0 + i * bayW;
    for (const z of [0, -depth]) {
      const u = solid(roundBox(30, height, 30, 4), up, { ink: 2 }); u.position.set(x, height / 2, z); group.add(u);
      const plate = solid(roundBox(46, 8, 46, 2), up, { ink: 1.6 }); plate.position.set(x, 4, z); group.add(plate);
    }
    for (let y = 200; y + 330 < height - 60; y += 330) {      // zig-zag bracing between the uprights, ending below their tops
      const b = solid(new THREE.CylinderGeometry(5, 5, Math.hypot(depth, 330), 8), brace, { ink: 1.2 });
      b.position.set(x, y + 165, -depth / 2); b.rotation.x = Math.atan2(depth, 330) * ((y / 330) % 2 < 1 ? 1 : -1); group.add(b);
    }
  }
  for (let b = 0; b < bays; b++) for (const y of levels) for (const z of [BEAM.d / 2 + 15, -depth - BEAM.d / 2 - 15]) {
    const m = solid(roundBox(bayW - 30, BEAM.h, BEAM.d, 5), bm, { ink: 2 }); m.position.set(x0 + b * bayW + bayW / 2, y, z); group.add(m);
  }
  const bayX = b => x0 + b * bayW + bayW / 2;
  const front = BEAM.d / 2 + 15, back = -depth - BEAM.d / 2 - 15;
  return {
    group, bayX, BEAM, levels, PALLET: { w: bayW - 70, d: front - back + 50 },
    slot(bay, level, dx = 0) { return new THREE.Vector3(bayX(bay) + dx, levels[level], front + BEAM.d / 2 + 1.5); },
    spot(bay, level) { return new THREE.Vector3(bayX(bay), level < 0 ? 0 : levels[level] + BEAM.h / 2, (front + back) / 2); },
  };
}

// ---------- cartons and pallets ----------
const CARTON = ['#C99A62', '#B98A55', '#D2A56E', '#BE8E57'];
// A carton with tape across its top and down its front.
export function carton3d({ w = 160, h = 140, d = 150, color = CARTON[0] } = {}) {
  const group = new THREE.Group();
  const box = solid(roundBox(w, h, d, 6), toon(color), { ink: 2 }); box.position.y = h / 2; group.add(box);
  const tape = toon('#E3C491');
  const top = solid(roundBox(30, 2, d + 2, 1), tape, { ink: 0 }); top.position.y = h + 0.5; group.add(top);
  const front = solid(roundBox(30, h * 0.35, 2, 1), tape, { ink: 0 }); front.position.set(0, h - h * 0.175, d / 2 + 0.6); group.add(front);
  return group;
}
// A wooden pallet: a deck on three blocks the forks slide between. Its top is at y = 68.
export function pallet3d({ w = 200, d = 190 } = {}) {
  const group = new THREE.Group();
  const wood = toon('#C99A62'), darkWood = toon('#9C7446');
  const deck = solid(roundBox(w, 14, d, 4), wood, { ink: 2 }); deck.position.y = 61; group.add(deck);
  for (const x of [-w * 0.46, 0, w * 0.46]) { const block = solid(roundBox(22, 54, d, 4), darkWood, { ink: 2 }); block.position.set(x, 27, 0); group.add(block); }
  return group;
}
// A pallet stacked with cartons, a little untidy (the same seed stacks it the same way).
export function palletLoad({ w = 360, d = 240, cols = 2, rows = 1, layers = 2, seed = 1 } = {}) {
  const group = pallet3d({ w, d });
  const cw = (w - 10) / cols, cd = (d - 10) / rows, ch = 120 + (seed % 3) * 15;
  let n = seed;
  for (let l = 0; l < layers; l++) for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    n++;
    const box = carton3d({ w: cw - 8, h: ch, d: cd - 8, color: CARTON[n % 4] });
    box.position.set(-w / 2 + cw * (c + 0.5) + (hash(n) - 0.5) * 8, 68 + l * ch, -d / 2 + cd * (r + 0.5) + (hash(n * 3) - 0.5) * 8);
    box.rotation.y = (hash(n * 7) - 0.5) * 0.06;
    group.add(box);
  }
  return group;
}
