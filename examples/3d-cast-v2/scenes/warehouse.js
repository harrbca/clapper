// A toon warehouse, in 3D: a concrete floor with safety lines, a back wall with a roll-up door,
// racking stacked with boxes, and a crate on a pallet for Tilly. Floor at y = 0; +z towards the camera.
import { paintedTexture, THREE } from '/@kit/scene3d.js';
import { roundBox, solid, toon } from '/@kit/toon3d.js';

const C = { floor: '#D8CDBA', line: '#F2B81B', wall: '#A7C0CE', wallLow: '#8FAABA', door: '#C9D3DA', upright: '#E0712C', beam: '#2F6FA8', box: ['#C98A4B', '#B97A3E', '#D9A066', '#A86C36'] };

// Painted signs and the door's slats.
const sign = (text, w = 512, h = 160) => paintedTexture(w, h, (g) => {
  g.fillStyle = '#1F2A36'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 24); g.fill();
  g.fillStyle = '#F2B81B'; g.font = '700 92px Roboto'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4);
});
const slats = () => paintedTexture(256, 256, (g, w, h) => {
  g.fillStyle = C.door; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(40,60,80,0.35)'; g.lineWidth = 3;
  for (let y = 8; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
});
const planks = () => paintedTexture(256, 256, (g, w, h) => {
  g.fillStyle = C.box[0]; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(70,40,20,0.45)'; g.lineWidth = 5;
  for (let y = 64; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.lineWidth = 14; g.strokeStyle = 'rgba(90,55,25,0.55)'; g.strokeRect(8, 8, w - 16, h - 16);
  g.beginPath(); g.moveTo(10, 10); g.lineTo(w - 10, h - 10); g.stroke();
});

export function warehouse(L) {
  const S = new THREE.Group(); L.scene.add(S);
  const flat = (w, h, mat, pos, rotX = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); m.rotation.x = rotX; m.receiveShadow = true; S.add(m); return m; };

  // the floor, and yellow lines marking the aisle
  flat(9000, 7000, toon(C.floor), [0, 0, 400], -Math.PI / 2);
  for (const x of [-560, 1080]) flat(22, 3000, toon(C.line), [x, 0.5, 300], -Math.PI / 2);
  // the back wall: paint, a darker band low down, a roll-up door and a sign
  flat(9000, 3000, toon(C.wall), [0, 1500, -1000]);
  flat(9000, 300, toon(C.wallLow), [0, 150, -998]);
  const door = solid(roundBox(760, 900, 20, 8), new THREE.MeshToonMaterial({ map: slats() })); door.position.set(-1400, 450, -995); S.add(door);
  const frame = solid(roundBox(820, 40, 40, 10), toon('#5B6B78')); frame.position.set(-1400, 920, -990); S.add(frame);
  const dock = new THREE.Mesh(new THREE.PlaneGeometry(300, 94), new THREE.MeshBasicMaterial({ map: sign('DOCK 3') })); dock.position.set(-1400, 1060, -985); S.add(dock);

  // racking along the back: orange uprights, blue beams, boxes on the shelves
  const up = toon(C.upright), beam = toon(C.beam), boxes = C.box.map(c => toon(c));
  let n = 0;
  for (let bay = 0; bay < 4; bay++) {
    const x0 = -300 + bay * 520;
    for (const x of [x0, x0 + 520]) for (const z of [-880, -700]) { const u = solid(roundBox(26, 1180, 26, 5), up, { ink: 2 }); u.position.set(x, 590, z); S.add(u); }
    for (const y of [20, 420, 820]) for (const z of [-880, -700]) { const b = solid(roundBox(520, 34, 18, 5), beam, { ink: 2 }); b.position.set(x0 + 260, y + 17, z); S.add(b); }
    for (const y of [37, 437, 837]) {
      for (let i = 0; i < 3; i++) {
        const h = 150 + ((n * 37) % 90), w = 130 + ((n * 53) % 40);
        const box = solid(roundBox(w, h, 150, 8), boxes[n++ % 4], { ink: 2 });
        box.position.set(x0 + 90 + i * 170, y + h / 2, -790 + ((n * 29) % 30));
        box.rotation.y = ((n * 13) % 10 - 5) * 0.012;
        S.add(box);
      }
    }
  }
  // traffic cones by the aisle
  for (const [x, z] of [[-760, 520], [-700, 700]]) {
    const cone = solid(new THREE.ConeGeometry(34, 110, 24), toon('#FF7A1A'), { ink: 2 }); cone.position.set(x, 55, z); S.add(cone);
    const base = solid(roundBox(84, 10, 84, 4), toon('#FF7A1A'), { ink: 2 }); base.position.set(x, 5, z); S.add(base);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(20, 25, 16, 24, 1, true), toon('#FFFFFF')); band.position.set(x, 60, z); S.add(band);
  }
  return S;
}

// A crate on a pallet, which the forks slide in under: load.group sits with its bottom at its origin.
export function load(L) {
  const group = new THREE.Group(); L.scene.add(group);
  const wood = toon('#C99A62'), dark = toon('#9C7446');
  const deck = solid(roundBox(200, 14, 190, 4), wood, { ink: 2 }); deck.position.y = 61; group.add(deck);
  for (const x of [-92, 0, 92]) { const block = solid(roundBox(22, 54, 190, 4), dark, { ink: 2 }); block.position.set(x, 27, 0); group.add(block); }
  const crate = new THREE.Group(); crate.position.y = 68; group.add(crate);                 // pivots at the pallet's top, to rock
  const box = solid(roundBox(176, 176, 170, 10), new THREE.MeshToonMaterial({ map: planks() })); box.position.y = 88; crate.add(box);
  return { group, crate, PALLET_TOP: 54 };
}
