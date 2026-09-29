// Tilly v2 in a corner of a warehouse: she drives in along the racking, swings round to her mark and
// brakes, says hello, lifts her forks all the way up and brings them down again (with the mast up, its
// rails cross her eyes), looks round, and smiles. All in millimetres: Tilly v2 is real size (scale 1);
// the kit's racking and pallets are scaled 1.8 to stand with her.
//   clap still 0 --entry scenes/lab.js     her lab (pages 0 to 4)
import { E, inv, lerp, on, track, wiggle } from '/@kit/core.js';
import { caption } from '/@kit/captions.js';
import { grade } from '/@kit/finish.js';
import { mouth } from '/@kit/lipsync.js';
import { moves } from '/@kit/puppet.js';
import { layer3d, THREE } from '/@kit/scene3d.js';
import { roundBox, solid, toon } from '/@kit/toon3d.js';
import { palletLoad, rack3d } from '/@kit/props3d.js';
import { driveAlong, tilly3dV2, tillyPose } from '/@kit/characters/tilly3d-v2.js';
import { cue as c, line, TL } from '/@kit/timeline.js';

let L, tilly;
export function setup(stage) {
  L = layer3d(stage, { fov: 30 });
  L.lights = L.studioLights({ key: 2.6, fill: 0.95, rim: 1.3 });
  const top = L.lights.top;
  top.position.set(0, 9000, 600);
  Object.assign(top.shadow.camera, { left: -5000, right: 5000, top: 5000, bottom: -5000, near: 1000, far: 20000 });
  top.shadow.camera.updateProjectionMatrix();
  warehouse(L);
  tilly = tilly3dV2(L);
}

// ---------- the set ----------
function warehouse(L) {
  const S = new THREE.Group(); L.scene.add(S);
  const flat = (w, h, color, pos, rotX = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), toon(color)); m.position.set(...pos); m.rotation.x = rotX; m.receiveShadow = true; S.add(m); return m; };
  flat(40000, 30000, '#D5CAB6', [0, 0, 0], -Math.PI / 2);                    // the floor
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(40000, 30000), new THREE.ShadowMaterial({ opacity: 0.28, color: 0x6b3a1e }));
  shade.rotation.x = -Math.PI / 2; shade.position.y = 2; shade.receiveShadow = true; S.add(shade);   // shadows the toon floor alone keeps too faint
  for (const x of [-2800, 2900]) flat(110, 14000, '#F2B81B', [x, 1, 2500], -Math.PI / 2);   // the aisle's lines
  flat(40000, 90, '#F2B81B', [0, 1, -2350], -Math.PI / 2);
  flat(40000, 9000, '#A9C1CE', [0, 4500, -5000]);                            // the back wall
  flat(40000, 1100, '#93AEBD', [0, 550, -4990]);
  // racking along the back, stocked with pallets: 2.7 m bays, 1 x 1.26 m pallets
  const rack = rack3d({ bays: 4, bayW: 1500, levels: [880, 1740], depth: 620, height: 2300 });
  rack.group.scale.setScalar(1.8); rack.group.position.set(0, 0, -3600); S.add(rack.group);
  let seed = 1;
  for (let b = 0; b < 4; b++) for (const lv of [-1, 0, 1]) for (const dx of [-370, 370]) {
    if ((b * 7 + lv * 3 + (dx > 0 ? 1 : 0) + 6) % 5 === 0) continue;       // a few empty places
    const load = palletLoad({ w: 560, d: 700, cols: 2, rows: 2, layers: lv < 0 ? 3 : 2, seed: seed++ });
    load.position.copy(rack.spot(b, lv)).add(new THREE.Vector3(dx, 0, 0)); rack.group.add(load);
  }
  // a stack waiting on the floor, and traffic cones by the aisle
  const stack = palletLoad({ w: 560, d: 700, cols: 2, rows: 2, layers: 3, seed: 40 });
  stack.scale.setScalar(1.8); stack.position.set(4300, 0, 300); stack.rotation.y = 0.12; S.add(stack);
  for (const [x, z] of [[-3300, 1800], [-3150, 2600]]) {
    const cone = solid(new THREE.ConeGeometry(120, 520, 24), toon('#FF7A1A'), { ink: 2 }); cone.position.set(x, 280, z); S.add(cone);
    const base = solid(roundBox(300, 36, 300, 12), toon('#FF7A1A'), { ink: 2 }); base.position.set(x, 18, z); S.add(base);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(70, 86, 60, 24, 1, true), toon('#FFFFFF')); band.position.set(x, 300, z); S.add(band);
  }
  return S;
}

// ---------- Tilly ----------
// She comes along the aisle in front of the racking, heading to our right, and swings round to her
// mark facing us, a little to our right: a curve from where she starts to where she stops.
const MARK = { x: 300, z: 900, yaw: 0.45 };
const P0 = [-8200, -1500], P1 = [-3600, -1500], P3 = [MARK.x, MARK.z];
const P2 = [MARK.x - 1900 * Math.sin(MARK.yaw), MARK.z - 1900 * Math.cos(MARK.yaw)];
const bezier = k => [0, 1].map(i => (1 - k) ** 3 * P0[i] + 3 * (1 - k) ** 2 * k * P1[i] + 3 * (1 - k) * k * k * P2[i] + k ** 3 * P3[i]);
const smooth = k => k * k * (3 - 2 * k);
const path = t => bezier(smooth(inv(c.go, c.stop, t)));

const bump = (t, t0, d) => { const k = (t - t0) / d; return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; };
const HELLO = line('hello').start;
const MOVES = moves([
  { t: -1, dur: 0.001, pose: { beacon: 1, 'mouth.smile': 0.55, 'eyes.x': 0.55, 'eyes.y': 0.1 } },   // looking where she goes
  { t: c.stop - 0.5, dur: 0.35, pose: { 'eyes.x': -0.1, 'eyes.y': 0 } },                              // then at us
  { t: HELLO, dur: 0.25, pose: { 'eyes.mood': 1, 'mouth.smile': 0.95 }, ease: E.snap },               // morning!
  { t: HELLO + 1.4, dur: 0.3, pose: { 'eyes.mood': 0, 'mouth.smile': 0.6 } },
  // up go the forks, and she looks up at them
  { t: c.lift - 0.3, dur: 0.45, pose: { 'eyes.y': -0.95, 'cab.nod': -0.25, 'eyes.x': 0.1 } },
  { t: c.lift, dur: c.top - c.lift, pose: { 'forks.y': 1, 'forks.tilt': 0 }, ease: E.io },
  { t: c.top - 0.1, dur: 0.12, pose: { 'eyes.mood': 2, 'brows.up': 1 }, ease: E.snap },
  // and down again, following them with her eyes
  { t: c.down, dur: c.low - c.down, pose: { 'forks.y': 0.08, 'forks.tilt': 0.04 }, ease: E.io },
  { t: c.down + 0.1, dur: 0.4, pose: { 'eyes.mood': 0, 'brows.up': 0.3 } },
  { t: c.down + 0.3, dur: c.low - c.down - 0.3, pose: { 'eyes.y': 0.2, 'cab.nod': 0.1 } },
  { t: c.low - 0.1, dur: 0.35, pose: { 'eyes.y': 0, 'cab.nod': 0, 'eyes.x': -0.1, 'brows.up': 0 } },
  // what have we got? a look to our left at the racking, then right
  { t: c.look - 0.35, dur: 0.3, pose: { 'eyes.x': -1, 'cab.yaw': -0.6, 'eyes.y': 0.15 }, ease: E.snap },
  { t: c.look + 1.0, dur: 0.35, pose: { 'eyes.x': 1, 'cab.yaw': 0.55, 'eyes.y': 0 }, ease: E.snap },
  // back to us, and a smile; then she waves a fork
  { t: c.smile - 0.55, dur: 0.3, pose: { 'eyes.x': -0.05, 'cab.yaw': 0 } },
  { t: c.smile - 0.1, dur: 0.22, pose: { 'eyes.mood': 1, 'mouth.smile': 1 }, ease: E.snap },
  { t: c.wave, dur: 0.18, pose: { 'forkR.tilt': 0.32 }, ease: E.snap }, { t: c.wave + 0.24, dur: 0.18, pose: { 'forkR.tilt': 0 } },
  { t: c.wave + 0.45, dur: 0.18, pose: { 'forkR.tilt': 0.32 }, ease: E.snap }, { t: c.wave + 0.69, dur: 0.2, pose: { 'forkR.tilt': 0 } },
]);
const extra = t => ({
  'body.sy': 1 - bump(t, c.stop - 0.1, 0.35) * 0.05 + bump(t, c.smile - 0.05, 0.3) * 0.03,
  'body.roll': wiggle(t, c.stop - 0.05, 1.0, 0.03, 2.2),
  'cab.tilt': wiggle(t, HELLO, 0.9, 0.14, 1.6) + wiggle(t, c.smile, 0.9, 0.1, 1.8),
  'body.y': bump(t, c.smile - 0.05, 0.3) * 8,
});

// Her pose at t: driven along the path, lip-synced to her lines.
function pose(t) {
  const d = driveAlong(path, t);
  const p = tillyPose(t, MOVES, { speaker: 'tilly', extra });
  p.yaw = (p.yaw ?? 0) + d.yaw; p.steer = d.steer; p.wheels = d.wheels; p['body.pitch'] = (p['body.pitch'] ?? 0) + d.pitch;
  const m = mouth(t, { speaker: 'tilly' });
  for (const k of ['wide', 'round', 'teeth', 'tongue', 'press']) p[`mouth.${k}`] = m[k];
  return { p, d };
}

// ---------- the camera ----------
// Wide as she comes in, in to her as she says hello, back and up for the forks, in again for the smile.
const CAM = [
  [0, [2400, 2000, 9800, -2000, 1200, -700]],
  [2.2, [2000, 1900, 9400, -700, 1200, 0]],
  [c.stop + 0.5, [1500, 1700, 8600, 380, 1250, 1000]],
  [c.lift - 0.4, [1200, 1650, 7200, 420, 1300, 1100]],
  [c.top + 0.2, [1700, 2000, 9600, 420, 1900, 1100]],
  [c.down + 0.3, [1700, 2000, 9600, 420, 1900, 1100]],
  [c.low + 0.2, [1400, 1750, 8000, 420, 1400, 1100]],
  [c.smile - 0.6, [1350, 1750, 7700, 420, 1420, 1100]],
  [c.smile + 0.6, [1100, 1800, 5800, 520, 1520, 1300]],
  [c.wave - 0.15, [1100, 1800, 5800, 520, 1520, 1300]],
  [c.wave + 0.5, [1350, 1600, 7600, 480, 1150, 1400]],          // back a little, to see her wave a fork
  [TL.dur, [1380, 1600, 7750, 480, 1150, 1400]],
];
const camera = t => { const v = track(t, CAM, E.io); return { pos: v.slice(0, 3), at: v.slice(3) }; };

export function render({ ctx, W, H }, t) {
  const { p, d } = pose(t);
  tilly.update(p, { x: d.x, z: d.z });
  const cam = camera(t);
  L.camera.position.set(...cam.pos); L.camera.lookAt(...cam.at);
  L.camera.near = 50; L.camera.far = 60000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(lerp(cam.at[0], d.x, 0.5), 0, lerp(cam.at[2], d.z, 0.5));
  ctx.fillStyle = '#A9C1CE'; ctx.fillRect(0, 0, W, H);
  L.draw(ctx);
  grade(ctx, { edges: 0.2 });
  caption(ctx, t);
  const black = Math.max(1 - on(t, 0, 0.4), on(t, TL.dur - 0.6, 0.6));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
