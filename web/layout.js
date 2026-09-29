// The layout pass: a cut-out scene laid out in a 3D set, as TV cut-out lays out its shots. Each shot
// has a fixed 3D camera (shotCamera). The set is drawn from it once, as pictures (bakeLayers), and 2D
// characters and sprites are placed on it with project(): where a point of the set is on screen, how
// many pixels a unit is there, and how far away, for their size and their drawing order. Within a shot
// the camera only pans and zooms in 2D (camera.js's view, over the baked pictures), as in TV cut-out.
// Units are the set's (for the kit's props, millimetres), y up, as in scene3d.js.
import { THREE } from './scene3d.js';
import { INK3D } from './style.js';
import { H, W } from './timeline.js';
import { rescaleInk } from './toon3d.js';

// A shot's camera: at pos, looking at at, with a vertical field of view of fov degrees.
export function shotCamera({ pos, at, fov = 30 }) {
  const camera = new THREE.PerspectiveCamera(fov, W / H, 30, 80000);
  camera.position.set(...pos); camera.lookAt(...at);
  camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
  const focal = H / 2 / Math.tan((fov * Math.PI) / 360);         // pixels per unit, a unit away
  const fwd = camera.getWorldDirection(new THREE.Vector3()), v = new THREE.Vector3();
  const flat = new THREE.Vector2(fwd.x, fwd.z).normalize();       // the way it looks, on the floor
  return {
    camera, pos, at, fov,
    // where [x, y, z] in the set is: { x, y } on screen, scale (pixels per unit there) and depth
    project([x, y, z]) {
      v.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
      const depth = -v.z;
      return { x: W / 2 + (v.x / depth) * focal, y: H / 2 - (v.y / depth) * focal, scale: focal / depth, depth };
    },
    // The view a character standing at [x, z] and facing yaw (0 faces +z, as walk3d's yaw) shows this
    // camera, as a cut-out angle: 0 its front, 2 its profile facing the screen's right, 4 its back,
    // negative facing left. Continuous, so the drawing swaps halfway between angles.
    view([x, z], yaw) {
      const cx = camera.position.x - x, cz = camera.position.z - z, n = Math.hypot(cx, cz) || 1;
      const dx = Math.sin(yaw), dz = Math.cos(yaw);
      const toCam = dx * (cx / n) + dz * (cz / n), toRight = dx * -flat.y + dz * flat.x;
      return (Math.atan2(toRight, toCam) * 4) / Math.PI;
    },
  };
}

// Bakes a shot: each layer, a list of objects in the layer3d's scene, drawn from the shot's camera on
// its own into a canvas the size of the video (objects in no layer, like lights, are in all of them, so
// hide what shouldn't be). Layers are for depth: a set in front of the characters and a set behind
// them. With `line`, the ink is redrawn that many pixels wide on screen (for the 3D kit's usual 2.6 px
// parts; see inkAt). Returns { layer: canvas }.
export function bakeLayers(L, shot, layers, { line } = {}) {
  const all = Object.values(layers).flat();
  const undo = line === undefined ? [] : all.map(o => rescaleInk(o, inkAt(shot, line)));
  const out = {};
  try {
    for (const [name, objects] of Object.entries(layers)) {
      for (const o of all) o.visible = objects.includes(o);
      L.renderer.render(L.scene, shot.camera);
      const c = Object.assign(document.createElement('canvas'), { width: L.canvas.width, height: L.canvas.height });
      c.getContext('2d').drawImage(L.canvas, 0, 0);
      out[name] = c;
    }
  } finally {
    for (const o of all) o.visible = true;
    undo.forEach(u => u());
  }
  return out;
}
// How much wider to draw the 3D kit's ink for this shot's lens: its lines are `line` px on screen.
export const inkAt = (shot, line = 2.6) => (line * Math.tan((shot.fov * Math.PI) / 360)) / (2.6 * INK3D * Math.tan((9 * Math.PI) / 180));

// Draws a layer's picture (from bakeLayers, or liveLayer) over the whole shot, in the shot's space, so a
// 2D camera over the shot pans and zooms it with everything else.
export function drawLayer(ctx, canvas) { ctx.drawImage(canvas, 0, 0, W, H); }

// Draws what moves in a set live, for a shot: `show` is drawn, and `hold` (the baked set) only into
// depth, so it hides what's behind it without drawing itself, as a matte does. Nothing else is
// touched, so hide what shouldn't be seen. Held things cast no shadows (the baked set has its own);
// the shown ones' fall on whatever shadow catcher (a ShadowMaterial floor) is showing. Returns the
// layer3d's canvas, to draw at once (drawLayer), before anything else is drawn live.
const HOLD = new THREE.MeshBasicMaterial({ colorWrite: false });
export function liveLayer(L, shot, { show = [], hold = [] }) {
  const undo = [];
  for (const o of show) { undo.push([o, 'visible', o.visible]); o.visible = true; }
  for (const root of hold) {
    undo.push([root, 'visible', root.visible]); root.visible = true;
    root.traverse(m => { if (m.isMesh) { undo.push([m, 'material', m.material], [m, 'castShadow', m.castShadow]); m.material = HOLD; m.castShadow = false; } });
  }
  try { L.renderer.render(L.scene, shot.camera); } finally { for (let i = undo.length - 1; i >= 0; i--) { const [o, k, v] = undo[i]; o[k] = v; } }
  return L.canvas;
}

// A character walking in the set, for a shot: walk3d's walk() (the body and each foot in the set) put
// through the camera as walk2d's walk is, for walkPose. Returns where the character stands on screen
// (x, y), its draw scale (the scale at that depth, times `unit`, the set's units per character unit),
// the view it shows the camera, its depth, and w, for walkPose(character, pose, w, { scale }). A
// planted foot is a fixed point in the set, and so stays exactly where it is on screen.
export function worldWalk(shot, wk, { unit = 1, step = 400, lift = 40 } = {}) {
  const at = shot.project([wk.x, 0, wk.z]), scale = at.scale * unit, view = shot.view([wk.x, wk.z], wk.yaw);
  const feet = {};
  for (const side of ['L', 'R']) {
    const [fx, fy, fz] = wk.feet[side], p = shot.project([fx, fy, fz]);
    feet[side] = [p.x, at.y - p.y, Math.asin(Math.min(1, Math.max(0, fy / lift))) / Math.PI];
  }
  return { x: at.x, y: at.y, scale, view, depth: at.depth, w: { x: at.x, dir: view < 0 ? -1 : 1, go: wk.go, s: wk.s, step, feet } };
}

// A character standing in the set at [x, z], facing yaw: where it is on screen, its draw scale, the
// view it shows the camera and its depth, as worldWalk gives them.
export function worldStand(shot, [x, z], yaw, { unit = 1 } = {}) {
  const at = shot.project([x, 0, z]);
  return { x: at.x, y: at.y, scale: at.scale * unit, view: shot.view([x, z], yaw), depth: at.depth };
}
