// A 3D starter: Pip at a desk with a label printer. When she says "print", a label prints; when she
// says "read", it comes up to the camera. Draw everything from t and the cues, never from the last
// frame, so any frame can be drawn on its own, in any order.
//
// Units are millimetres, as the printers are. 3D Pip is modelled 910 tall in her own units, so she
// stands at scale 1.8 (about 1.64 m). The README's "Making a 3D video" has the rest: cameras, scale,
// and how to check your frames.
import { clamp, E, inv, on, track } from '/@kit/core.js';
import { caption } from '/@kit/captions.js';
import { decorativeBars } from '/@kit/props3d.js';
import { fitDistance, layer3d, paintedTexture, poseBetween, poseInFront, THREE } from '/@kit/scene3d.js';
import { toon } from '/@kit/toon3d.js';
import { desk3d, labelPrinter3d, printedLabel } from '/@kit/printers3d.js';
import { EXPR3, pip3d, pip3dPose } from '/@kit/characters/pip3d.js';
import { cue, TL } from '/@kit/timeline.js';
import { FEED } from '/timeline.js';

const PIP = { x: 1150, z: 200, scale: 1.8, yaw: -0.35 };   // beside the desk, turned a little towards it
let L, printer, label, pip;

export function setup(stage) {
  L = layer3d(stage, { fov: 30 });
  L.lights = L.studioLights({ key: 2.6, fill: 0.95, rim: 1.3 });
  Object.assign(L.lights.top.shadow.camera, { left: -2000, right: 2000, top: 2000, bottom: -2000 });
  // the room: a floor and a wall
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12000, 8000), toon('#CFC3B2'));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; L.scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12000, 5000), toon('#B9CBD6'));
  wall.position.set(0, 2500, -600); wall.receiveShadow = true; L.scene.add(wall);
  // a desk, and the label printer on it
  const desk = desk3d({ w: 1400 }); L.scene.add(desk.group);
  desk.group.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  printer = labelPrinter3d(); printer.group.position.set(-150, desk.top, -80); L.scene.add(printer.group);
  // the label, drawn here; a picture of a real one works too: printedLabel(await loadPicture('/assets/label.png'))
  label = printedLabel(paintedTexture(600, 900, drawLabel)); L.scene.add(label.group);
  pip = pip3d(L);
}

// A made-up 4 x 6 label. The bars are decorative: nothing in a video should scan for real.
function drawLabel(g, w, h) {
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#111111'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.font = '800 44px Roboto'; g.fillText('YOUR COMPANY', 30, 70);
  g.fillRect(30, 90, w - 60, 5);
  g.font = '600 22px Roboto'; g.fillText('SHIP TO', 30, 140);
  g.font = '700 40px Roboto'; ['A CUSTOMER', '12 ANY STREET', 'ANYTOWN'].forEach((s, i) => g.fillText(s, 30, 190 + i * 48));
  g.fillRect(30, 350, w - 60, 4);
  g.font = '600 22px Roboto'; g.fillText('ORDER', 30, 395);
  g.font = '800 64px Roboto'; g.fillText('1001', 30, 465);
  decorativeBars(g, 60, 560, w - 120, 180, 'ORDER 1001');
  g.font = '500 26px Roboto'; g.textAlign = 'center'; g.fillText('1001', w / 2, 790);
  g.font = '400 20px Roboto'; g.fillText('made with Clapper', w / 2, 860);
}

// The camera: the whole set, then in closer as the label prints, still with Pip in the shot, drifting
// a little while it holds. Keys at the same time would cut instead of move.
const key = (t, keys) => ({ pos: track(t, keys.map(([a, p]) => [a, p.pos])), at: track(t, keys.map(([a, p]) => [a, p.at])) });
const camera = t => key(t, [
  [0, { pos: [700, 1500, 4200], at: [450, 950, 0] }],
  [cue.print - 0.3, { pos: [650, 1480, 4000], at: [450, 960, 0] }],
  [cue.print + 0.9, { pos: [560, 1420, 3050], at: [520, 1090, 40] }],
  [TL.dur, { pos: [520, 1410, 2950], at: [520, 1090, 40] }],
]);

// What Pip does: she points at the printer on "print", and looks back at us on "read".
const MOVES = [
  { t: -1, dur: 0.001, pose: { ...EXPR3.neutral, 'mood.smile': 0.5 } },
  { t: cue.print - 0.3, dur: 0.45, pose: { 'handL.x': -250, 'handL.y': 560, 'handL.z': 200, 'handL.form': 1, 'handL.px': 0, 'handL.py': -1, 'head.turn': -0.7, 'eyes.x': -0.6 } },
  { t: cue.fed + 0.2, dur: 0.6, pose: { 'handL.x': -122, 'handL.y': 356, 'handL.z': 14, 'handL.form': 4, 'handL.px': 1, 'handL.py': 0, 'head.turn': -0.4, 'eyes.x': -0.3 } },
  { t: cue.read - 0.2, dur: 0.5, pose: { 'head.turn': 0, 'eyes.x': 0, 'mood.smile': 0.9 } },
];

export function render({ ctx, W, H }, t) {
  const cam = camera(t);
  L.camera.position.set(...cam.pos); L.camera.lookAt(...cam.at);
  L.camera.near = 30; L.camera.far = 40000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(cam.at[0], 0, cam.at[2]);

  // the printer's screen and lights, and the label: printing, then up to the camera
  const printing = t >= cue.feed - 0.3 && t < cue.fed + 0.3;
  printer.update({ screen: printing ? { state: 'printing', sub: 'Order 1001', name: 'Label printer' } : { state: 'ready', name: 'Label printer' },
    led: { data: printing && Math.floor(t * 8) % 2 ? 'green' : 'off' } });
  if (t < cue.read) printer.hang(label, t < cue.feed ? 0 : label.pitch * E.io(clamp((t - cue.feed) / FEED)));
  else {
    const front = poseInFront(L.camera, fitDistance(L.camera, label.pitch, 0.8));
    const p = poseBetween(printer.hung(label), front, E.io(inv(cue.read, cue.read + 0.9, t)), 60);
    label.place(p.c, p.f, p.u);
  }

  // Pip: breathing, blinking, and lip-synced to her own lines
  const pose = pip3dPose(t, MOVES, { speaker: 'pip' });
  pose.yaw = PIP.yaw;
  pip.update(pose, { x: PIP.x, y: 0, z: PIP.z, scale: PIP.scale });

  ctx.fillStyle = '#B9CBD6'; ctx.fillRect(0, 0, W, H);
  L.draw(ctx);
  caption(ctx, t);
  const black = Math.max(1 - on(t, 0, 0.5), on(t, TL.dur - 0.8, 0.8));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
