// The 3D toon kit: cel shading, ink outlines that stay the same width on screen however near or far,
// rounded parts to build characters from, and two-bone IK to place hands and feet.
// Units are the 2D scene's pixels, y up (see scene3d.js). characters/tilly3d.js and pip3d.js use it.
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { THREE } from './scene3d.js';
import { INK3D } from './style.js';
import { INK } from './toon.js';

// ---------- shading ----------
// Three flat tones, shadow, middle and lit, instead of smooth shading.
let ramp = null;
const gradient = () => {
  if (ramp) return ramp;
  ramp = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false; ramp.needsUpdate = true;
  return ramp;
};
export const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradient(), ...o });

// The ink: each inked mesh gets a copy of itself pushed out along its normals and drawn from the
// inside, in ink. The push grows with distance, so the line is `width` pixels wide at any depth
// (scaled by the video's style.line3d, if it has one: see style.js).
const PER_PX = (2 * Math.tan((18 * Math.PI) / 360)) / 1080;   // world units per pixel, per unit of depth, at the layer's fov
const inks = new Map();
export function inkMaterial(width = 2.6, color = INK) {
  const key = `${width}|${color}`;
  if (inks.has(key)) return inks.get(key);
  const m = new THREE.ShaderMaterial({
    uniforms: { ink: { value: new THREE.Color(color) }, push: { value: width * INK3D * PER_PX } },
    vertexShader: /* glsl */ `
      uniform float push;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        mv.xyz += n * push * -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 ink;
      void main() {
        gl_FragColor = vec4(ink, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
  });
  inks.set(key, m);
  return m;
}

// Redraws the ink of everything under root k times as wide (for another camera, or a bake), with
// copies of its ink materials. Returns a function that puts the old ones back.
export function rescaleInk(root, k) {
  const was = [], copies = new Map();
  root.traverse(o => {
    const m = o.material;
    if (!m?.uniforms?.push) return;
    if (!copies.has(m)) { const c = m.clone(); c.uniforms.push.value = m.uniforms.push.value * k; copies.set(m, c); }
    was.push([o, m]);
    o.material = copies.get(m);
  });
  return () => { for (const [o, m] of was) o.material = m; };
}

// A mesh with an ink outline (width 0 for none), casting shadows.
export function solid(geometry, material, { ink = 2.6, shadow = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = shadow;
  if (ink) { const o = new THREE.Mesh(geometry, inkMaterial(ink)); o.raycast = () => {}; m.add(o); }
  return m;
}

// ---------- shapes ----------
export const roundBox = (w, h, d, r = 12, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
export const ball = (r, seg = 40) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.6));

// A limb from its joint (the origin) down -y: `len` long, `r1` thick at the top and `r2` at the
// bottom, with rounded ends, so limbs joined end to end bend without a seam.
export function limbGeometry(len, r1, r2 = r1, seg = 28) {
  const pts = [], n = 10;
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r2, -len + Math.sin(a) * r2)); }
  for (let i = 0; i <= n; i++) { const a = (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r1, Math.sin(a) * r1)); }
  pts[0].x = 0.001; pts[pts.length - 1].x = 0.001;
  return new THREE.LatheGeometry(pts, seg);
}

// A joint: a group placed at `at` in its parent, to rotate and hang things from.
export function joint(parent, at = [0, 0, 0], name) {
  const g = new THREE.Group();
  g.position.set(...at);
  if (name) g.name = name;
  parent.add(g);
  return g;
}

// ---------- reaching ----------
const _v = () => new THREE.Vector3();
const S = _v(), T = _v(), P = _v(), U = _v(), Wv = _v(), E = _v(), X = _v(), Y = _v(), Z = _v(), F = _v();
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), INV = new THREE.Matrix4();

// Two-bone IK. `upper` and `lower` are joints whose bones hang down their -y (lower sits `a` below
// upper; the hand or foot sits `b` below lower). Turn them so the end reaches `target`, with the
// elbow or knee pointing towards `pole` (both in world space). The bend is round lower's x axis.
export function reach(upper, lower, a, b, target, pole) {
  const parent = upper.parent;
  parent.updateWorldMatrix(true, false);
  INV.copy(parent.matrixWorld).invert();
  S.copy(upper.position);
  T.copy(target).applyMatrix4(INV);
  P.copy(pole).applyMatrix4(INV);
  U.subVectors(T, S);
  const d = Math.min(Math.max(U.length(), Math.abs(a - b) + 1e-3), a + b - 1e-3);
  U.normalize();
  Wv.subVectors(P, S); Wv.addScaledVector(U, -Wv.dot(U));                  // towards the pole, square to the reach
  if (Wv.lengthSq() < 1e-8) Wv.set(0, 0, 1).addScaledVector(U, -U.z);
  Wv.normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  E.copy(U).multiplyScalar(cosA).addScaledVector(Wv, sinA);                  // the upper bone's direction
  Y.copy(E).negate();                                                        // bones hang down -y
  X.crossVectors(Wv, U).normalize();                                         // the bend axis
  Z.crossVectors(X, Y).normalize();
  X.crossVectors(Y, Z).normalize();
  M.makeBasis(X, Y, Z);
  upper.quaternion.setFromRotationMatrix(M);
  // the lower bone, in the upper's space: from the elbow to the target
  F.copy(S).addScaledVector(E, a);                                           // the elbow
  F.subVectors(T, F).normalize().applyQuaternion(Q.copy(upper.quaternion).invert());
  lower.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.atan2(-F.z, -F.y));
}
