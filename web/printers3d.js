// Printers for the toon kit, to scale in millimetres (1 unit = 1 mm): an industrial label printer in
// the spirit of Zebra's ZT411 (the label roll behind a window in its side door, a touch screen and keys
// on the front, labels out of a slot with a tear bar), an office laser printer (pages out of the top,
// face down, into a bin), the labels and sheets they print, and a desk to stand them on. Cel-shaded and
// inked like props3d.js. No makers' logos: `model` puts a model name on the label printer if wanted.
// Each prop's origin is the middle of its footprint on the floor, its front towards +z.
import { clamp } from './core.js';
import { paintedTexture, THREE } from './scene3d.js';
import { ball, roundBox, solid, toon } from './toon3d.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const DROOP = 0.1;                     // how far a label out of the slot sags, in radians, when all of it is out
const M = new THREE.Matrix4();
const put = (parent, mesh, x, y, z) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
// a rounded block [w, h, d] at [x, y, z]
const block = (parent, [w, h, d], [x, y, z], mat, r = 4, o) => put(parent, solid(roundBox(w, h, d, r), mat, o), x, y, z);
// a cylinder along x
function roller(parent, r, len, [x, y, z], mat, o) {
  const m = solid(new THREE.CylinderGeometry(r, r, len, 40), mat, o);
  m.rotation.z = Math.PI / 2;
  return put(parent, m, x, y, z);
}
// an unlit picture on a plane (screens, printed faces), w x h, facing +z
const picture = (map, w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, toneMapped: false }));

// A picture from the project (a label, a page) as a texture, sharp at an angle.
export async function loadPicture(url) {
  const tex = await new THREE.TextureLoader().loadAsync(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

// ---------- a desk ----------
// A work desk: a wooden top on two metal side frames, with a panel at the back. top is its height.
export function desk3d({ w = 1400, d = 700, h = 740, top = '#C9A27C', frame = '#5E6670' } = {}) {
  const group = new THREE.Group(), wood = toon(top), metal = toon(frame);
  block(group, [w, 32, d], [0, h - 16, 0], wood, 6, { ink: 2.4 });
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 80);
    for (const sz of [-1, 1]) block(group, [46, h - 32, 46], [x, (h - 32) / 2, sz * (d / 2 - 70)], metal, 6);
    block(group, [54, 44, d - 90], [x, 22, 0], metal, 8);                     // the foot
    block(group, [40, 56, d - 140], [x, h - 60, 0], metal, 4);                 // under the top
  }
  block(group, [w - 200, 260, 14], [0, h - 32 - 150, -d / 2 + 90], metal, 4);  // the panel at the back
  return { group, top: h };
}

// ---------- the label printer ----------
// 269 wide, 324 high, 495 deep, after the ZT411. Facing it: on the left, the electronics, with the
// control column on the front (five lights, a portrait touch screen, three keys); on the right, the
// media bay under a one-piece door (half the roof, the whole right side with a window along its top,
// and a cap on the front), which swings up and over. Labels come out between the cap and a ribbed
// panel, over a serrated tear bar about halfway up, printed side up, their tops first. Silver roof and
// sides, a charcoal front; inside, the roll on its hanger, the ribbon's spindles, the black print
// mechanism, and the touch points in gold, as Zebra marks them.
const LP = { W: 269, H: 324, D: 495, FOOT: 8, col: 97, exitY: 165.5, label: 104 };

function screenPainter(g, w, h, s = {}) {
  const busy = s.state === 'printing';
  g.fillStyle = '#0B0C0E'; g.fillRect(0, 0, w, h);
  g.font = '500 22px Roboto'; g.textBaseline = 'middle'; g.fillStyle = '#E6E9ED';
  g.textAlign = 'center'; g.fillText('Home', w / 2, 24); g.textAlign = 'right'; g.fillText(s.time ?? '10:42', w - 12, 24);
  ['Status', 'Info'].forEach((tab, i) => {                          // the tabs, the first one chosen
    g.fillStyle = i ? '#2B2F35' : '#F2B01E'; g.fillRect(i * w / 2 + 2, 50, w / 2 - 4, 34);
    g.fillStyle = i ? '#C9CED6' : '#111'; g.textAlign = 'center'; g.font = '500 19px Roboto'; g.fillText(tab, i * w / 2 + w / 4, 68);
  });
  g.fillStyle = '#1D5FA8'; g.fillRect(0, 90, w, 290);
  g.strokeStyle = '#FFFFFF'; g.lineWidth = 5; g.lineJoin = 'round';        // the printer, drawn simply
  g.strokeRect(w / 2 - 62, 130, 124, 88); g.strokeRect(w / 2 - 62, 130, 44, 88);
  g.fillStyle = '#FFFFFF'; g.fillRect(w / 2 - 6, 205, 60, busy ? 26 : 6);   // a label coming out
  g.fillStyle = busy ? '#8FD0FF' : '#6BE38E'; g.beginPath(); g.arc(w / 2 + 44, 150, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.font = '700 30px Roboto';
  g.fillText(s.title ?? (busy ? 'Printing' : 'Printer Ready'), w / 2, 272);
  g.font = '400 21px Roboto'; g.fillStyle = '#D6E6F7';
  g.fillText(s.sub ?? s.name ?? '', w / 2, 308);
  if (busy && s.progress !== undefined) {
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(34, 336, w - 68, 10);
    g.fillStyle = '#FFFFFF'; g.fillRect(34, 336, (w - 68) * Math.min(1, s.progress), 10);
  }
  ['Menu', 'Wizards', 'Shortcuts'].forEach((b, i) => {                // three buttons along the bottom
    const x = 6 + i * (w - 12) / 3, bw = (w - 12) / 3 - 6;
    g.fillStyle = '#1B1D21'; g.fillRect(x, 394, bw, 80);
    g.fillStyle = '#C9CED6';
    for (const dy of [0, 8, 16]) g.fillRect(x + bw / 2 - 12, 414 + dy, 24, 4);
    g.font = '400 15px Roboto'; g.fillText(b, x + bw / 2, 456);
  });
}

// labelPrinter3d({ model }) -> { group, screen, door, exit, update({ door, screen, led }), hang, hung }.
// exit is where the strip of labels leaves (the middle of its width, over the tear bar), in the printer's
// own space. hang(label, out) hangs a printedLabel from the slot with out mm of it out; hung(label) is
// the pose { c, f, u } it hangs in when all of it is out, to carry it off from (scene3d's poseBetween).
// update's door opens it (0..1); screen repaints the touch screen: { state: 'ready' | 'printing',
// title, sub, name, progress }; led sets the lights: { status: 'green', data: 'off', ... }.
export function labelPrinter3d({ model = '' } = {}) {
  const group = new THREE.Group();
  const silver = toon('#A9AFB8'), front = toon('#2A2D32'), gloss = toon('#0C0D10'), lower = toon('#383C43');
  const steel = toon('#AEB5BD'), black = toon('#1A1C20'), gold = toon('#E8A824'), keyMat = toon('#D4D8DD'), frame = toon('#1F2227');
  const rubber = toon('#141619'), paper = toon('#F5F2EA'), core = toon('#B98A55'), ribbon = toon('#1C1E22');
  const { W, H, D, FOOT, col, exitY } = LP, x0 = -W / 2, x1 = W / 2, zf = D / 2, zb = -D / 2, wall = x0 + col;
  const bayW = x1 - wall, bayX = (wall + x1) / 2;
  const labelX = wall + 5 + LP.label / 2;                           // labels run against the centre wall
  for (const x of [x0 + 34, x1 - 34]) for (const z of [zb + 44, zf - 44]) block(group, [36, FOOT + 2, 36], [x, (FOOT + 2) / 2, z], rubber, 3, { ink: 1.2 });

  // the electronics, and the control column on their front
  block(group, [col, H - FOOT, D - 8], [(x0 + wall) / 2, FOOT + (H - FOOT) / 2, -4], silver, 12);
  const cx = x0 + col / 2;
  block(group, [col, H - FOOT, 12], [cx, FOOT + (H - FOOT) / 2, zf - 6], front, 8);
  block(group, [86, 171, 3], [cx, 230.5, zf + 1.5], gloss, 6, { ink: 1.4 });
  const leds = ['status', 'pause', 'data', 'supplies', 'network'].map((id, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: '#2A2E33' });
    put(group, new THREE.Mesh(ball(2.8, 12), mat), x0 + 18 + i * 15, H - 25, zf + 3.2);
    return [id, mat];
  });
  const screen = paintedTexture(272, 480, screenPainter);
  block(group, [60, 105, 2], [x0 + 48, H - 89, zf + 3.4], toon('#050506'), 3, { ink: 1 });
  put(group, picture(screen, 54, 95), x0 + 48, H - 89, zf + 4.6);
  const icon = toon('#3A3F46'), keys = [];
  [x0 + 21.5, x0 + 48, x0 + 75].forEach((x, i) => {
    const k = block(group, [21, 11, 5], [x, H - 165.5, zf + 3.5], keyMat, 2.5, { ink: 1.2 });
    if (i === 0) for (const dx of [-2.2, 2.2]) block(k, [2, 6, 1], [dx, 0, 2.7], icon, 0.5, { ink: 0 });          // pause
    if (i === 1) { block(k, [7, 1.6, 1], [0, -2.4, 2.7], icon, 0.5, { ink: 0 }); block(k, [2, 4, 1], [0, 0.8, 2.7], icon, 0.5, { ink: 0 }); }   // feed
    if (i === 2) for (const r of [0.785, -0.785]) block(k, [7, 1.6, 1], [0, 0, 2.7], icon, 0.5, { ink: 0 }).rotation.z = r;   // cancel
    keys.push(k);
  });
  block(group, [88, 108, 2], [cx, 16 + 54, zf + 1], lower, 5, { ink: 1 });
  block(group, [24, 35, 2], [cx, 55.5, zf + 2.2], toon('#24272C'), 4, { ink: 1 });   // the USB port's cover
  if (model) {
    const tag = paintedTexture(256, 64, (g, w, h) => { g.fillStyle = '#2A2D32'; g.fillRect(0, 0, w, h); g.fillStyle = '#C9CED6'; g.font = '700 40px Roboto'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(model, w / 2, h / 2 + 2); });
    put(group, picture(tag, 52, 13), cx, H - 188, zf + 0.6);
  }

  // the media bay: its base, the steel shelf, the back, and the front below the labels' exit
  block(group, [bayW - 10, 92, 330], [bayX - 5, FOOT + 46, zb + 165 + 8], black, 6);
  block(group, [bayW - 10, 5, 330], [bayX - 5, FOOT + 94.5, zb + 165 + 8], steel, 2, { ink: 1.2 });
  block(group, [bayW - 10, 132, zf - 90], [bayX - 5, FOOT + 66, (90 + zf - 12) / 2], black, 6);
  block(group, [bayW, H - FOOT - 10, 14], [bayX, FOOT + (H - FOOT - 10) / 2, zb + 7], silver, 8);
  block(group, [bayW, 77, 14], [bayX, FOOT + 38.5, zf - 7], front, 6);
  block(group, [bayW, 60, 14], [bayX, 115, zf - 7], front, 6);
  for (let i = 0; i < 8; i++) block(group, [4, 48, 3], [wall + 22 + i * ((bayW - 44) / 7), 115, zf + 1], toon('#3A3E45'), 1.5, { ink: 0.9 });   // the ribs
  // the exit: dark inside, the platen roller, the print mechanism above, the tear bar in front
  block(group, [bayW - 14, 67, 3], [bayX - 2, 178.5, zf - 90], toon('#08090A'), 1, { ink: 0 });
  for (const x of [wall + 0.6, x1 - 8.6]) block(group, [1, 67, 80], [x, 178.5, zf - 50], toon('#0D0E10'), 0.3, { ink: 0 });   // its dark sides
  block(group, [bayW - 16, 44, 70], [bayX - 4, 190, zf - 50], black, 6);
  roller(group, 10, LP.label + 14, [labelX, exitY - 10.6, zf - 38], rubber, { ink: 1 });
  block(group, [133, 5, 10], [labelX, exitY - 5, zf + 2], toon('#C3C9D0'), 1.5, { ink: 1.3 });
  for (let i = 0; i < 26; i++) {                                     // its teeth
    const tooth = block(group, [3, 3, 1.6], [labelX - 62 + i * 4.96, exitY - 2.4, zf + 6.4], toon('#AEB5BD'), 0.3, { ink: 0 });
    tooth.rotation.z = Math.PI / 4;
  }
  block(group, [LP.label, 0.6, zf + 60], [labelX, exitY, (zf - 2 - 60) / 2], paper, 0.2, { ink: 1 });   // the strip, to the head
  // the roll on its hanger, with the supply guide at its outer end
  roller(group, 16, bayW - 24, [wall + (bayW - 24) / 2, 190, zf - 365], steel, { ink: 1.2 });
  roller(group, 64, LP.label, [labelX, 190, zf - 365], paper, { ink: 1.8 });
  for (const [r, mat, dx] of [[38, core, 0.5], [31, toon('#2A241E'), 0.8]]) {
    const disc = put(group, new THREE.Mesh(new THREE.CircleGeometry(r, 40), mat), labelX + LP.label / 2 + dx, 190, zf - 365);
    disc.rotation.y = Math.PI / 2;
  }
  block(group, [4, 120, 118], [labelX + LP.label / 2 + 8, 190, zf - 365], toon('#3A3E45'), 3, { ink: 1.2 });
  // the ribbon: its supply roll and the take-up spindle with its gold knob, and the head's gold lever
  roller(group, 34, 110, [labelX, 270, zf - 220], ribbon, { ink: 1.4 });
  roller(group, 22, 110, [labelX, 270, zf - 120], ribbon, { ink: 1.4 });
  for (const z of [zf - 220, zf - 120]) roller(group, 9, 124, [labelX + 4, 270, z], steel, { ink: 1 });
  roller(group, 14, 12, [labelX + 66, 270, zf - 120], gold, { ink: 1.2 });
  block(group, [14, 32, 24], [labelX + 44, 240, zf - 40], gold, 4, { ink: 1.3 });

  // the door, hinged along the roof's seam: half the roof, the right side with its window, the front cap
  const door = new THREE.Group(); door.position.set(wall, H, 0); group.add(door);
  const sw = bayW, sd = D - 8, sx = sw - 4, winTop = 35, winH = 85, winZ0 = -122.5, winZ1 = 142.5, side = H - FOOT - 2;
  block(door, [sw, 8, sd], [sw / 2, -4, -4], silver, 6);
  block(door, [8, winTop, sd], [sx, -winTop / 2, -4], silver, 5);
  block(door, [8, winH, winZ0 - (zb + 4)], [sx, -winTop - winH / 2, (zb + 4 + winZ0) / 2], silver, 4);
  block(door, [8, winH, zf - 4 - winZ1], [sx, -winTop - winH / 2, (winZ1 + zf - 4) / 2], silver, 4);
  block(door, [8, side - winTop - winH, sd], [sx, -(winTop + winH) - (side - winTop - winH) / 2, -4], silver, 6);
  for (const [h, d, y, z] of [[5, winZ1 - winZ0 + 10, -winTop + 2, (winZ0 + winZ1) / 2], [5, winZ1 - winZ0 + 10, -winTop - winH - 2, (winZ0 + winZ1) / 2],
    [winH + 10, 5, -winTop - winH / 2, winZ0 - 2], [winH + 10, 5, -winTop - winH / 2, winZ1 + 2]]) block(door, [9.5, h, d], [sx, y, z], frame, 2, { ink: 1.2 });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(winZ1 - winZ0, winH),
    new THREE.MeshBasicMaterial({ color: '#A9CADB', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
  glass.rotation.y = Math.PI / 2; put(door, glass, sx, -winTop - winH / 2, (winZ0 + winZ1) / 2);
  const shine = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  for (const [dz, w] of [[-40, 30], [4, 10]]) {                     // two streaks of light on the glass
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, winH), shine);
    s.rotation.set(0, Math.PI / 2, 0.5); put(door, s, sx + 0.5, -winTop - winH / 2, dz);
  }
  block(door, [1.2, 2, sd - 30], [sw + 0.2, -175, -4], toon('#8E959E'), 0.5, { ink: 0 });          // the crease
  block(door, [1.6, 12, 70], [sw + 0.3, -side + 10, 0], toon('#565C64'), 3, { ink: 0 });           // the finger grip
  block(door, [sw, H - 212, 12], [sw / 2, -(H - 212) / 2, zf - 6], front, 8);                    // the cap

  const LED = { off: '#2A2E33', green: '#39E26A', amber: '#FFB21F', red: '#FF3B30' };
  return {
    group, screen, door, keys, labelX,
    exit: V(labelX, exitY + 0.5, zf - 1),
    hang(label, out) {
      group.updateMatrixWorld();
      label.group.position.copy(this.exit).applyMatrix4(group.matrixWorld);
      group.getWorldQuaternion(label.group.quaternion);
      return label.setOut(out);
    },
    hung(label, droop = DROOP) {
      group.updateMatrixWorld();
      const q = group.getWorldQuaternion(new THREE.Quaternion());
      const f = V(0, Math.cos(droop), Math.sin(droop)).applyQuaternion(q), u = V(0, -Math.sin(droop), Math.cos(droop)).applyQuaternion(q);
      return { c: this.exit.clone().applyMatrix4(group.matrixWorld).addScaledVector(u, label.pitch / 2), f, u };
    },
    update({ door: open = 0, screen: s, led = {} } = {}) {
      door.rotation.z = clamp(open) * Math.PI;
      if (s) screen.redraw(s);
      for (const [id, mat] of leds) mat.color.set(LED[led[id] ?? (id === 'status' ? 'green' : 'off')] ?? led[id]);
    },
  };
}

// ---------- printed labels ----------
// A label on its backing, as it comes off a roll: w x h, a gap between labels, the backing a little
// wider. Its group's origin is where the strip leaves the printer; it lies along +z, printed side up,
// the top of the label furthest out (the top is printed first). setOut(mm) says how far the strip has
// come out: only that much shows, and only as much of the picture as has been printed. With a strip of
// several labels, label i is out by (fed - i * pitch). Once torn off, place(center, facing, up) puts the
// label anywhere: its middle at center, its face towards facing, its top towards up.
export function printedLabel(map, { w = 101.6, h = 152.4, gap = 3.2, liner = 106 } = {}) {
  const group = new THREE.Group(), pitch = h + gap;
  const strip = new THREE.Group(); group.add(strip);                  // turned about the slot, for the droop
  const backing = solid(roundBox(liner, 0.5, pitch, 0.24, 1), toon('#EFE8D6'), { ink: 1.1 });
  strip.add(backing);
  const tex = map.clone(); tex.needsUpdate = true;
  const face = picture(tex, w, h); strip.add(face);
  // the picture's x runs to -x and its top to +z, facing up (+y), so it reads from the front
  face.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, 0, 1), V(0, 1, 0)));
  const edge = solid(roundBox(w, 0.3, h, 0.12, 1), toon('#FFFFFF'), { ink: 1.2 }); strip.add(edge);
  let out = 0;
  const Q = new THREE.Quaternion(), X = V(), Y = V(), Z = V(), C = V();
  const self = {
    group, pitch, w, h,
    setOut(o, { droop = DROOP } = {}) {
      out = Math.max(0, o);
      group.visible = out > 0.01;
      const shown = Math.min(out, pitch), far = out, near = out - shown;
      backing.scale.z = Math.max(1e-3, shown / pitch); backing.position.set(0, 0.25, (far + near) / 2);
      const top = out - gap / 2, vis = clamp(top, 0, h), bottom = Math.max(0, top - h), vh = clamp(top - bottom, 0, h);
      face.visible = edge.visible = vh > 0.05;
      face.scale.y = edge.scale.z = Math.max(1e-3, vh / h);
      face.position.set(0, 0.8, bottom + vh / 2); edge.position.set(0, 0.55, bottom + vh / 2);
      tex.repeat.set(1, vh / h); tex.offset.set(0, 1 - vis / h);
      strip.rotation.x = droop * Math.pow(Math.min(1, shown / pitch), 2);   // a long piece sags a little
      return self;
    },
    // A point on the printed face, u across and v down the picture (0..1, as on the image), in the world:
    // to aim a scanner at one of its barcodes.
    at(u, v) { group.updateMatrixWorld(true); return face.localToWorld(V((u - 0.5) * w, (0.5 - v) * h, 0.5)); },
    // After tearing: the label's middle at center (world), its printed face towards facing, its top towards up.
    place(center, facing, up) {
      self.setOut(pitch, { droop: 0 });
      Y.copy(facing).normalize(); Z.copy(up).addScaledVector(Y, -up.dot(Y)).normalize(); X.crossVectors(Y, Z);
      Q.setFromRotationMatrix(M.makeBasis(X, Y, Z));
      group.quaternion.copy(Q);
      C.set(0, 0, pitch / 2).applyQuaternion(Q);
      group.position.copy(center).sub(C);
      return self;
    },
  };
  return self.setOut(0);
}

// ---------- the laser printer ----------
// 380 wide, 260 high, 360 deep: pages come out of a slot at the back of the top, face down, into the
// bin. paperOut is where a page leaves the slot (the middle of its leading edge), in the printer's space,
// running towards +z along the bin. feed(sheet, k) shows a sheet3d k (0..1) of the way out, face down,
// bottom edge first; lying(sheet) is the pose { c, f, u } it lies in once out, to pick it up from.
// update's screen repaints its little display: { lines: ['Ready', ''] }.
const LZ = { W: 380, D: 360, bin: 206 };
export function laserPrinter3d({ body = '#E7E9EC', trim = '#3C4249' } = {}) {
  const group = new THREE.Group(), B = toon(body), T = toon(trim), pale = toon('#D5D9DE');
  const { W, D, bin } = LZ, zf = D / 2;
  for (const x of [-W / 2 + 40, W / 2 - 40]) for (const z of [-zf + 40, zf - 40]) block(group, [30, 6, 30], [x, 3, z], toon('#26292D'), 2, { ink: 1 });
  block(group, [W - 8, 78, D - 10], [0, 6 + 39, -2], pale, 10);                     // the paper tray
  block(group, [W - 20, 60, 8], [0, 44, zf - 4], pale, 6, { ink: 1.6 });
  block(group, [130, 12, 4], [0, 34, zf + 1], T, 5, { ink: 1.2 });                 // its grip
  block(group, [W, bin - 84, D], [0, 84 + (bin - 84) / 2, 0], B, 16);              // the body
  block(group, [W - 30, 2, 1], [0, 150, zf + 0.5], toon('#B8BEC6'), 0.5, { ink: 0 });   // the front door's seam
  // the top: the bin between two rails, and the hood at the back with the slot
  block(group, [W - 90, 6, 250], [0, bin + 3, 40], T, 3, { ink: 1.4 });
  for (const s of [-1, 1]) block(group, [45, 26, 250], [s * (W / 2 - 22.5), bin + 13, 40], B, 8);
  block(group, [W, 58, 110], [0, bin + 29, -zf + 55], B, 16);
  block(group, [250, 5, 3], [0, bin + 9, -zf + 110.5], toon('#0B0C0E'), 1.5, { ink: 0 });
  // the control panel, front right: a small display, three keys and a light
  const panel = new THREE.Group(); panel.position.set(W / 2 - 80, bin - 24, zf + 7); panel.rotation.x = -0.42; group.add(panel);
  block(panel, [130, 44, 10], [0, 0, 0], T, 5);
  const screen = paintedTexture(256, 96, (g, w, h, s = {}) => {
    g.fillStyle = '#123B3A'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9AF2D9'; g.font = '500 30px Roboto'; g.textBaseline = 'middle'; g.textAlign = 'left';
    const [a = 'Ready', b = ''] = s.lines ?? [];
    g.fillText(a, 12, 30); g.font = '400 24px Roboto'; g.fillText(b, 12, 70);
  });
  put(panel, picture(screen, 62, 23), -24, 3, 5.2);
  for (let i = 0; i < 3; i++) block(panel, [14, 10, 4], [22 + i * 17, 6, 5.5], toon('#565D66'), 3, { ink: 1 });
  const ledMat = new THREE.MeshBasicMaterial({ color: '#39E26A' });
  put(panel, new THREE.Mesh(ball(2.6, 12), ledMat), 22, -10, 5.5);
  for (let i = 0; i < 6; i++) block(group, [3, 90, 12], [W / 2 + 0.5, 120, -80 + i * 22], toon('#C5CAD1'), 1.2, { ink: 0 });   // vents
  return {
    group, screen,
    paperOut: V(0, bin + 7.5, -zf + 111),
    lying(sheet) {
      group.updateMatrixWorld();
      const q = group.getWorldQuaternion(new THREE.Quaternion());
      return { c: this.paperOut.clone().add(V(0, 0, sheet.h / 2)).applyMatrix4(group.matrixWorld), f: V(0, -1, 0).applyQuaternion(q), u: V(0, 0, -1).applyQuaternion(q) };
    },
    feed(sheet, k) {
      const p = this.lying(sheet);
      sheet.show(k);
      return sheet.place(p.c.addScaledVector(p.u, (1 - clamp(k)) * sheet.h), p.f, p.u);
    },
    update({ screen: s, led = '#39E26A' } = {}) { if (s) screen.redraw(s); ledMat.color.set(led); },
  };
}

// ---------- sheets of paper ----------
// A sheet (A4 unless told), its picture on the front. Its group's origin is its middle, the front
// facing +z, its top towards +y. show(k) shows only the leading k (0..1) of it, from the bottom edge
// up, as it comes out of a printer upside down; the rest is still inside. place(c, f, u) puts its
// middle at c, its front towards f and its top towards u (a pose, as scene3d's poseBetween gives).
export function sheet3d(map, { w = 210, h = 297 } = {}) {
  const group = new THREE.Group(), inner = new THREE.Group(); group.add(inner);
  inner.add(solid(roundBox(w, h, 0.3, 0.14, 1), toon('#FFFFFF'), { ink: 1.3 }));
  const face = picture(map, w, h); face.position.z = 0.25; inner.add(face);
  return {
    group, w, h, face,
    place(c, f, u) {
      const z = f.clone().normalize(), y = u.clone().addScaledVector(z, -u.dot(z)).normalize();
      group.quaternion.setFromRotationMatrix(M.makeBasis(V().crossVectors(y, z), y, z));
      group.position.copy(c);
      return this;
    },
    show(k = 1) {
      k = clamp(k);
      group.visible = k > 0.001;
      inner.scale.y = Math.max(1e-3, k); inner.position.y = -h / 2 * (1 - k);
      return this;
    },
  };
}
