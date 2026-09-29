// clap bake: a 3D prop drawn from set angles into pictures with transparent backgrounds, for 2D
// scenes (sprite.js draws them). clap loads this page as the stage's entry with the prop and the
// settings in its query, and saves what it leaves in window.clapBake.
//
// The prop is `module#export`, a function in the project or the kit that makes it (called with the
// args), returning a three.js object or { group }. The camera is orthographic, so a sprite looks the
// same anywhere on screen, and looks down on the prop by `elevation` degrees; the prop turns to each
// angle (0 shows its front, 90 turns it to face the screen's right). `scale` is the sprite's pixels
// per unit at 1x, and `res` how many times that it's drawn at, so it stays sharp when a 2D camera
// zooms in. `line` is its ink at 1x, in pixels, for the kit's usual 2.6 px parts (thinner parts keep
// their proportion); to match a cut-out character, it's the character's line width times the scale
// it's drawn at. With `shadow`, the soft shadow under the prop is baked in too.
import { layer3d, THREE } from './scene3d.js';
import { INK3D, STYLE } from './style.js';

const q = new URL(import.meta.url).searchParams;
const num = (k, d) => (q.has(k) ? Number(q.get(k)) : d);
const PER_PX = (2 * Math.tan((18 * Math.PI) / 360)) / 1080;   // toon3d's: world units per pixel per unit of depth

async function bake(stage) {
  const spec = q.get('prop') || '';
  const [file, name = 'default'] = spec.split('#');
  if (!file) throw new Error('which prop? clap bake <module#export>, like @kit/printers3d.js#labelPrinter3d');
  const mod = await import('/' + file.replace(/\\/g, '/').replace(/^\/+/, ''));
  if (typeof mod[name] !== 'function') throw new Error(`${file} has no function called ${name} (it has ${Object.keys(mod).join(', ') || 'nothing'})`);
  const args = JSON.parse(q.get('args') || '{}');
  const angles = (q.get('angles') || '0,45,90').split(',').map(Number);
  const scale = num('scale', 1), res = num('res', 2), line = num('line', STYLE.line3d ?? 2.6), elevation = num('elevation', 8);
  if (angles.some(isNaN) || !(scale > 0) || !(res > 0) || !(line >= 0)) throw new Error('angles, scale, res and line must be numbers (scale and res more than 0)');
  const L = layer3d(stage, { width: 64, height: 64, pixelRatio: 1 });
  const made = await mod[name](args, L);
  const prop = made?.isObject3D ? made : made?.group;
  if (!prop?.isObject3D) throw new Error(`${spec} didn't return a three.js object or { group }`);
  const holder = new THREE.Group();
  holder.add(prop);
  L.scene.add(holder);

  // the camera, far off so that the ink (pushed out in proportion to depth) is even
  const box = new THREE.Box3().setFromObject(holder), sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = sphere.radius, D = r * 60, e = (elevation * Math.PI) / 180;
  const k = scale * res, pad = Math.ceil(line * res + 6), N = Math.ceil(2 * r * k) + 2 * pad, half = N / 2 / k;
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, D - 3 * r, D + 3 * r);
  L.renderer.setSize(N, N, false);

  // the ink, redrawn `line` px wide at 1x at this camera's depth
  const f = line / (scale * 2.6 * INK3D * PER_PX * D), swapped = new Map();
  holder.traverse(o => {
    const m = o.material;
    if (!m?.uniforms?.push) return;
    if (!swapped.has(m)) { const c = m.clone(); c.uniforms.push.value = m.uniforms.push.value * f; swapped.set(m, c); }
    o.material = swapped.get(m);
  });

  const lights = L.studioLights();
  const top = lights.top.shadow.camera, reach = Math.max(1400, r * 1.4);
  Object.assign(top, { left: -reach, right: reach, top: reach, bottom: -reach, far: Math.max(8000, r * 8) });
  lights.top.position.set(0, Math.max(3000, r * 3), 200);
  top.updateProjectionMatrix();
  if (q.get('shadow') !== '0') {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(r * 8, r * 8), new THREE.ShadowMaterial({ opacity: 0.3, color: 0x6b3a1e }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    L.scene.add(floor);
  }

  const out = {};
  const flat = document.createElement('canvas'), g = flat.getContext('2d', { willReadFrequently: true });
  for (const a of angles) {
    holder.rotation.y = (a * Math.PI) / 180;
    holder.updateMatrixWorld(true);
    const c = new THREE.Box3().setFromObject(prop).getCenter(new THREE.Vector3());
    camera.position.set(c.x, c.y + D * Math.sin(e), c.z + D * Math.cos(e));
    camera.up.set(0, 1, 0); camera.lookAt(c); camera.updateMatrixWorld(true);
    L.renderer.render(L.scene, camera);
    flat.width = N; flat.height = N;
    g.clearRect(0, 0, N, N); g.drawImage(L.canvas, 0, 0);
    // cropped to what was drawn, with a pixel to spare
    const px = g.getImageData(0, 0, N, N).data;
    let x0 = N, y0 = N, x1 = -1, y1 = -1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (px[(y * N + x) * 4 + 3] > 2) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) throw new Error(`${spec} drew nothing at ${a} degrees`);
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(N - 1, x1 + 1); y1 = Math.min(N - 1, y1 + 1);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, crop = document.createElement('canvas');
    crop.width = w; crop.height = h;
    crop.getContext('2d').drawImage(flat, x0, y0, w, h, 0, 0, w, h);
    const o = new THREE.Vector3(0, 0, 0).project(camera);          // the prop's origin, in the picture
    const anchor = [((o.x + 1) / 2) * N - x0, ((1 - o.y) / 2) * N - y0].map(v => Math.round(v * 100) / 100);
    out[a] = { w, h, anchor, png: crop.toDataURL('image/png') };
  }
  return { prop: spec, args, scale, res, line, elevation, shadow: q.get('shadow') !== '0', angles: out };
}

export async function setup(stage) {
  try { window.clapBake = await bake(stage); } catch (e) { window.clapBake = { error: String(e?.message || e) }; }
}
export function render({ ctx, W, H }) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); }
