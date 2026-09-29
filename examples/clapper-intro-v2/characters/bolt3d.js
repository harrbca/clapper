// Bolt in 3D: the same robot and the same pose keys as bolt.js (boltPose), modelled in three.js.
// Units are 2D pixels: bolt3d(layer).update(pose, { x, y, scale }) puts it where the 2D Bolt would be.
import { clamp, lerp, TAU } from '/@kit/core.js';
import { paintedTexture, THREE } from '/@kit/scene3d.js';

// The shell's profile: an egg, a little narrower at the top. Radius at height y (y up).
const TOP = 72, BOTTOM = -70, WIDE = 82;
const radiusAt = y => {
  const a = Math.asin(clamp(y >= 0 ? y / TOP : y / -BOTTOM, -1, 1));
  return WIDE * Math.cos(a) * (1 - 0.07 * Math.sin(a));
};

function eyesTexture() {
  // The screen's glow: eyes and mouth, by mood (0 normal, 1 happy, 2 wow), blink and beep.
  return paintedTexture(512, 320, (g, w, h, pose = {}) => {
    const mood = Math.round(pose['eyes.mood'] ?? 0), shut = clamp(pose['eyes.blink'] ?? 0), gx = (pose['eyes.x'] ?? 0) * 26;
    // drawn twice: a wide, faint glow, then the crisp shapes on top
    for (const pass of [0, 1]) {
    g.save();
    g.translate(w / 2, h / 2);
    g.shadowColor = '#3FE6FF'; g.shadowBlur = pass ? 6 : 22;
    g.globalAlpha = pass ? 1 : 0.45;
    g.fillStyle = pass ? '#B6FAFF' : '#3FE6FF'; g.strokeStyle = g.fillStyle; g.lineCap = 'round';
    for (const s of [-1, 1]) {
      const x = s * 84 + gx, y = -38;
      if (mood === 1) { g.lineWidth = 16; g.beginPath(); g.arc(x, y + 18, 30, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if (mood === 2) { g.lineWidth = 13; g.beginPath(); g.arc(x, y, 32 * (1 - shut * 0.9), 0, TAU); g.stroke(); }
      else { const hh = lerp(82, 10, shut); g.beginPath(); g.roundRect(x - 24, y - hh / 2, 48, hh, 24); g.fill(); }
    }
    const open = clamp(pose['mouth.open'] ?? 0);
    g.lineWidth = 11;
    if (open > 0.05) { g.beginPath(); g.ellipse(gx, 88, 18 + open * 8, 7 + open * 16, 0, 0, TAU); g.stroke(); }
    else { g.beginPath(); g.arc(gx, 62, 26, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
    g.restore();
    }
  });
}

// A rounded rectangle, as the alpha of the screen's glass.
const screenMask = () => paintedTexture(512, 320, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 110); g.fill(); });

export function bolt3d(layer) {
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  layer.scene.add(root);

  const shell = new THREE.MeshPhysicalMaterial({ color: '#F4F6FA', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
  const orange = new THREE.MeshPhysicalMaterial({ color: '#FF8A1F', roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: '#39414F', roughness: 0.5, metalness: 0.6 });

  // the shell
  const profile = [];
  for (let i = 0; i <= 48; i++) { const y = lerp(BOTTOM, TOP, i / 48); profile.push(new THREE.Vector2(Math.max(0.01, radiusAt(y)), y)); }
  const egg = new THREE.Mesh(new THREE.LatheGeometry(profile, 128), shell);
  egg.castShadow = true;
  body.add(egg);

  // the orange band, following the shell's curve
  const band = new THREE.Mesh(new THREE.CylinderGeometry(radiusAt(-34) + 0.8, radiusAt(-46) + 0.8, 12, 128, 1, true), orange);
  band.position.y = -40;
  body.add(band);

  // the face: a glass screen wrapped onto the front of the shell, with the eyes glowing in it
  const eyes = eyesTexture();
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#0F1624', roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.35, envMapIntensity: 0.22,
    alphaMap: screenMask(), transparent: true, emissive: '#FFFFFF', emissiveMap: eyes, emissiveIntensity: 1.1,
  });
  const face = new THREE.PlaneGeometry(112, 70, 48, 30), pos = face.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i) + 13, r = radiusAt(y);
    const a = Math.asin(clamp(x / r, -0.99, 0.99));
    pos.setXYZ(i, Math.sin(a) * (r + 1.2), y, Math.cos(a) * (r + 1.2));
  }
  face.computeVertexNormals();
  body.add(new THREE.Mesh(face, glass));

  // the antenna, with a glowing ball that lights the shell a little
  const antenna = new THREE.Group();
  antenna.position.y = TOP - 4;
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 40, 16), new THREE.MeshStandardMaterial({ color: '#C7D1E0', roughness: 0.4, metalness: 0.5 }));
  stalk.position.y = 20;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshStandardMaterial({ color: '#FF6A00', emissive: '#FF4A00', emissiveIntensity: 0.35, roughness: 0.5, envMapIntensity: 0.4 }));
  ball.position.y = 46;
  const glow = new THREE.PointLight('#FF9A40', 1.2, 260, 1.4);
  glow.position.y = 46;
  antenna.add(stalk, ball, glow);
  body.add(antenna);

  // the thruster, and its flame
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(14, 19, 14, 32), dark);
  nozzle.position.y = BOTTOM + 2;
  body.add(nozzle);
  const flames = [['#FF7A2E', 16, 0.8], ['#FFD25A', 10, 0.6], ['#FFFBE6', 5, 0.45]].map(([col, r, l]) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, 100, 24, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = Math.PI;
    m.userData.l = l;
    body.add(m);
    return m;
  });

  // the hands float beside it
  const hands = [-1, 1].map(s => {
    const h = new THREE.Group();
    const ballHand = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), shell);
    ballHand.castShadow = true;
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(16, 4.5, 12, 48), orange);
    cuff.rotation.y = Math.PI / 2; cuff.position.x = -s * 9;
    h.add(ballHand, cuff);
    h.userData.side = s;
    root.add(h);
    return h;
  });

  return {
    root,
    // Pose keys as boltPose makes them, plus yaw (turning to face where it goes) from the path.
    update(pose, { x, y, scale = 1, yaw = 0 }) {
      root.position.set(x, -(y + (pose['body.y'] ?? 0) * scale), 0);
      root.scale.setScalar(scale);
      body.rotation.set(-0.08, yaw, -(pose['body.r'] ?? 0));
      antenna.rotation.z = -(pose['antenna.r'] ?? 0);
      for (const h of hands) {
        const s = h.userData.side, k = s < 0 ? 'handL' : 'handR';
        h.position.set(s * 100 + (pose[`${k}.x`] ?? 0), -(16 + (pose[`${k}.y`] ?? 0)), 14);
      }
      const k = clamp(pose['flame.k'] ?? 0.3), flick = pose['flame.flick'] ?? 0;
      for (const f of flames) {
        const len = (22 + 80 * k * (0.85 + 0.15 * flick)) * f.userData.l * 1.4;
        f.scale.set(1, len / 100, 1);
        f.position.y = BOTTOM - 5 - len / 2;
        f.visible = k > 0.02;
      }
      eyes.redraw(pose);
    },
  };
}
