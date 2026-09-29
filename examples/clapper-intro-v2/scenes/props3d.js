// 3D props: the clapperboard, with extruded letters and a hinged stick, and 3D confetti.
import { clamp, E, hash, lerp, on, TAU } from '/@kit/core.js';
import { paintedTexture, THREE } from '/@kit/scene3d.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BW = 480, BH = 300, D = 26, BAR = 58;

// Orange and white stripes, leaning, for the bar and the stick.
const stripes = () => paintedTexture(1024, 124, (g, w, h) => {
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#FF8A1F';
  for (let x = -h; x < w + h; x += 128) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 64, h); g.lineTo(x + 64 + h * 0.55, 0); g.lineTo(x + h * 0.55, 0); g.fill(); }
});

export async function clapperboard3d(layer) {
  const font = new Font(await new TTFLoader().loadAsync('/@kit/fonts/Roboto-Bold.ttf'));
  const slate = new THREE.MeshPhysicalMaterial({ color: '#1B2330', roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3 });
  const white = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.3, clearcoat: 0.6 });
  const stripeMat = new THREE.MeshStandardMaterial({ map: stripes(), roughness: 0.45 });
  const hingeMat = new THREE.MeshStandardMaterial({ color: '#8E99AA', roughness: 0.3, metalness: 0.9 });

  const root = new THREE.Group(), board = new THREE.Group();
  root.add(board);
  const body = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, D, 5, 12), slate);
  body.castShadow = true;
  board.add(body);
  // the fixed striped bar along the top of the slate
  const bar = new THREE.Mesh(new RoundedBoxGeometry(BW, BAR, D, 4, 10), slate);
  bar.position.y = BH / 2 + BAR / 2 + 2; bar.castShadow = true;
  const barFace = new THREE.Mesh(new THREE.PlaneGeometry(BW - 16, BAR - 14), stripeMat);
  barFace.position.set(0, bar.position.y, D / 2 + 0.6);
  board.add(bar, barFace);
  // the letters, extruded out of the slate
  const letters = new TextGeometry('CLAPPER', { font, size: 68, depth: 10, curveSegments: 10, bevelEnabled: true, bevelThickness: 2.5, bevelSize: 2, bevelSegments: 4 });
  letters.computeBoundingBox(); letters.center();
  const word = new THREE.Mesh(letters, white);
  word.position.set(0, 26, D / 2 + 5); word.castShadow = true;
  board.add(word);
  const line = new THREE.Mesh(new THREE.BoxGeometry(BW - 70, 3, 2), new THREE.MeshStandardMaterial({ color: '#3C4658' }));
  line.position.set(0, -40, D / 2 + 1);
  const sub = new THREE.Mesh(new THREE.PlaneGeometry(360, 44), new THREE.MeshBasicMaterial({
    map: paintedTexture(720, 88, (g, w, h) => { g.fillStyle = '#9AAAC0'; g.font = '500 54px Roboto, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('words in, video out', w / 2, h / 2 + 2); }),
    transparent: true,
  }));
  sub.position.set(0, -86, D / 2 + 0.6);
  board.add(line, sub);
  // the stick, hinged at its left end, on top of the bar
  const hinge = new THREE.Group();
  hinge.position.set(-BW / 2 + 14, BH / 2 + BAR + 6, 0);
  const stick = new THREE.Mesh(new RoundedBoxGeometry(BW, BAR, D, 4, 10), slate);
  stick.position.set(BW / 2 - 14, BAR / 2, 0); stick.castShadow = true;
  const stickFace = new THREE.Mesh(new THREE.PlaneGeometry(BW - 16, BAR - 14), stripeMat);
  stickFace.position.set(BW / 2 - 14, BAR / 2, D / 2 + 0.6);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, D + 8, 24), hingeMat);
  pin.rotation.x = Math.PI / 2;
  hinge.add(stick, stickFace, pin);
  board.add(hinge);
  layer.scene.add(root);

  return {
    root,
    // Drops in from above at tDrop with a bounce and a tumble, opens, and snaps shut exactly at tClap.
    update(t, tDrop, tClap, x, y, scale = 1) {
      root.visible = t >= tDrop;
      if (!root.visible) return;
      const fall = E.bounce(on(t, tDrop, 0.75)), turn = E.out(on(t, tDrop, 1.1));
      root.position.set(x, -lerp(-500, y, fall), 40);
      root.scale.setScalar(scale);
      board.rotation.set(lerp(-0.5, 0.06, turn), lerp(0.9, -0.22, turn), lerp(-0.3, 0.05, turn));
      const open = t < tClap - 0.1 ? lerp(0.05, 0.62, E.out(on(t, tDrop + 0.3, 0.6))) : 0.62 * (1 - E.in(on(t, tClap - 0.1, 0.1)));
      const shake = t >= tClap ? Math.sin((t - tClap) * 45) * 0.05 * Math.exp(-(t - tClap) * 12) : 0;
      hinge.rotation.z = Math.max(open, Math.abs(shake));
      // the snap jolts the whole board
      const jolt = t >= tClap ? Math.sin((t - tClap) * 30) * 6 * Math.exp(-(t - tClap) * 10) : 0;
      root.position.y += jolt;
    },
  };
}

// Confetti in 3D: n pieces thrown up and out from (x, y) at t0, spinning as they fall.
export function confetti3d(layer, n = 500) {
  const cols = ['#FF8A1F', '#23A89A', '#FFC24A', '#E5484D', '#7A5CFA', '#FFFFFF'];
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5 }), n);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) mesh.setColorAt(i, c.set(cols[i % cols.length]));
  mesh.frustumCulled = false;
  layer.scene.add(mesh);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    update(t, t0, x, y, life = 3.2) {
      const dt = t - t0;
      mesh.visible = dt > 0 && dt < life;
      if (!mesh.visible) return;
      for (let i = 0; i < n; i++) {
        const a = hash(i * 1.3) * TAU, up = 0.35 + hash(i * 2.7) * 0.65, sp = 700 + hash(i * 4.1) * 1300;
        const vx = Math.cos(a) * sp * 0.6, vz = Math.sin(a) * sp * 0.5, vy = sp * up;
        const drag = 1 / (1 + dt * 1.8), fall = 900 * dt * dt;
        p.set(x + vx * dt * drag, -y + vy * dt * drag - fall, 60 + vz * dt * drag);
        e.set(dt * (4 + hash(i) * 8) + i, dt * (3 + hash(i * 5) * 7), dt * (2 + hash(i * 9) * 5));
        const k = clamp(1 - (dt - life * 0.7) / (life * 0.3));
        s.setScalar(k);
        mesh.setMatrixAt(i, m.compose(p, q.setFromEuler(e), s));
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
