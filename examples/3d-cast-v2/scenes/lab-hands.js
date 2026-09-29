// Pip in 3D, close: hands (open and waving, pointing, thumbs up, fists) and faces:  clap still 0 --entry scenes/lab-hands.js
import { gradient } from '/@kit/draw.js';
import { layer3d } from '/@kit/scene3d.js';
import { EXPR3, pip3d, pip3dPose } from '/@kit/characters/pip3d.js';
let L = null, P = [];
export function setup(stage) { L = layer3d(stage); L.lights = L.studioLights({ fill: 0.75, key: 3 }); P = [0, 1, 2].map(() => pip3d(L)); }
const WAVE = { 'handR.x': 150, 'handR.y': 720, 'handR.z': 120, 'handR.form': 0, 'handR.px': 0, 'handR.pz': 1 };
const S = [[520, 0.3, { ...EXPR3.happy, ...WAVE }], [975, 0, { ...EXPR3.laugh, 'handL.form': 1, 'handL.x': -200, 'handL.y': 560, 'handL.z': 160, 'handR.form': 3, 'handR.x': 150, 'handR.y': 520, 'handR.z': 120 }], [1430, -0.4, { ...EXPR3.angry, 'handL.form': 2, 'handR.form': 2, 'handL.x': -150, 'handL.y': 440, 'handL.z': 60, 'handR.x': 150, 'handR.y': 440, 'handR.z': 60 }]];
export function render({ ctx, W, H }, t) {
  gradient(ctx, 0, 0, W, H, '#EAF3F6', '#C3D9E3');
  S.forEach(([x, yaw, k], i) => P[i].update(pip3dPose(0, [{ t: -1, dur: 0.001, pose: { yaw, ...k } }], { id: `d${i}` }), { x, y: 1000 }));
  L.camera.position.set(975, -330, 3300); L.camera.lookAt(975, -330, 0);
  L.camera.near = 100; L.camera.far = 30000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(975, -330, 0);
  L.draw(ctx);
}
