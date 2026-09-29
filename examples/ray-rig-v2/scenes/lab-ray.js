// Ray, still: turned four ways (t = 0), his face close from the front and three-quarters (1), his
// hands and arms (2), and poses that bend him: arms up, reaching, crouching (3).
// 4 and 5 are 2 and 3 from his side.   clap still 0 1 2 3 4 5 --entry scenes/lab-ray.js
import { gradient } from '/@kit/draw.js';
import { layer3d } from '/@kit/scene3d.js';
import { HAND } from '/@kit/hand3d.js';
import { RAY_EXPR, RAY_REST, ray3d } from '/@kit/characters/ray3d.js';

let L, R = [];
export function setup(stage) {
  L = layer3d(stage, { fov: 22 });
  L.lights = L.studioLights({ fill: 0.8, key: 2.7 });
  R = [0, 1, 2, 3].map(() => ray3d(L));
}

const POSES = {
  0: [{}, {}, {}, {}],
  1: [RAY_EXPR.happy, { ...RAY_EXPR.skeptical, 'mouth.open': 0.5 }, {}, {}],
  2: [
    { ...HAND.point('handR'), 'handR.x': 330, 'handR.y': 1330, 'handR.z': 330, 'handR.px': 0, 'handR.py': -0.3, 'handR.pz': -1,
      ...HAND.open('handL'), 'handL.x': -300, 'handL.y': 1250, 'handL.z': 250, 'handL.px': 0, 'handL.py': 0, 'handL.pz': 1 },
    { ...HAND.thumbsUp('handR'), 'handR.x': 200, 'handR.y': 1150, 'handR.z': 330, 'handR.px': -1, 'handR.py': 0, 'handR.pz': 0,
      ...HAND.count('handL', 3), 'handL.x': -180, 'handL.y': 1300, 'handL.z': 300, 'handL.px': 0, 'handL.py': 0, 'handL.pz': -1 },
    {}, {},
  ],
  3: [
    { 'handL.x': -420, 'handL.y': 1800, 'handL.z': 100, 'handR.x': 420, 'handR.y': 1800, 'handR.z': 100, 'handL.px': 0, 'handL.pz': 1, 'handR.px': 0, 'handR.pz': 1, ...HAND.open('handL'), ...HAND.open('handR') },
    { 'torso.rx': 0.5, 'head.rx': -0.2, 'handR.x': 120, 'handR.y': 700, 'handR.z': 520, 'handR.px': 0, 'handR.py': -1, ...HAND.reach('handR') },
    { 'hips.y': -260, 'torso.rx': 0.35, 'footL.z': 60, 'footR.z': -40, 'handL.x': -230, 'handL.y': 520, 'handL.z': 360, 'handR.x': 230, 'handR.y': 520, 'handR.z': 360 },
    { 'torso.ry': 0.6, 'head.turn': 0.6, 'torso.rz': 0.15, 'handL.x': -250, 'handL.y': 1050, 'handL.z': 250 },
  ],
};

export function render({ ctx, W, H }, t) {
  gradient(ctx, 0, 0, W, H, '#EEF3F5', '#C6D7E0');
  const view = Math.round(t);
  // 4, 5: views 2 and 3 from his left side
  const side = view >= 4 ? Math.PI / 2 : 0, pv = view >= 4 ? view - 2 : view;
  const yaws = (view === 1 ? [0, 0.6, 0, 0] : view === 0 ? [0, 0.8, Math.PI / 2, Math.PI] : [0.25, -0.25, 0.3, -0.5]).map(y => y + side);
  const n = view === 1 || pv === 2 ? 2 : 4;
  R.forEach((r, i) => {
    r.root.visible = i < n;
    if (i >= n) return;
    const x = (i - (n - 1) / 2) * (view === 1 ? 300 : n === 2 ? 700 : 480);
    r.update({ ...RAY_REST, yaw: yaws[i], ...POSES[pv][i] }, { x, y: 1000, scale: 0.55 });
  });
  if (view === 1) { L.camera.position.set(0, -95, 900); L.camera.lookAt(0, -95, 0); }
  else { L.camera.position.set(0, -520, 3500); L.camera.lookAt(0, -520, 0); }
  L.camera.near = 50; L.camera.far = 30000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(0, -500, 0);
  L.draw(ctx);
}
