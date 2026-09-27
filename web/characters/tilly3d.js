// Tilly, a forklift robot, in 3D: import { tilly3d, tillyPose } from '/@kit/characters/tilly3d.js'.
// A cousin of Bolt: a glowing screen for a face in a cab that turns like a head, a beacon on top, and
// forks for hands. Cel-shaded and inked like the toon characters.
//
// Units are 2D pixels, y up; she is about 330 tall, 200 wide and 400 long with her forks, and faces +z
// (towards the camera) at yaw 0. tilly3d(layer).update(pose, { x, y, z, scale }) puts her feet at the
// 2D point (x, y), z towards us.
//
// Pose keys (tillyPose makes them from moves, a path and springs):
//   yaw, body.y, body.pitch, body.roll, body.sy   the chassis on its springs
//   cab.yaw, cab.tilt, cab.nod                     the cab turns and tilts like a head
//   forks.y (0..1 of the lift), forks.tilt, mast.tilt, forks.spread, forkL.tilt, forkR.tilt
//   eyes.x, eyes.y, eyes.blink, eyes.open, eyes.mood (0 normal, 1 happy, 2 wow, 3 cross, 4 sad),
//   brows.up, mouth.open, mouth.smile, beacon (0..1, spinning and flashing), wheels (radians rolled)
import { clamp, lerp, TAU } from '../core.js';
import { choreo } from '../puppet.js';
import { blink, glance } from '../life.js';
import { mouth as lipsync } from '../lipsync.js';
import { lag, spring } from '../spring.js';
import { paintedTexture, THREE } from '../scene3d.js';
import { ball, joint, roundBox, solid, toon } from '../toon3d.js';

export const PAL = {
  body: '#FFC21A', trim: '#454B58', dark: '#2E323B', tyre: '#2A2D34', steel: '#5C6270', glow: '#FFB02E', core: '#FFEBB0', beacon: '#FF7A1A',
};
const LIFT = 250;                                   // how high the forks go at forks.y = 1
const FRONT = { z: 86, r: 46 }, BACK = { z: -92, r: 38 };

// ---------- the face ----------
function faceTexture() {
  return paintedTexture(512, 340, (g, w, h, p = {}) => {
    const mood = Math.round(p['eyes.mood'] ?? 0), shut = clamp(Math.max(p['eyes.blink'] ?? 0, 1 - (p['eyes.open'] ?? 1)));
    const gx = (p['eyes.x'] ?? 0) * 34, gy = (p['eyes.y'] ?? 0) * 22, up = (p['brows.up'] ?? 0);
    for (const pass of [0, 1]) {                                     // a wide faint glow, then crisp shapes
      g.save(); g.translate(w / 2 + gx, h / 2 + gy - 18);
      g.shadowColor = PAL.glow; g.shadowBlur = pass ? 8 : 26; g.globalAlpha = pass ? 1 : 0.5;
      g.fillStyle = g.strokeStyle = pass ? PAL.core : PAL.glow; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const s of [-1, 1]) {
        const x = s * 96, y = 0;
        if (mood === 1) { g.lineWidth = 20; g.beginPath(); g.arc(x, y + 26, 38, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); }
        else if (mood === 2) { g.lineWidth = 16; g.beginPath(); g.arc(x, y, 40 * (1 - shut * 0.9), 0, TAU); g.stroke(); }
        else {
          const hh = lerp(104, 12, shut), top = y - hh / 2;
          g.beginPath(); g.roundRect(x - 30, top, 60, hh, 30); g.fill();
          if ((mood === 3 || mood === 4) && hh > 30) {               // a lid cut across the top: cross slants in, sad out
            g.save(); g.globalCompositeOperation = 'destination-out'; g.shadowBlur = 0; g.globalAlpha = 1;
            const inner = mood === 3 ? 1 : -1;
            g.beginPath(); g.moveTo(x - 40, top - 10); g.lineTo(x + 40, top - 10);
            g.lineTo(x + 40, top + (s * inner < 0 ? 44 : 4)); g.lineTo(x - 40, top + (s * inner < 0 ? 4 : 44)); g.fill();
            g.restore();
          }
        }
        if (Math.abs(up) > 0.08) { g.lineWidth = 10; g.beginPath(); g.moveTo(x - 30, y - 74 - up * 20); g.lineTo(x + 30, y - 74 - up * 20 - s * up * 6); g.stroke(); }
      }
      const open = clamp(p['mouth.open'] ?? 0), smile = p['mouth.smile'] ?? 0.5;
      g.lineWidth = 12;
      if (open > 0.05) { g.beginPath(); g.ellipse(0, 104, 24 + open * 10, 8 + open * 22, 0, 0, TAU); g.stroke(); }
      else { g.beginPath(); g.moveTo(-34, 96 - smile * 8); g.quadraticCurveTo(0, 96 + smile * 26, 34, 96 - smile * 8); g.stroke(); }
      g.restore();
    }
  });
}

// Hazard stripes for the counterweight.
const stripes = () => paintedTexture(256, 64, (g, w, h) => {
  g.fillStyle = PAL.body; g.fillRect(0, 0, w, h);
  g.fillStyle = PAL.dark;
  for (let x = -h; x < w; x += 48) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 24, h); g.lineTo(x + 24 + h, 0); g.lineTo(x + h, 0); g.fill(); }
});

// ---------- the model ----------
export function tilly3d(layer) {
  const M = { body: toon(PAL.body), trim: toon(PAL.trim), dark: toon(PAL.dark), tyre: toon(PAL.tyre), steel: toon(PAL.steel) };
  const root = new THREE.Group();
  layer.scene.add(root);
  const heading = joint(root);                                 // yaw
  const chassis = joint(heading, [0, 44, 0]);                  // rides on its springs, above the axles

  // the chassis, the counterweight at the back with its hazard stripes, a bumper at the front
  const base = solid(roundBox(196, 72, 236, 26), M.body); base.position.set(0, 30, 0); chassis.add(base);
  const weight = solid(roundBox(206, 96, 78, 34), M.trim); weight.position.set(0, 36, -118); chassis.add(weight);
  const band = new THREE.Mesh(new THREE.PlaneGeometry(150, 26), new THREE.MeshToonMaterial({ map: stripes() }));
  band.position.set(0, 44, -157.5); band.rotation.y = Math.PI; chassis.add(band);
  const bumper = solid(roundBox(206, 22, 26, 10), M.trim); bumper.position.set(0, 4, 122); chassis.add(bumper);
  for (const s of [-1, 1]) {                                   // tail lights
    const lamp = solid(roundBox(30, 16, 8, 6), new THREE.MeshStandardMaterial({ color: '#FF3B2E', emissive: '#FF2A1A', emissiveIntensity: 0.8 }), { ink: 2 });
    lamp.position.set(s * 76, 64, -158); chassis.add(lamp);
  }
  for (const s of [-1, 1]) {                                   // mudguards over the front wheels
    const guard = solid(new THREE.CylinderGeometry(FRONT.r + 12, FRONT.r + 12, 40, 32, 1, true, 0, Math.PI), toon(PAL.trim, { side: THREE.DoubleSide }), { ink: 0 });
    guard.rotation.z = Math.PI / 2; guard.position.set(s * 104, 0, FRONT.z); chassis.add(guard);
  }

  // the cab: her head, which turns and tilts, with the screen for a face and the beacon on top
  const neck = joint(chassis, [0, 62, -30]);
  const cab = joint(neck, [0, 0, 0]);
  const shell = solid(roundBox(196, 176, 156, 62), M.body); shell.position.y = 96; cab.add(shell);
  const roof = solid(roundBox(170, 14, 136, 7), M.trim); roof.position.y = 190; cab.add(roof);
  const bezel = solid(roundBox(164, 118, 12, 34), M.dark, { ink: 2 }); bezel.position.set(0, 104, 74); cab.add(bezel);
  const face = faceTexture();
  const screen = new THREE.Mesh(roundBox(150, 104, 4, 28), new THREE.MeshStandardMaterial({ color: '#0C1119', roughness: 0.25, metalness: 0.1, emissive: '#FFFFFF', emissiveMap: face, emissiveIntensity: 1.25, envMapIntensity: 0.5 }));
  screen.position.set(0, 104, 80.5); cab.add(screen);
  // the screen's texture should cover only its front: flatten the UVs onto x, y
  { const pos = screen.geometry.attributes.position, uv = screen.geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 150 + 0.5, pos.getY(i) / 104 + 0.5); uv.needsUpdate = true; }
  const beaconBase = solid(new THREE.CylinderGeometry(17, 19, 10, 24), M.dark, { ink: 2 }); beaconBase.position.y = 202; cab.add(beaconBase);
  const domeMat = new THREE.MeshStandardMaterial({ color: PAL.beacon, emissive: PAL.beacon, emissiveIntensity: 0.2, transparent: true, opacity: 0.85, roughness: 0.2 });
  const dome = solid(new THREE.SphereGeometry(17, 32, 16, 0, TAU, 0, Math.PI / 2), domeMat, { ink: 2, shadow: false }); dome.position.y = 207; dome.scale.y = 1.3; cab.add(dome);
  const spinner = new THREE.Mesh(new THREE.BoxGeometry(26, 14, 3), new THREE.MeshBasicMaterial({ color: '#FFE2A0' })); spinner.position.y = 217; cab.add(spinner);
  const flash = new THREE.PointLight(PAL.beacon, 0, 420, 1.6); flash.position.y = 220; cab.add(flash);

  // the wheels: fat tyres with yellow hubs and a spoke mark so you can see them roll
  const wheels = [];
  for (const [w, sz] of [[FRONT, 40], [BACK, 34]]) for (const s of [-1, 1]) {
    const axle = joint(heading, [s * 100, w.r, w.z]);
    const spin = joint(axle);
    const tyre = solid(new THREE.TorusGeometry(w.r - 14, 14, 20, 40), M.tyre); tyre.rotation.y = Math.PI / 2; tyre.scale.z = sz / 28; spin.add(tyre);
    const hub = solid(new THREE.CylinderGeometry(w.r - 16, w.r - 16, sz - 6, 32), M.body, { ink: 2 }); hub.rotation.z = Math.PI / 2; spin.add(hub);
    const cap = solid(new THREE.CylinderGeometry(9, 9, sz, 12), M.trim, { ink: 0 }); cap.rotation.z = Math.PI / 2; spin.add(cap);
    for (const a of [0, TAU / 3, (2 * TAU) / 3]) {
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, sz + 1, 8), M.dark);
      nut.rotation.z = Math.PI / 2; nut.position.set(0, Math.cos(a) * (w.r - 26), Math.sin(a) * (w.r - 26)); spin.add(nut);
    }
    wheels.push({ spin, r: w.r });
  }

  // the mast: outer rails fixed to the front, inner rails that telescope up for high lifts, and the
  // carriage with its backrest and two forks
  // (short, so it stays below her face until she lifts)
  const mast = joint(chassis, [0, -26, 146]);
  for (const s of [-1, 1]) { const rail = solid(roundBox(16, 124, 20, 6), M.trim, { ink: 2 }); rail.position.set(s * 88, 62, 0); mast.add(rail); }
  const topBar = solid(roundBox(192, 14, 20, 6), M.trim, { ink: 2 }); topBar.position.y = 124; mast.add(topBar);
  const inner = joint(mast, [0, 0, 8]);
  for (const s of [-1, 1]) { const rail = solid(roundBox(12, 116, 14, 5), M.steel, { ink: 2 }); rail.position.set(s * 74, 58, 0); inner.add(rail); }
  const innerTop = solid(roundBox(160, 12, 14, 5), M.steel, { ink: 2 }); innerTop.position.y = 116; inner.add(innerTop);
  const carriage = joint(mast, [0, 16, 18]);
  const plate = solid(roundBox(176, 32, 12, 6), M.dark, { ink: 2 }); plate.position.y = 16; carriage.add(plate);
  const rest = new THREE.Group(); rest.position.y = 32; carriage.add(rest);
  { const frame = solid(roundBox(160, 10, 10, 4), M.dark, { ink: 2 }); frame.position.y = 50; rest.add(frame);
    for (const x of [-74, -26, 26, 74]) { const bar = solid(roundBox(10, 52, 8, 3), M.dark, { ink: 2 }); bar.position.set(x, 25, 0); rest.add(bar); } }
  const forks = [-1, 1].map(s => {
    const pivot = joint(carriage, [s * 42, 8, 10]);
    const shank = solid(roundBox(22, 64, 12, 4), M.steel, { ink: 2 }); shank.position.y = 22; pivot.add(shank);
    const blade = solid(roundBox(24, 10, 160, 4), M.steel, { ink: 2 }); blade.position.set(0, -6, 78); pivot.add(blade);
    const tip = solid(roundBox(24, 6, 18, 3), M.steel, { ink: 2 }); tip.position.set(0, -4, 160); tip.rotation.x = 0.35; pivot.add(tip);
    return { pivot, s };
  });

  return {
    root, cab, carriage, forks: forks.map(f => f.pivot),
    // Where a thing resting on the forks should go (in the layer's world), for carrying crates.
    forkTop(target = new THREE.Vector3()) { carriage.updateWorldMatrix(true, false); return target.set(0, 7, 90).applyMatrix4(carriage.matrixWorld); },
    update(pose, { x = 0, y = 0, z = 0, scale = 1 } = {}) {
      const g = (k, d = 0) => pose[k] ?? d;
      root.position.set(x, -y, z); root.scale.setScalar(scale);
      heading.rotation.y = g('yaw');
      chassis.position.y = 44 + g('body.y');
      chassis.rotation.set(g('body.pitch'), 0, g('body.roll'));
      chassis.scale.set(1 / Math.sqrt(g('body.sy', 1)), g('body.sy', 1), 1 / Math.sqrt(g('body.sy', 1)));
      cab.rotation.set(g('cab.nod'), g('cab.yaw'), g('cab.tilt'), 'YXZ');
      const lift = clamp(g('forks.y')) * LIFT;
      inner.position.y = Math.max(0, lift - 70);             // the inner mast rises for the top of the lift
      carriage.position.y = 16 + lift;
      carriage.rotation.x = -g('forks.tilt');
      mast.rotation.x = -g('mast.tilt');
      for (const f of forks) {
        f.pivot.position.x = f.s * (42 + g('forks.spread') * 26);
        f.pivot.rotation.x = -g(f.s < 0 ? 'forkL.tilt' : 'forkR.tilt');
      }
      for (const w of wheels) w.spin.rotation.x = g('wheels') * (FRONT.r / w.r);
      const on = clamp(g('beacon')), spin = g('beacon.spin');
      spinner.rotation.y = spin; spinner.visible = on > 0.02;
      const pulse = on * (0.55 + 0.45 * Math.cos(spin * 2));
      domeMat.emissiveIntensity = 0.2 + pulse * 2.2; flash.intensity = pulse * 2.5e4;
      face.redraw(pose);
    },
  };
}

// ---------- bringing her to life ----------
export const REST = {
  'forks.y': 0.08, 'forks.tilt': 0.04, 'mouth.smile': 0.5, 'eyes.open': 1, 'eyes.mood': 0, 'beacon': 0,
};
const JOINTS = {
  'cab.yaw': { stiffness: 120, damping: 12 }, 'cab.tilt': { stiffness: 140, damping: 10 }, 'cab.nod': { stiffness: 160, damping: 11 },
  'forks.y': { stiffness: 90, damping: 13 }, 'forks.tilt': { stiffness: 160, damping: 10 }, 'forkL.tilt': { stiffness: 200, damping: 9 }, 'forkR.tilt': { stiffness: 200, damping: 9 },
  'yaw': { stiffness: 80, damping: 14 },
};

// Tilly at time t. moves as for choreo; path(t) -> [x, z] where she is on the floor (default: still),
// the wheels roll with it, and the chassis pitches on its springs as she speeds up and brakes.
// speaker picks her lines for the screen mouth (beeps, if she has any).
export function tillyPose(t, moves, { path = () => [0, 0], extra, speaker, seed = 5 } = {}) {
  const chore = u => choreo(u, REST, moves);
  let p = chore(t);
  for (const [k, feel] of Object.entries(JOINTS)) p[k] = spring(`tilly${seed}.${k}`, t, u => chore(u)[k] ?? 0, feel);
  if (extra) for (const [k, v] of Object.entries(extra(t))) p[k] = /\.sy$/.test(k) ? (p[k] ?? 1) * v : (p[k] ?? 0) + v;
  // driving: the distance rolled along the way she faces (so reversing rolls the wheels backwards),
  // and the pitch from speeding up and slowing down
  const fx = Math.sin(p.yaw ?? 0), fz = Math.cos(p.yaw ?? 0);
  const step = u => { const a = path(u - 1 / 60), b = path(u); return (b[0] - a[0]) * fx + (b[1] - a[1]) * fz; };
  const speedAt = u => step(u) * 60;
  let rolled = 0;
  for (let u = 1 / 60; u <= t; u += 1 / 60) rolled += step(u);
  p.wheels = (p.wheels ?? 0) + rolled / FRONT.r;
  const surge = lag(`tilly${seed}.surge`, t, speedAt, { stiffness: 120, damping: 8 });
  p['body.pitch'] = (p['body.pitch'] ?? 0) + clamp(surge * 0.0009, -0.12, 0.12);
  // idling: the engine's shiver, the beacon's turn, blinks and glances
  p['body.y'] = (p['body.y'] ?? 0) + Math.sin(t * 47) * 0.5 + Math.sin(t * 1.3 + seed) * 1.2;
  p['beacon.spin'] = t * 9;
  p['eyes.blink'] = Math.max(p['eyes.blink'] ?? 0, blink(t, seed));
  const gl = glance(t, seed);
  p['eyes.x'] = (p['eyes.x'] ?? 0) + gl[0] * 0.25; p['eyes.y'] = (p['eyes.y'] ?? 0) + gl[1] * 0.25;
  if (speaker) { const m = lipsync(t, { speaker }); p['mouth.open'] = Math.max(p['mouth.open'] ?? 0, m.open ?? 0); }
  return p;
}
