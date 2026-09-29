// Tilly and Pip in 3D: a warehouse, all in three.js, cel-shaded and inked like the 2D toons.
import { on } from '/@kit/core.js';
import { grade } from '/@kit/finish.js';
import { layer3d, THREE } from '/@kit/scene3d.js';
import { TL } from '/@kit/timeline.js';
import { pip3d, pip3dPose } from '/@kit/characters/pip3d.js';
import { tilly3d, tillyPose } from '/@kit/characters/tilly3d.js';
import { camera, crateRock, PIP, PIP_MOVES, pipExtra, TILLY_MOVES, TILLY_SCALE, tillyExtra, tillyPath } from './show.js';
import { cue as c } from '/@kit/timeline.js';
import { load, warehouse } from './warehouse.js';

let L, pip, tilly, crate;
export function setup(stage) {
  L = layer3d(stage, { fov: 24 });
  L.lights = L.studioLights({ key: 2.8, fill: 0.85, rim: 1.4 });
  const top = L.lights.top;
  Object.assign(top.shadow.camera, { left: -2200, right: 2200, top: 2200, bottom: -2200 });
  warehouse(L);
  pip = pip3d(L);
  tilly = tilly3d(L);
  crate = load(L);
}

const tillyAt = t => tillyPose(t, TILLY_MOVES, { path: tillyPath, extra: tillyExtra });
const place = (p, t) => { const [x, z] = tillyPath(t); tilly.update(p, { x, y: 0, z, scale: TILLY_SCALE }); };
const P = new THREE.Vector3();

export function render({ ctx, W, H }, t) {
  // the crate rides on her forks
  place(tillyAt(t), t);
  tilly.forkTop(P);
  const yaw = tilly.root.children[0].rotation.y;
  crate.group.position.set(P.x, P.y - crate.PALLET_TOP * TILLY_SCALE, P.z);
  crate.group.rotation.y = yaw; crate.group.scale.setScalar(TILLY_SCALE);
  const [rz, rx] = crateRock(t);
  crate.crate.rotation.set(rx, 0, rz);

  pip.update(pip3dPose(t, PIP_MOVES, { extra: pipExtra }), PIP);

  const cam = camera(t);
  L.camera.position.set(...cam.pos); L.camera.lookAt(...cam.at);
  L.camera.near = 50; L.camera.far = 40000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(cam.at[0], 0, 0);
  ctx.fillStyle = '#A7C0CE'; ctx.fillRect(0, 0, W, H);
  L.draw(ctx);
  grade(ctx, { edges: 0.22 });
  const black = Math.max(1 - on(t, 0, 0.4), on(t, TL.dur - 0.6, 0.6));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
