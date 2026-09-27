// The 3D props, in a corner of a warehouse: racking with old and new bin labels, a new label with its
// backing half peeled, Pip in a hi-vis vest scanning a label, and a scanner up close with a live screen.
//   clap still 3
import { E, inv } from '/@kit/core.js';
import { layer3d, paintedTexture, THREE } from '/@kit/scene3d.js';
import { roundBox, solid, toon } from '/@kit/toon3d.js';
import { label3d, palletLoad, rack3d, scanner3d } from '/@kit/props3d.js';
import { EXPR3, pip3d, pip3dPose } from '/@kit/characters/pip3d.js';

let L, rack, pip, inHand, big, held;
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
  for (const [b, lv, seed] of [[0, 0, 1], [1, 0, 2], [0, 1, 3], [1, 1, 4], [0, 2, 5]]) {
    const load = palletLoad({ seed }); load.position.set(rack.bayX(b), rack.levels[lv] + rack.BEAM.h / 2, -150); rack.group.add(load);
  }
  // labels on the level-1 beams: two old, one already covered by its new label
  const put = (lab, b, dx) => { lab.group.position.copy(rack.slot(b, 1, dx)); rack.group.add(lab.group); };
  put(label3d({ title: 'A1-01', value: '41100188', old: true }), 0, -110);
  put(label3d({ title: 'A1-02', value: '41100226', old: true }), 0, 110);
  put(label3d({ title: 'A1-03', value: 'NEWA103' }), 1, -110);
  held = label3d({ title: 'A1-01', value: 'NEWA101' }); L.scene.add(held.group);
  pip = pip3d(L, { vest: true });
  inHand = scanner3d(L, { screen, scale: 0.9 });
  big = scanner3d(L, { screen, scale: 1.8 });
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
  pip.update(pose, { x: -120, y: 0, z: 420 });
  rack.group.updateMatrixWorld(true);
  TARGET.copy(rack.slot(0, 1, -110)).add(new THREE.Vector3(33, 0, 0)).applyMatrix4(rack.group.matrixWorld);
  pip.head.updateWorldMatrix(true, false); HEAD.set(0, 150, 60).applyMatrix4(pip.head.matrixWorld);
  pip.palm('R', P);
  inHand.hold(P, A.subVectors(TARGET, P), F.subVectors(HEAD, P));
  const k = 0.5 + 0.5 * Math.sin(t * 5);
  inHand.update({ trigger: 1, led: 'green', beam: { to: TARGET, k: 0.6 + 0.4 * k }, camera: L.camera });
  // the new label in her left hand, its backing half off
  pip.palm('L', P); held.group.position.copy(P).add(new THREE.Vector3(10, 34, 20));
  held.group.lookAt(HEAD.x, P.y + 40, HEAD.z + 800); held.setLiner(0.45);
  // a scanner up close, on the right, turning a little
  big.hold(new THREE.Vector3(1250, 380, 120), new THREE.Vector3(Math.sin(t * 0.6) * 0.25, 1, 0.1), new THREE.Vector3(0.75, 0.15, 0.55));
  big.update({ led: 'amber' });

  L.camera.position.set(2300, 900, 1700); L.camera.lookAt(-60, 560, -40);
  L.camera.near = 50; L.camera.far = 30000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(0, 0, 0);
  ctx.fillStyle = '#A7C0CE'; ctx.fillRect(0, 0, W, H);
  L.draw(ctx);
}
