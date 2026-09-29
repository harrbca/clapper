// Tilly from four sides, in four moods:  clap still 0 --entry scenes/lab-tilly.js
import { gradient, text } from '/@kit/draw.js';
import { layer3d } from '/@kit/scene3d.js';
import { tilly3d, tillyPose } from '/@kit/characters/tilly3d.js';

let L = null, bots = [];
const FLOOR = 820;
export function setup(stage) {
  L = layer3d(stage);
  L.lights = L.studioLights();
  L.shadowFloor(FLOOR, 0.35);
  bots = [0, 1, 2, 3].map(() => tilly3d(L));
}

const SETUPS = [
  [260, 0.55, { 'eyes.mood': 0 }, 'normal'],
  [760, 1.4, { 'eyes.mood': 1, 'forks.y': 0.45, 'forks.tilt': 0.2, beacon: 1, 'cab.yaw': -0.5 }, 'happy, lifting'],
  [1250, -0.45, { 'eyes.mood': 2, 'forks.y': 1, 'cab.tilt': 0.15, 'mouth.open': 0.7, 'brows.up': 1 }, 'wow, full lift'],
  [1720, 2.5, { 'eyes.mood': 3, 'forkL.tilt': 0.5, 'cab.yaw': 0.6 }, 'cross, from behind'],
];

export function render({ ctx, W, H }, t) {
  gradient(ctx, 0, 0, W, H, '#EAF3F6', '#C3D9E3');
  SETUPS.forEach(([x, yaw, keys, label], i) => {
    bots[i].update(tillyPose(t + i * 3, [{ t: -1, dur: 0.001, pose: { yaw, ...keys } }], { seed: i + 2 }), { x, y: FLOOR, scale: 1.25 });
    text(ctx, label, 990 + (x - 990) * 0.78, 930, { size: 26, weight: 500, color: '#3B4A58' });
  });
  L.camera.position.set(990, -330, 4300); L.camera.lookAt(990, -600, 0);
  L.camera.near = 100; L.camera.far = 30000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(960, -640, 0);
  L.draw(ctx);
}
