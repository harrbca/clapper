// Pip in 3D from four sides, and some faces:  clap still 0 --entry scenes/lab-pip.js
import { gradient, text } from '/@kit/draw.js';
import { layer3d } from '/@kit/scene3d.js';
import { EXPR3, pip3d, pip3dPose } from '/@kit/characters/pip3d.js';

let L = null, pips = [];
const FLOOR = 1000;
export function setup(stage) {
  L = layer3d(stage);
  L.lights = L.studioLights();
  L.shadowFloor(FLOOR, 0.3);
  pips = [0, 1, 2, 3].map(() => pip3d(L));
}

const SETUPS = [
  [300, 0, { ...EXPR3.happy }, 'front'],
  [760, 0.7, { ...EXPR3.surprised, 'handR.x': 150, 'handR.y': 720, 'handR.z': 120, 'handR.form': 0, 'handR.px': 0, 'handR.pz': 1 }, '3/4, wave'],
  [1200, 1.5, { ...EXPR3.skeptical, 'handL.x': -60, 'handL.y': 420, 'handL.z': 110, 'handR.x': 60, 'handR.y': 430, 'handR.z': 110, 'handL.px': 0.3, 'handL.pz': -1, 'handR.px': -0.3, 'handR.pz': -1 }, 'side'],
  [1640, 2.6, { ...EXPR3.neutral, 'head.turn': -0.6 }, 'from behind'],
];

export function render({ ctx, W, H }, t) {
  gradient(ctx, 0, 0, W, H, '#EAF3F6', '#C3D9E3');
  SETUPS.forEach(([x, yaw, keys, label], i) => {
    pips[i].update(pip3dPose(t + i * 2, [{ t: -1, dur: 0.001, pose: { yaw, ...keys } }], { id: `lab${i}`, seed: i + 1 }), { x, y: FLOOR, scale: 0.9 });
    text(ctx, label, 970 + (x - 970) * 0.82, 1050, { size: 26, weight: 500, color: '#3B4A58' });
  });
  L.camera.position.set(970, -560, 5000); L.camera.lookAt(970, -600, 0);
  L.camera.near = 100; L.camera.far = 30000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(970, -600, 0);
  L.draw(ctx);
}
