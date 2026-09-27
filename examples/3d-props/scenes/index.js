// The 3D props, in a corner of a warehouse: racking with old and new bin labels, cartons on pallets,
// Pip in a hi-vis vest scanning an old label, a new label with its backing half peeled in her other hand.
//   clap still 3
import { E, inv } from '/@kit/core.js';
import { layer3d, paintedTexture, THREE } from '/@kit/scene3d.js';
import { roundBox, solid, toon } from '/@kit/toon3d.js';
import { label3d, palletLoad, rack3d, scanner3d } from '/@kit/props3d.js';
import { EXPR3, GRIP, pip3d, pip3dPose } from '/@kit/characters/pip3d.js';

let L, rack, pip, inHand, held;
const screen = paintedTexture(480, 800, (g, w, h, t = 0) => {         // a made-up app, for the demo
  g.fillStyle = '#14213D'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '500 26px Roboto'; g.textAlign = 'left'; g.fillText('Aisle A', 24, 48);
  g.textAlign = 'right'; g.fillText('3 done', w - 24, 48);
  g.textAlign = 'center'; g.fillStyle = '#FFFFFF'; g.font = '700 150px Roboto'; g.fillText('A1-01', w / 2, 330);
  g.font = '400 44px Roboto'; g.fillText('Scan new label', w / 2, 470);
  g.strokeStyle = '#FFFFFF'; g.lineWidth = 4; g.beginPath(); g.roundRect(60, 640, w - 120, 80, 40); g.stroke();
  g.font = '500 36px Roboto'; g.fillText('Cancel', w / 2, 693);
});

export function setup(stage) {
  L = layer3d(stage, { fov: 24 });
  L.lights = L.studioLights({ key: 2.6, fill: 0.9 });
  Object.assign(L.lights.top.shadow.camera, { left: -2000, right: 2000, top: 2000, bottom: -2000 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8000, 6000), toon('#D8CDBA')); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; L.scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(8000, 3000), toon('#A7C0CE')); wall.position.set(0, 1500, -700); L.scene.add(wall);
  rack = rack3d({ bays: 2 }); rack.group.position.set(0, 0, -300); L.scene.add(rack.group);
  for (const [b, lv, seed] of [[0, -1, 1], [1, -1, 2], [0, 0, 3], [1, 0, 4], [0, 1, 5]]) {
    const load = palletLoad({ ...rack.PALLET, seed }); load.position.copy(rack.spot(b, lv)); rack.group.add(load);
  }
  // labels on the level-1 beams: two old, one already covered by its new label
  const put = (lab, b, dx) => { lab.group.position.copy(rack.slot(b, 0, dx)); rack.group.add(lab.group); };
  put(label3d({ title: 'A1-01', value: '41100188', old: true }), 0, -110);
  put(label3d({ title: 'A1-02', value: '41100226', old: true }), 0, 110);
  put(label3d({ title: 'A1-03', value: 'NEWA103' }), 1, -110);
  held = label3d({ title: 'A1-01', value: 'NEWA101' }); L.scene.add(held.group);
  pip = pip3d(L, { vest: true });
  inHand = scanner3d(L, { screen, scale: 0.9 });
}

const HEAD = new THREE.Vector3(), TARGET = new THREE.Vector3(), P = new THREE.Vector3(), A = new THREE.Vector3(), F = new THREE.Vector3();
export function render({ ctx, W, H }, t) {
  screen.redraw(t);
  // Pip, facing the rack, scanning the old A1-01 label with her right hand, the new one in her left
  const pose = pip3dPose(t, [{ t: -1, dur: 0.001, pose: {
    ...EXPR3.neutral, yaw: Math.PI - 0.35, 'eyes.y': -0.25, 'head.rx': -0.08,
    'handR.x': 70, 'handR.y': 640, 'handR.z': 230, 'handR.form': 5, 'handR.px': -1, 'handR.pz': 0,
    'handL.x': -150, 'handL.y': 470, 'handL.z': 150, 'handL.form': 6, 'handL.px': 0.4, 'handL.pz': -1,
  } }], { id: 'lab' });
  const AT = { x: -120, y: 0, z: 420 };
  pip.update(pose, AT);
  rack.group.updateMatrixWorld(true);
  TARGET.copy(rack.slot(0, 0, -110)).add(new THREE.Vector3(33, 0, 0)).applyMatrix4(rack.group.matrixWorld);
  pip.head.updateWorldMatrix(true, false); HEAD.set(0, 150, 60).applyMatrix4(pip.head.matrixWorld);
  // the scanner is aimed first, then her right hand is fitted round its handle
  P.copy(pip.world(new THREE.Vector3(80, 650, 250)));
  inHand.hold(P, A.subVectors(TARGET, P), F.subVectors(HEAD, P));
  const grip = inHand.handFrame(GRIP, 1), w = pip.local(grip.wrist);
  Object.assign(pose, { 'handR.x': w.x, 'handR.y': w.y, 'handR.z': w.z });
  pip.update(pose, AT); pip.orientHand('R', grip.quat);
  const k = 0.5 + 0.5 * Math.sin(t * 5);
  inHand.update({ trigger: 1, led: 'green', beam: { to: TARGET, k: 0.6 + 0.4 * k }, camera: L.camera });
  // the new label pinched by its corner in her left hand, its backing half off, facing her
  pip.pinch('L', P);
  held.group.position.copy(P); held.group.lookAt(HEAD);
  held.group.translateX(-80); held.group.translateY(-26); held.setLiner(0.45);   // the label's corner at the pinch
  L.camera.position.set(2300, 900, 1700); L.camera.lookAt(-60, 560, -40);
  const close = globalThis.CLOSE;                    // lab-close.js looks at the details
  if (close === 'hand') { const c = inHand.root.position; L.camera.position.set(c.x + 260, c.y + 110, c.z + 330); L.camera.lookAt(c.x, c.y - 20, c.z); }
  else if (close === 'hand2') { const c = inHand.root.position; L.camera.position.set(c.x + 330, c.y - 60, c.z - 160); L.camera.lookAt(c.x, c.y - 30, c.z); }
  else if (close === 'hand3') { const c = inHand.root.position; L.camera.position.set(c.x - 60, c.y + 360, c.z + 120); L.camera.lookAt(c.x, c.y - 30, c.z); }
  else if (close) { L.camera.position.set(...close.pos); L.camera.lookAt(...close.at); }
  L.camera.near = 50; L.camera.far = 30000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(0, 0, 0);
  ctx.fillStyle = '#A7C0CE'; ctx.fillRect(0, 0, W, H);
  L.draw(ctx);
}
