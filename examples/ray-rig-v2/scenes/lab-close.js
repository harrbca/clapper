// Ray close: his hands (a fist, pointing, OK) and his face, to judge the mesh at its size in a shot.
//   clap still 0 1 --entry scenes/lab-close.js
import { gradient } from '/@kit/draw.js';
import { layer3d } from '/@kit/scene3d.js';
import { HAND } from '/@kit/hand3d.js';
import { RAY_REST, ray3d } from '/@kit/characters/ray3d.js';
let L, R;
export function setup(stage) { L = layer3d(stage, { fov: 22 }); L.lights = L.studioLights({ fill: 0.8, key: 2.7 }); R = ray3d(L); }
export function render({ ctx, W, H }, t) {
  gradient(ctx, 0, 0, W, H, '#EEF3F5', '#C6D7E0');
  const pose = { ...RAY_REST, yaw: 0.35, ...HAND.ok('handR'), 'handR.x': 200, 'handR.y': 1250, 'handR.z': 300, 'handR.px': 0, 'handR.py': 0, 'handR.pz': 1,
    ...HAND.point('handL'), 'handL.x': -250, 'handL.y': 1150, 'handL.z': 330, 'handL.px': 1, 'handL.py': 0, 'handL.pz': 0 };
  R.update(pose, { x: 0, y: 1000, scale: 0.55 });
  const at = Math.round(t) === 0 ? [30, -330, 0] : [0, -95, 0];
  L.camera.position.set(at[0] + 60, at[1] + 20, 700); L.camera.lookAt(...at);
  L.camera.near = 20; L.camera.far = 20000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(0, -400, 0);
  L.draw(ctx);
}
