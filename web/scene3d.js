// 3D layers, with three.js. A layer is a WebGL scene rendered on its own canvas and drawn into the
// stage's 2D canvas where the scene wants it, so 2D and 3D share one frame and one timeline.
//
// Units are the 2D scene's: the z = 0 plane lines up pixel for pixel with the 2D world under the same
// 2D camera, x to the right and y *up* (so a 2D point [x, y] is at 3D [x, -y, 0]); +z comes towards us.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { H, W } from './timeline.js';

export { THREE };

export function layer3d(stage, { shadows = true, exposure = 1, fov = 18, environment = 0.9 } = {}) {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(stage.dpr);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;          // keeps the 2D palette's colours honest
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  if (environment) {                                        // soft studio reflections, made in code
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = environment;
  }
  const camera = new THREE.PerspectiveCamera(fov, W / H, 10, 50000);

  return {
    THREE, renderer, scene, camera, canvas,

    // Line the 3D camera up with the 2D camera { x, y, zoom, rot } (camera.js's), for the plane z = 0.
    match(cam) {
      const dist = H / cam.zoom / (2 * Math.tan((camera.fov * Math.PI) / 360));
      camera.position.set(cam.x, -cam.y, dist);
      camera.rotation.set(0, 0, cam.rot || 0);
      camera.near = dist * 0.05; camera.far = dist * 20;
      camera.updateProjectionMatrix();
    },

    // Render the 3D scene and lay it over whatever the 2D canvas has so far.
    draw(ctx) {
      renderer.render(scene, camera);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(canvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    },

    // A floor at 2D height y that shows only the shadows falling on it, so 3D things shadow the 2D
    // set. It runs from just behind the z = 0 plane towards the camera, as the 2D floor looks.
    shadowFloor(y, opacity = 0.3) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(12000, 3000), new THREE.ShadowMaterial({ opacity, color: 0x6b3a1e }));
      m.rotation.x = -Math.PI / 2; m.position.set(W / 2, -y, 1440); m.receiveShadow = true;
      scene.add(m);
      return m;
    },

    // Lights that sit well with flat 2D art: a warm fill, a key from the front right for shading, a
    // rim from behind to catch edges, and a light straight above that only casts the (soft) shadows,
    // so they fall under things as the 2D shadows do.
    studioLights({ key = 2.4, fill = 1.1, rim = 1.6, shadow = 1.2 } = {}) {
      renderer.shadowMap.type = THREE.VSMShadowMap;
      const hemi = new THREE.HemisphereLight(0xfff4e6, 0xe2a57a, fill);
      const keyLight = new THREE.DirectionalLight(0xffffff, key);
      keyLight.position.set(900, 900, 1400);
      const rimLight = new THREE.DirectionalLight(0xfff0dd, rim);
      rimLight.position.set(-1200, 700, -900);
      const top = new THREE.DirectionalLight(0xffffff, shadow);
      top.position.set(0, 3000, 200);
      top.castShadow = true;
      top.shadow.mapSize.set(2048, 2048);
      Object.assign(top.shadow.camera, { left: -1400, right: 1400, top: 1400, bottom: -1400, near: 100, far: 8000 });
      top.shadow.radius = 14; top.shadow.blurSamples = 20; top.shadow.bias = -0.0005;
      const rig = new THREE.Group();
      rig.add(hemi, keyLight, keyLight.target, rimLight, rimLight.target, top, top.target);   // targets at the rig's centre
      scene.add(rig);
      return {
        rig, keyLight, rimLight, top,
        // keep the lights on the same side of whatever the camera is looking at
        follow(cam) {
          rig.position.set(cam.x, -cam.y, 0);
          top.target.position.set(0, -3000, 0);
        },
      };
    },
  };
}

// Poses for props that get carried about (a label torn off, a page picked up): { c, f, u }, where the
// thing's middle is, the way its face looks and the way its top points, all in the world.
const _m = new THREE.Matrix4(), _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion();
const turnOf = (q, f, u) => {
  const y = f.clone().normalize(), z = u.clone().addScaledVector(y, -u.dot(y)).normalize();
  return q.setFromRotationMatrix(_m.makeBasis(new THREE.Vector3().crossVectors(y, z), y, z));
};
// k of the way from pose a to pose b, the turn taken the short way round, lifted on an arc of `arc`.
export function poseBetween(a, b, k, arc = 0) {
  turnOf(_q0, a.f, a.u); turnOf(_q1, b.f, b.u); _q0.slerp(_q1, k);
  const c = new THREE.Vector3().lerpVectors(a.c, b.c, k);
  c.y += arc * Math.sin(Math.PI * k);
  return { c, f: new THREE.Vector3(0, 1, 0).applyQuaternion(_q0), u: new THREE.Vector3(0, 0, 1).applyQuaternion(_q0) };
}
// Square in front of a camera, d away, facing it and upright on screen: to show something to it.
export function poseInFront(camera, d) {
  camera.updateMatrixWorld();
  const dir = camera.getWorldDirection(new THREE.Vector3()), up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  return { c: camera.getWorldPosition(new THREE.Vector3()).addScaledVector(dir, d), f: dir.negate(), u: up };
}
// How far from a camera something `size` tall fills `frac` of the frame's height.
export const fitDistance = (camera, size, frac) => size / (frac * 2 * Math.tan((camera.fov * Math.PI) / 360));

// A canvas texture: draw(ctx, w, h) paints it; call .redraw() to paint it again (for faces that animate).
export function paintedTexture(w, h, draw) {
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.redraw = (...args) => { g.clearRect(0, 0, w, h); draw(g, w, h, ...args); tex.needsUpdate = true; };
  tex.redraw();
  return tex;
}
