// A hand on a forearm, for the tests: the rig from /@kit/hand3d.js, skinned and inked.
import { THREE } from '/@kit/scene3d.js';
import { cone, skeleton, skinned } from '/@kit/rig3d.js';
import { handBones, handNails, handRig, handShape } from '/@kit/hand3d.js';
import { toon } from '/@kit/toon3d.js';

export const SKIN = '#E4A07C', NAIL = '#F3C7B2';

// side +1 is the hand on the right of the screen when it faces us (the character's left hand).
// `fore` is how much forearm shows, from the wrist up. palm is the middle of the palm, in the group's space.
export function hand(layer, { side = 1, skin = SKIN, fore = 170 } = {}) {
  const h = side > 0 ? 'handR' : 'handL';
  const group = new THREE.Group();
  layer.scene.add(group);
  const sk = skeleton(group, [{ name: 'fore', at: [0, 0, 0] }, ...handBones(h, side, 'fore', { at: [0, -fore, 0] })]);
  const t0 = performance.now();
  const mesh = skinned(sk, handShape(h, side, { wrist: cone('fore', fore + 2, 31, 26, { scale: [0.64, 1, 1] }) }), toon(skin), { cell: 1.3, soft: 5, key: `hand-test${side}-${fore}` });
  handNails(sk, h, side, NAIL);
  const ms = performance.now() - t0;
  if (!globalThis.__handLogged) { globalThis.__handLogged = 1; console.warn(`hand mesh: ${mesh.geometry.attributes.position.count} vertices, ${mesh.geometry.index.count / 3} triangles, ${ms.toFixed(0)} ms`); }
  return { h, side, group, sk, mesh, rig: handRig(sk, h, side), fore: sk.by.fore, palm: new THREE.Vector3(0, -fore - 95, 0), wrist: fore };
}

// A handle for the hand to hold: a cylinder, in the world, with what the rig needs to wrap round it.
export function handle(layer, r, len, color = '#3B6F9E') {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 48), toon(color));
  m.castShadow = true;
  g.add(m);
  layer.scene.add(g);
  const hold = { kind: 'handle', at: new THREE.Vector3(), axis: new THREE.Vector3(0, 1, 0), r };
  return {
    group: g, hold,
    // put it at `at` (world), along `axis`, and update what the rig is told
    place(at, axis, scale = 1) {
      g.position.copy(at); g.scale.setScalar(scale);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
      hold.at.copy(at); hold.axis.copy(axis).normalize(); hold.r = r * scale;
    },
  };
}
