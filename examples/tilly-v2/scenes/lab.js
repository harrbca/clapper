// Tilly v2's lab: each panel is its own shot of her, rendered into its part of the frame.
//   clap still 0 --entry scenes/lab.js     from five sides, four faces, and her forks right up
//   clap still 1 --entry scenes/lab.js     her face from round the front, and where she looks
//   clap still 2 --entry scenes/lab.js     contacts: tyres on the floor, forks down and level, the mast
//   clap still 3 --entry scenes/lab.js     the lift, and the mast tilted both ways
//   clap still 4 --entry scenes/lab.js     close-ups wherever parts could meet
import { gradient, text } from '/@kit/draw.js';
import { layer3d, THREE } from '/@kit/scene3d.js';
import { tilly3dV2, tillyPose } from '/@kit/characters/tilly3d-v2.js';

let L, tilly;
export function setup(stage) {
  L = layer3d(stage, { fov: 24 });
  L.lights = L.studioLights({ key: 2.6, fill: 0.95, rim: 1.3 });
  const top = L.lights.top;
  top.position.set(0, 9000, 600);
  Object.assign(top.shadow.camera, { left: -3200, right: 3200, top: 3200, bottom: -3200, near: 1000, far: 20000 });
  top.shadow.camera.updateProjectionMatrix();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), new THREE.ShadowMaterial({ opacity: 0.32, color: 0x6b3a1e }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; L.scene.add(floor);
  tilly = tilly3dV2(L);
}

const still = keys => tillyPose(0, [{ t: -1, dur: 0.001, pose: keys }], { seed: 4 });
// From the camera's angle round her (0 is square on to her front), how high and how far, at what.
const orbit = (angle, height, dist, at) => ({ pos: [at[0] + Math.sin(angle) * dist, height, at[2] + Math.cos(angle) * dist], at });

// The page: a title, then each panel [[x, y, w, h], keys, view, label] rendered into its own part of the
// layer's canvas (posed as keys, seen from view), which then goes onto the frame, and the labels under them.
function frame(ctx, W, H, title, panels) {
  gradient(ctx, 0, 0, W, H, '#EAF3F6', '#C3D9E3');
  text(ctx, title, 40, 38, { size: 30, weight: 700, color: '#2B3A48', align: 'left' });
  const r = L.renderer, cam = L.camera;
  r.setScissorTest(false); r.setViewport(0, 0, W, H); r.setClearColor(0x000000, 0); r.clear();
  for (const [[x, y, w, h], keys, view] of panels) {
    tilly.update(still(keys));
    cam.aspect = w / h; cam.near = 100; cam.far = 60000;
    cam.position.set(...view.pos); cam.lookAt(...view.at); cam.updateProjectionMatrix();
    L.lights.rig.position.set(view.at[0], 0, view.at[2]);
    r.setScissorTest(true); r.setScissor(x, H - y - h, w, h); r.setViewport(x, H - y - h, w, h);   // (from the bottom)
    r.render(L.scene, cam);
  }
  r.setScissorTest(false); r.setViewport(0, 0, W, H);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(L.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
  for (const [[x, y, w, h], , , label] of panels) text(ctx, label, x + w / 2, y + h + 14, { size: 22, weight: 500, color: '#3B4A58' });
}

const MID = [0, 1150, 150];                        // her middle, roughly
const FACE = [0, 1480, 750];                       // her face
const PAGES = [
  // 0: five sides, four faces, forks up
  () => [
    ...[0, 45, 90, 135, 180].map((deg, i) => [[i * 384, 60, 384, 400], { yaw: (deg * Math.PI) / 180 }, orbit(0, 1500, 10200, MID), `${deg} degrees`]),
    [[0, 520, 384, 520], {}, orbit(-0.35, 1700, 6200, [0, 1350, 500]), 'neutral'],
    [[384, 520, 384, 520], { 'eyes.mood': 1, 'mouth.smile': 1 }, orbit(-0.35, 1700, 6200, [0, 1350, 500]), 'happy'],
    [[768, 520, 384, 520], { 'eyes.mood': 2, 'brows.up': 1, 'mouth.open': 0.6, 'mouth.round': 0.4 }, orbit(-0.35, 1700, 6200, [0, 1350, 500]), 'surprised'],
    [[1152, 520, 384, 520], { 'eyes.blink': 1 }, orbit(-0.35, 1700, 6200, [0, 1350, 500]), 'blink'],
    [[1536, 520, 384, 520], { 'forks.y': 1, 'forks.tilt': 0, 'eyes.y': -0.8, 'eyes.mood': 1, beacon: 1 }, orbit(0.6, 2000, 13500, [0, 2050, 300]), 'forks right up'],
  ],
  // 1: her face from round the front, and her looks
  () => [
    ...[-60, -30, 0, 30, 60].map((deg, i) => [[i * 384, 60, 384, 460], { 'cab.yaw': 0 }, orbit((deg * Math.PI) / 180, 1600, 4200, FACE), `seen from ${deg}`]),
    ...[[{ 'eyes.x': -1 }, 'eyes.x -1'], [{ 'eyes.x': 1 }, 'eyes.x 1'], [{ 'eyes.y': -1 }, 'eyes.y -1'], [{ 'cab.yaw': 1 }, 'cab.yaw 1'], [{ 'eyes.mood': 3, 'mouth.smile': 0.1 }, 'cross'], [{ 'eyes.mood': 4, 'mouth.smile': 0 }, 'sad']]
      .map(([keys, label], i) => [[i * 320, 580, 320, 460], keys, orbit(0, 1600, 4600, FACE), label]),
  ],
  // 2: contacts, low down
  () => [
    [[0, 60, 640, 460], {}, { pos: [2600, 160, 3000], at: [480, 300, 400] }, 'tyres on the floor'],
    [[640, 60, 640, 460], { 'forks.y': 0, 'forks.tilt': 0 }, { pos: [5600, 140, 1750], at: [0, 140, 1750] }, 'forks down, level (side)'],
    [[1280, 60, 640, 460], { 'forks.y': 0, 'forks.tilt': 0 }, { pos: [0, 90, 5200], at: [0, 90, 1800] }, 'forks on the floor, head on'],
    [[0, 580, 640, 460], {}, { pos: [2300, 1250, 2700], at: [480, 950, 1000] }, 'tilt cylinder, cowl and mast'],
    [[640, 580, 640, 460], {}, { pos: [-2600, 800, -3200], at: [0, 550, -800] }, 'counterweight and steer wheel'],
    [[1280, 580, 640, 460], { 'forks.y': 0.2 }, { pos: [1500, 1500, 3200], at: [0, 1050, 1150] }, 'free lift: chains and sheaves'],
  ],
  // 3: the lift, and the tilt
  () => [
    ...[0, 0.25, 0.5, 0.75, 1].map((k, i) => [[i * 384, 60, 384, 600], { 'forks.y': k, 'forks.tilt': 0 }, orbit(1.2, 2200, 14000, [0, 2100, 600]), `forks.y ${k}`]),
    [[0, 720, 480, 320], { 'forks.tilt': -0.2, 'forks.y': 0.1 }, orbit(Math.PI / 2, 1100, 7400, [0, 1000, 800]), 'tilted forward (-0.2)'],
    [[480, 720, 480, 320], { 'forks.tilt': 0.3, 'forks.y': 0.1 }, orbit(Math.PI / 2, 1100, 7400, [0, 1000, 800]), 'tilted back (0.3)'],
    [[960, 720, 480, 320], { 'body.pitch': 0.12, 'body.sy': 0.94 }, orbit(Math.PI / 2, 1100, 7400, [0, 1000, 300]), 'braking (pitch 0.12, sy 0.94)'],
    [[1440, 720, 480, 320], { steer: 0.9, 'forkL.tilt': 0.4, 'forks.spread': 1 }, orbit(2.4, 3200, 9000, [0, 700, 0]), 'steer 0.9, forks spread'],
  ],
  // 4: close-ups where parts could meet
  () => [
    [[0, 60, 640, 460], { 'forks.tilt': -0.2 }, { pos: [2500, 450, 1150], at: [450, 450, 1150] }, 'drive tyre and mast, tilted forward'],
    [[640, 60, 640, 460], { 'forks.tilt': 0.3 }, { pos: [2600, 900, 1000], at: [450, 900, 1000] }, 'mast tilted back: cowl, mudguard (side on)'],
    [[1280, 60, 640, 460], { steer: 1.2 }, { pos: [150, 90, -2900], at: [300, 280, -800] }, 'steer wheels turned right round (low, behind)'],
    [[0, 580, 640, 460], { 'forks.y': 0.4, 'forks.spread': 0 }, { pos: [700, 2700, 700], at: [0, 1600, 1350] }, 'carriage from above: hooks, anchors'],
    [[640, 580, 640, 460], {}, { pos: [950, 1300, 1450], at: [480, 1180, 860] }, 'guard leg on the cowl'],
    [[1280, 580, 640, 460], {}, { pos: [500, 2550, 450], at: [0, 1560, 1200] }, 'the mast\'s top, lowered, from behind'],
  ],
];
const TITLES = ['Tilly v2: turnaround, faces, forks up', 'Tilly v2: her face from every side', 'Tilly v2: contacts', 'Tilly v2: lift and tilt', 'Tilly v2: close-ups'];

export function render({ ctx, W, H }, t) {
  const page = Math.max(0, Math.min(PAGES.length - 1, Math.round(t)));
  frame(ctx, W, H, TITLES[page], PAGES[page]());
}
