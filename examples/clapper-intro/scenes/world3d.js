// The 3D set: a dock (a desk with the label printer, a wall with a sign and a pinboard) and, beside it,
// the warehouse: pallet racking with bin labels on its beams, stock in the bins, and in A-01-03 the
// order itself, 24 boxes on a pallet, one with the maker's label. Tilly, with her forklift label (TL-01)
// on her mast. Millimetres, y up; the aisle is z > -450. Every name and number is made up.
import { paintedTexture, THREE } from '/@kit/scene3d.js';
import { roundBox, solid, toon } from '/@kit/toon3d.js';
import { decorativeBars, palletLoad, rack3d } from '/@kit/props3d.js';
import { desk3d, labelPrinter3d } from '/@kit/printers3d.js';
import { tilly3d } from '/@kit/characters/tilly3d.js';

export const RACK = { x: 4000, z: -450, scale: 1.8 };     // the rack row: its middle bay's centre, its front uprights
export const TILLY_SCALE = 3.2;                          // about 1.05 m tall; her forks slide under the pallet

const plane = (w, h, mat) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
const unlit = map => new THREE.MeshBasicMaterial({ map, toneMapped: false });

// A label to scan: big text over made-up bars. { w, h } in mm; faces +z from its middle.
export function tagLabel(title, value, { w = 300, h = 110, sub = '' } = {}) {
  const tex = paintedTexture(600, 220, (g, W, H) => {
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1B1B1B'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = '700 70px Roboto'; g.fillText(title, 26, 58, W - 52);
    if (sub) { g.font = '400 26px Roboto'; g.fillStyle = '#444'; g.fillText(sub, 26, 108, W - 52); }
    decorativeBars(g, 26, sub ? 130 : 108, W - 52, sub ? 60 : 80, value);
    g.strokeStyle = '#C9CFD6'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
  });
  const group = new THREE.Group();
  group.add(solid(roundBox(w, h, 2, 3, 2), toon('#FFFFFF'), { ink: 1.6 }));
  const face = plane(w - 4, h - 4, unlit(tex)); face.position.z = 1.2; group.add(face);
  return group;
}

// The order: a pallet (stringers along z, so forks slide in from the aisle) with 4 layers of 6 boxes.
export function orderLoad() {
  const group = new THREE.Group(), wood = toon('#C99A62'), dark = toon('#9C7446');
  const W = 900, D = 800, top = 190, layers = 4;
  for (const x of [-W / 2 + 45, 0, W / 2 - 45]) { const s = solid(roundBox(90, 150, D, 6), dark, { ink: 2 }); s.position.set(x, 75, 0); group.add(s); }
  const deck = solid(roundBox(W, 40, D, 6), wood, { ink: 2 }); deck.position.y = 170; group.add(deck);
  const cw = 440, ch = 110, cd = 260, colors = ['#C69A63', '#BD905A', '#CCA36D'];
  let n = 0;
  for (let l = 0; l < layers; l++) for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
    const box = solid(roundBox(cw - 6, ch - 3, cd - 6, 5), toon(colors[(n++) % 3]), { ink: 1.6 });
    box.position.set(-W / 2 + 10 + cw * (i + 0.5), top + ch * (l + 0.5), -D / 2 + 10 + cd * (j + 0.5));
    group.add(box);
  }
  const item = tagLabel('BOLT-7', 'BOLT-7', { w: 170, h: 68, sub: 'ROBOT BOLTS · 12 PACK' });   // the maker's label
  item.position.set(-W / 2 + 10 + cw * 0.5 - 60, top + ch * 1.5, D / 2 - 10 + 3); group.add(item);
  return { group, W, D, top, height: top + ch * layers, front: D / 2 - 7, item };
}

export function world(L) {
  const S = L.scene;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30000, 12000), toon('#CFC3B2')); floor.rotation.x = -Math.PI / 2; floor.position.x = 4000; floor.receiveShadow = true; S.add(floor);
  // the dock: its wall, pinboard and sign
  const dockWall = plane(6000, 4000, toon('#B9CBD6')); dockWall.position.set(-1100, 2000, -520); dockWall.receiveShadow = true; S.add(dockWall);
  const board = solid(roundBox(760, 520, 20, 10), toon('#C8A274'), { ink: 2 }); board.position.set(-150, 1480, -508); S.add(board);
  [['#FFF6B8', -250, 90, 0.06], ['#FFFFFF', -40, 120, -0.04], ['#CDEBFF', 180, 70, 0.08], ['#FFFFFF', -170, -110, -0.05], ['#FFD9C2', 120, -120, 0.03]]
    .forEach(([c, x, y, r]) => { const n = solid(roundBox(150, 180, 2, 2), toon(c), { ink: 1.4 }); n.position.set(-150 + x, 1480 + y, -496); n.rotation.z = r; S.add(n); });
  const sign = plane(460, 200, unlit(paintedTexture(460, 200, (g, w, h) => {
    g.fillStyle = '#F2C230'; g.fillRect(0, 0, w, h); g.fillStyle = '#1B1B1B'; g.fillRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#F2C230'; g.font = '700 110px Roboto'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DOCK 1', w / 2, h / 2 + 6);
  }))); sign.position.set(-900, 1180, -512); S.add(sign);
  // the warehouse: a back wall behind the racks, and the corner where the dock's wall turns back to it
  const back = plane(20000, 6000, toon('#C5CDD3')); back.position.set(11900, 3000, -1900); back.receiveShadow = true; S.add(back);
  const side = plane(1380, 4000, toon('#AFC1CC')); side.rotation.y = Math.PI / 2; side.position.set(1900, 2000, -1210); S.add(side);
  const stripe = solid(roundBox(20000, 160, 10, 4), toon('#E3B53C'), { ink: 1.4 }); stripe.position.set(11900, 1000, -1890); S.add(stripe);
  for (const z of [-360, 1700]) { const line = plane(12000, 60, toon('#E8C14A')); line.rotation.x = -Math.PI / 2; line.position.set(7900, 1, z); S.add(line); }

  // the dock's desk and printer
  const desk = desk3d({ w: 1600 }); S.add(desk.group); desk.group.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  const zt = labelPrinter3d({ model: 'ZT411' }); zt.group.position.set(-60, desk.top, -90); S.add(zt.group);

  // the racking: three bays, stock on the floor and the first beams, a bin label for each
  const rack = rack3d({ bays: 3, bayW: 720, depth: 560, height: 1670, levels: [830, 1500] });
  rack.group.scale.setScalar(RACK.scale); rack.group.position.set(RACK.x, 0, RACK.z); S.add(rack.group);
  const bayX = b => RACK.x + rack.bayX(b) * RACK.scale;
  const beamY = lv => rack.levels[lv] * RACK.scale, beamZ = RACK.z + (rack.BEAM.d + 15 + rack.BEAM.d / 2 + 1.5) * RACK.scale;
  const labels = {};
  ['02', '03', '04'].forEach((bay, b) => {
    for (const [lv, level, dx] of [[0, '01', -230], [0, '02', 230], [1, '03', 0]]) {
      const code = `A-${level}-${bay}`, tag = tagLabel(code, code, { sub: level === '01' ? '▼ FLOOR' : '' });
      tag.position.set(bayX(b) + dx, beamY(lv), beamZ); S.add(tag); labels[code] = tag;
    }
  });
  const load = (b, lv, seed) => {
    const p = palletLoad({ w: 480, d: 420, cols: 2, rows: 2, layers: 2 + (seed % 2), seed });
    p.scale.setScalar(RACK.scale); p.position.set(bayX(b), lv < 0 ? 0 : beamY(lv) + rack.BEAM.h / 2 * RACK.scale, RACK.z - 504);
    S.add(p);
  };
  load(0, -1, 1); load(2, -1, 2); load(0, 0, 3); load(1, 0, 4); load(2, 0, 5); load(1, 1, 6);
  const order = orderLoad(); order.group.position.set(bayX(1), 0, RACK.z - order.D / 2 - 20); S.add(order.group);

  // Tilly, and her forklift label on the mast's top bar
  const tilly = tilly3d(L);
  const tl = tagLabel('TL-01', 'TL-01', { w: 64, h: 30 });
  tl.position.set(0, 98, 158); tilly.cab.parent.parent.add(tl);       // on the chassis, at the mast's top bar
  return { zt, desk, rack, labels, order, tilly, tl, bayX };
}
