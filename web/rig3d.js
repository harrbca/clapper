// Skinned characters: a skeleton of bones, and smooth meshes that bend with it, modelled as distance
// fields. A body part is a set of simple shapes (tapered capsules, ellipsoids, rounded boxes), each
// hung on a bone and blended smoothly into its neighbours; the surface is meshed once at setup, and
// each vertex is bound to the bones whose shapes are nearest it, so knuckles, wrists and elbows bend
// as one skin instead of as stacked parts. Cel-shaded and inked like toon3d.js, the ink bending too.
//
//   const sk = skeleton(group, [{ name: 'arm', at: [0, 0, 0] }, { name: 'fore', parent: 'arm', at: [0, -100, 0] }]);
//   const shape = smooth(8, cone('arm', 100, 20, 16), cone('fore', 90, 16, 12));
//   skinned(sk, shape, toon('#E8B08A'), { cell: 2 });
//   sk.by.fore.rotation.z = -1;          // then pose the bones: rotations are on top of the rest pose
//
// Bones hang down their -y at rest, as in toon3d.js. Units are the model's own; scale the group.
import { THREE } from './scene3d.js';
import { INK3D } from './style.js';
import { INK } from './toon.js';

// ---------- the skeleton ----------
// bones: [{ name, parent, at: [x, y, z] in the parent's space, rest: a Quaternion (or [x, y, z] Euler
// radians) turning the bone from its parent's frame }]. The first bone without a parent is the root,
// added to `group`. Returns { root, bones, by, rest(name) (model-space rest matrix), skeleton, reset() }.
export function skeleton(group, bones) {
  const by = {}, list = [];
  for (const b of bones) {
    const bone = new THREE.Bone();
    bone.name = b.name;
    bone.position.set(...(b.at ?? [0, 0, 0]));
    if (b.rest instanceof THREE.Quaternion) bone.quaternion.copy(b.rest);
    else if (b.rest) bone.quaternion.setFromEuler(new THREE.Euler(...b.rest));
    bone.userData.rest = bone.quaternion.clone();
    bone.userData.restAt = bone.position.clone();
    (b.parent ? by[b.parent] : group).add(bone);
    by[b.name] = bone; list.push(bone);
  }
  group.updateWorldMatrix(true, true);
  const bind = group.matrixWorld.clone(), inv = bind.clone().invert();
  const restM = Object.fromEntries(list.map(b => [b.name, new THREE.Matrix4().multiplyMatrices(inv, b.matrixWorld)]));
  const skel = new THREE.Skeleton(list);                    // its inverses are taken from the rest pose, now
  return {
    group, root: list[0], bones: list, by, skeleton: skel, bind,
    index: Object.fromEntries(list.map((b, i) => [b.name, i])),
    rest: name => restM[name],
    // every bone back to its rest pose
    reset() { for (const b of list) { b.quaternion.copy(b.userData.rest); b.position.copy(b.userData.restAt); } },
  };
}

// Turn a bone by Euler angles on top of its rest pose.
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
export function turn(bone, x = 0, y = 0, z = 0, order = 'XZY') {
  bone.quaternion.copy(bone.userData.rest).multiply(_q.setFromEuler(_e.set(x, y, z, order)));
}

// ---------- shapes ----------
// Each shape hangs on a bone, placed by `at` (and `rot`, Euler radians) in the bone's rest frame,
// and may be squashed by `scale` [sx, sy, sz] (a little: the distance stays roughly right).
//   cone(bone, len, r1, r2, o): a capsule from the bone's origin down its -y, r1 thick at the top, r2 at the bottom
//   ell(bone, [rx, ry, rz], o): an ellipsoid
//   box(bone, [hx, hy, hz], r, o): a box with rounded edges, half sizes h
// `weight: false` leaves a shape out of the skinning (it still shapes the surface); `bone2` binds it
// to another bone than the one it is placed by.
export const cone = (bone, len, r1, r2 = r1, o = {}) => ({ kind: 'cone', bone, len, r1, r2, ...o });
export const ell = (bone, r, o = {}) => ({ kind: 'ell', bone, r, ...o });
export const box = (bone, h, r = 2, o = {}) => ({ kind: 'box', bone, h, r, ...o });
// a ring round the bone's y axis, R across, r thick (a collar, a cuff)
export const ring = (bone, R, r, o = {}) => ({ kind: 'ring', bone, R, r, ...o });
// Joining shapes: smooth(k, ...) blends them with fillets about k wide; union(...) just joins them;
// attach(k, base, ...parts) blends each part into base but not into each other (fingers into a palm);
// carve(k, from, ...cut) takes shapes away, smoothly.
export const smooth = (k, ...of) => ({ op: 'smin', k, of });
export const union = (...of) => ({ op: 'min', of });
export const attach = (k, base, ...of) => ({ op: 'attach', k, base, of });
export const carve = (k, from, ...of) => ({ op: 'sub', k, from, of });

const leaves = node => (node.kind ? [node] : [...(node.base ? leaves(node.base) : []), ...(node.from ? leaves(node.from) : []), ...node.of.flatMap(leaves)]);

// A shape's distance function in model space, (x, y, z) => d, from the bones' rest pose. It carries
// a bounding sphere (f.c, f.r), so a blend can skip shapes too far away to change its answer.
function compileLeaf(L, sk) {
  const f = leafFn(L, sk);
  const m = new THREE.Matrix4().copy(sk.rest(L.bone)).multiply(new THREE.Matrix4().compose(new THREE.Vector3(...(L.at ?? [0, 0, 0])),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...(L.rot ?? [0, 0, 0]), L.order ?? 'XYZ')), new THREE.Vector3(1, 1, 1)));
  const s = Math.max(...(L.scale ?? [1, 1, 1]));
  const c = new THREE.Vector3(0, L.kind === 'cone' ? -L.len / 2 : 0, 0).applyMatrix4(m);
  f.c = c.toArray();
  f.r = s * (L.kind === 'cone' ? L.len / 2 + Math.max(L.r1, L.r2) : L.kind === 'ell' ? Math.max(...L.r) : L.kind === 'box' ? Math.hypot(...L.h) : L.R + L.r) + 1;
  return f;
}
function leafFn(L, sk) {
  const m = new THREE.Matrix4().copy(sk.rest(L.bone));
  const local = new THREE.Matrix4().compose(new THREE.Vector3(...(L.at ?? [0, 0, 0])),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...(L.rot ?? [0, 0, 0]), L.order ?? 'XYZ')), new THREE.Vector3(1, 1, 1));
  const e = m.multiply(local).invert().elements;
  const [sx, sy, sz] = L.scale ?? [1, 1, 1], smin = Math.min(sx, sy, sz);
  const a0 = e[0] / sx, a1 = e[4] / sx, a2 = e[8] / sx, a3 = e[12] / sx;
  const b0 = e[1] / sy, b1 = e[5] / sy, b2 = e[9] / sy, b3 = e[13] / sy;
  const c0 = e[2] / sz, c1 = e[6] / sz, c2 = e[10] / sz, c3 = e[14] / sz;
  if (L.kind === 'cone') {
    // iq's round cone, from y = 0 (r1) to y = -len (r2)
    const { len: h, r1, r2 } = L, b = (r1 - r2) / h, a = Math.sqrt(1 - b * b);
    return (x, y, z) => {
      const px = a0 * x + a1 * y + a2 * z + a3, py = -(b0 * x + b1 * y + b2 * z + b3), pz = c0 * x + c1 * y + c2 * z + c3;
      const qx = Math.sqrt(px * px + pz * pz), k = -b * qx + a * py;
      if (k < 0) return (Math.sqrt(qx * qx + py * py) - r1) * smin;
      if (k > a * h) return (Math.sqrt(qx * qx + (py - h) * (py - h)) - r2) * smin;
      return (qx * a + py * b - r1) * smin;
    };
  }
  if (L.kind === 'ell') {
    const [rx, ry, rz] = L.r;
    return (x, y, z) => {
      const px = a0 * x + a1 * y + a2 * z + a3, py = b0 * x + b1 * y + b2 * z + b3, pz = c0 * x + c1 * y + c2 * z + c3;
      const k0 = Math.sqrt((px / rx) ** 2 + (py / ry) ** 2 + (pz / rz) ** 2), k1 = Math.sqrt((px / (rx * rx)) ** 2 + (py / (ry * ry)) ** 2 + (pz / (rz * rz)) ** 2);
      return (k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1) * smin;
    };
  }
  if (L.kind === 'box') {
    const [hx, hy, hz] = L.h, r = L.r;
    return (x, y, z) => {
      const qx = Math.abs(a0 * x + a1 * y + a2 * z + a3) - hx + r, qy = Math.abs(b0 * x + b1 * y + b2 * z + b3) - hy + r, qz = Math.abs(c0 * x + c1 * y + c2 * z + c3) - hz + r;
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
      return (Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - r) * smin;
    };
  }
  if (L.kind === 'ring') {
    const { R, r } = L;
    return (x, y, z) => {
      const px = a0 * x + a1 * y + a2 * z + a3, py = b0 * x + b1 * y + b2 * z + b3, pz = c0 * x + c1 * y + c2 * z + c3;
      const q = Math.sqrt(px * px + pz * pz) - R;
      return (Math.sqrt(q * q + py * py) - r) * smin;
    };
  }
  throw new Error('unknown shape ' + L.kind);
}

const sminF = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
// How near (x, y, z) any part of f can be: its distance to f's bounding sphere.
const near = (f, x, y, z) => Math.sqrt((x - f.c[0]) ** 2 + (y - f.c[1]) ** 2 + (z - f.c[2]) ** 2) - f.r;
function bound(fs) {
  const c = [0, 1, 2].map(a => fs.reduce((s, f) => s + f.c[a], 0) / fs.length);
  return { c, r: Math.max(...fs.map(f => Math.hypot(f.c[0] - c[0], f.c[1] - c[1], f.c[2] - c[2]) + f.r)) };
}
function compile(node, sk) {
  if (node.kind) return compileLeaf(node, sk);
  const fs = node.of.map(n => compile(n, sk)), n = fs.length, k = node.k;
  let f;
  // each skips a part that can't come near enough to make a difference (for a blend, within k)
  if (node.op === 'min') f = (x, y, z) => { let d = Infinity; for (let i = 0; i < n; i++) { if (near(fs[i], x, y, z) >= d) continue; const v = fs[i](x, y, z); if (v < d) d = v; } return d; };
  else if (node.op === 'smin') f = (x, y, z) => { let d = Infinity; for (let i = 0; i < n; i++) { if (near(fs[i], x, y, z) >= d + k) continue; d = sminF(d, fs[i](x, y, z), k); } return d; };
  else if (node.op === 'attach') {
    const base = compile(node.base, sk);
    fs.push(base);
    f = (x, y, z) => { const b = base(x, y, z); let d = b; for (let i = 0; i < n; i++) { if (near(fs[i], x, y, z) >= b + k) continue; const v = sminF(b, fs[i](x, y, z), k); if (v < d) d = v; } return d; };
  } else if (node.op === 'sub') {
    const from = compile(node.from, sk);
    f = (x, y, z) => {
      let d = from(x, y, z);
      for (let i = 0; i < n; i++) {
        if (near(fs[i], x, y, z) >= k - d) continue;
        const c = -fs[i](x, y, z), h = Math.max(k - Math.abs(d - c), 0) / k; d = Math.max(d, c) + h * h * k * 0.25;
      }
      return d;
    };
    fs.push(from);
  } else throw new Error('unknown op ' + node.op);
  Object.assign(f, bound(fs));
  // far from everything, the distance to the bounding sphere will do (it is never more than the truth)
  const g = (x, y, z) => { const b = near(f, x, y, z); return b > 12 ? b : f(x, y, z); };
  return Object.assign(g, { c: f.c, r: f.r });
}

// ---------- meshing ----------
// Surface nets on a grid of `cell`-sized cubes over the box lo..hi, sampling the field exactly only
// near the surface (a coarse pass first finds where that is). Vertices are pulled onto the surface
// and take their normals from the field. Returns { positions: Float32Array, normals, indices }.
function surfaceNets(f, lo, hi, cell) {
  const nx = Math.ceil((hi[0] - lo[0]) / cell) + 1, ny = Math.ceil((hi[1] - lo[1]) / cell) + 1, nz = Math.ceil((hi[2] - lo[2]) / cell) + 1;
  const C = 4, cx = Math.ceil((nx - 1) / C) + 1, cy = Math.ceil((ny - 1) / C) + 1, cz = Math.ceil((nz - 1) / C) + 1;
  const coarse = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++)
    coarse[i + cx * (j + cy * k)] = f(lo[0] + i * C * cell, lo[1] + j * C * cell, lo[2] + k * C * cell);
  const val = new Float32Array(nx * ny * nz);
  const exact = new Uint8Array(nx * ny * nz);
  const safe = C * cell * 0.87 * 1.35;
  for (let k = 0; k < cz - 1; k++) for (let j = 0; j < cy - 1; j++) for (let i = 0; i < cx - 1; i++) {
    let mn = Infinity, pos = 0, neg = 0;
    for (let c = 0; c < 8; c++) {
      const v = coarse[(i + (c & 1)) + cx * ((j + ((c >> 1) & 1)) + cy * (k + (c >> 2)))];
      mn = Math.min(mn, Math.abs(v)); if (v > 0) pos++; else neg++;
    }
    if (pos && neg || mn < safe) {
      for (let kk = k * C; kk <= Math.min(nz - 1, k * C + C); kk++) for (let jj = j * C; jj <= Math.min(ny - 1, j * C + C); jj++)
        for (let ii = i * C; ii <= Math.min(nx - 1, i * C + C); ii++) exact[ii + nx * (jj + ny * kk)] = 1;
    }
  }
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const n = i + nx * (j + ny * k);
    if (exact[n]) { val[n] = f(lo[0] + i * cell, lo[1] + j * cell, lo[2] + k * cell); continue; }
    // far from the surface: the coarse grid's sign is all that matters
    const ci = Math.min(Math.round(i / C), cx - 1), cj = Math.min(Math.round(j / C), cy - 1), ck = Math.min(Math.round(k / C), cz - 1);
    val[n] = coarse[ci + cx * (cj + cy * ck)];
  }
  // a vertex in every cell the surface passes through, at the mean of its edges' crossings
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const vid = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const P = [], corner = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      const v = val[(i + (c & 1)) + nx * ((j + ((c >> 1) & 1)) + ny * (k + (c >> 2)))];
      corner[c] = v; if (v < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, m = 0;
    for (const [a, b] of EDGES) {
      const va = corner[a], vb = corner[b];
      if ((va < 0) === (vb < 0)) continue;
      const u = va / (va - vb);
      sx += (a & 1) + (((b & 1) - (a & 1)) * u); sy += ((a >> 1) & 1) + ((((b >> 1) & 1) - ((a >> 1) & 1)) * u); sz += (a >> 2) + (((b >> 2) - (a >> 2)) * u);
      m++;
    }
    vid[i + (nx - 1) * (j + (ny - 1) * k)] = P.length / 3;
    P.push(lo[0] + (i + sx / m) * cell, lo[1] + (j + sy / m) * cell, lo[2] + (k + sz / m) * cell);
  }
  // a quad across every grid edge the surface crosses, joining the four cells round it
  const I = [];
  const V = (i, j, k) => vid[i + (nx - 1) * (j + (ny - 1) * k)];
  // The four cells come in order round the edge; `flip` reverses them so the quad faces out of the
  // solid (the grid says which way that is: judging it from the vertices goes wrong on quads seen
  // edge-on, and each wrong one is a hole the ink shows through).
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) [b, d] = [d, b];
    const dac = (P[a * 3] - P[c * 3]) ** 2 + (P[a * 3 + 1] - P[c * 3 + 1]) ** 2 + (P[a * 3 + 2] - P[c * 3 + 2]) ** 2;
    const dbd = (P[b * 3] - P[d * 3]) ** 2 + (P[b * 3 + 1] - P[d * 3 + 1]) ** 2 + (P[b * 3 + 2] - P[d * 3 + 2]) ** 2;
    if (dac <= dbd) I.push(a, b, c, a, c, d); else I.push(a, b, d, b, c, d);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v0 = val[i + nx * (j + ny * k)], in0 = v0 < 0;
    if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && in0 !== (val[i + 1 + nx * (j + ny * k)] < 0))
      quad(V(i, j - 1, k - 1), V(i, j, k - 1), V(i, j, k), V(i, j - 1, k), !in0);          // in this order it faces +x
    if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && in0 !== (val[i + nx * (j + 1 + ny * k)] < 0))
      quad(V(i - 1, j, k - 1), V(i, j, k - 1), V(i, j, k), V(i - 1, j, k), in0);           // -y
    if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && in0 !== (val[i + nx * (j + ny * (k + 1))] < 0))
      quad(V(i - 1, j - 1, k), V(i, j - 1, k), V(i, j, k), V(i - 1, j, k), !in0);          // +z
  }
  // Even the triangles out (each vertex towards the middle of its neighbours) and pull them back onto
  // the surface, a few times over: surface nets leave slivers, and the ink, pushed out along the
  // normals, folds over slivers and shows through the skin as specks.
  const positions = new Float32Array(P), normals = new Float32Array(P.length), h = cell * 0.35, nv = P.length / 3;
  const sum = new Float32Array(P.length), cnt = new Uint16Array(nv);
  const project = (v, steps, keep) => {
    let x = positions[v], y = positions[v + 1], z = positions[v + 2], gx = 0, gy = 0, gz = 1;
    for (let it = 0; it <= steps; it++) {
      const d = f(x, y, z);
      gx = f(x + h, y, z) - f(x - h, y, z); gy = f(x, y + h, z) - f(x, y - h, z); gz = f(x, y, z + h) - f(x, y, z - h);
      const g = Math.hypot(gx, gy, gz) || 1;
      gx /= g; gy /= g; gz /= g;
      if (it < steps) { const step = Math.max(-cell * 0.7, Math.min(cell * 0.7, d)); x -= gx * step; y -= gy * step; z -= gz * step; }
    }
    positions[v] = x; positions[v + 1] = y; positions[v + 2] = z;
    if (keep) { normals[v] = gx; normals[v + 1] = gy; normals[v + 2] = gz; }
  };
  for (let v = 0; v < P.length; v += 3) project(v, 2, false);
  for (let pass = 0; pass < 3; pass++) {
    sum.fill(0); cnt.fill(0);
    for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) {
      const a = I[t + e], b = I[t + (e + 1) % 3];
      sum[a * 3] += positions[b * 3]; sum[a * 3 + 1] += positions[b * 3 + 1]; sum[a * 3 + 2] += positions[b * 3 + 2]; cnt[a]++;
      sum[b * 3] += positions[a * 3]; sum[b * 3 + 1] += positions[a * 3 + 1]; sum[b * 3 + 2] += positions[a * 3 + 2]; cnt[b]++;
    }
    for (let v = 0; v < nv; v++) if (cnt[v]) for (let a = 0; a < 3; a++) positions[v * 3 + a] = positions[v * 3 + a] * 0.4 + (sum[v * 3 + a] / cnt[v]) * 0.6;
    for (let v = 0; v < P.length; v += 3) project(v, pass === 2 ? 2 : 1, pass === 2);
  }
  return { positions, normals, indices: I };
}

// Skin weights: each vertex is bound to the bones whose shapes are nearest it. A bone's weight falls
// from 1 (its shapes are the nearest) to 0 (they are `soft` farther away than the nearest), squared,
// so skin blends between two bones only round the joint between them. Four bones at most.
function weights(positions, sk, shapes, soft) {
  const fs = shapes.filter(L => L.weight !== false).map(L => ({ f: compileLeaf(L, sk), bone: sk.index[L.bone2 ?? L.bone], soft: L.soft ?? soft }));
  const n = positions.length / 3, skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4);
  const best = new Map();
  for (let v = 0; v < n; v++) {
    const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
    best.clear();
    let dmin = Infinity;
    for (const L of fs) {
      const d = L.f(x, y, z);
      if (!(best.get(L.bone)?.d <= d)) best.set(L.bone, { d, soft: L.soft });
      if (d < dmin) dmin = d;
    }
    const ws = [...best].map(([b, { d, soft: s }]) => [b, Math.max(0, 1 - (d - dmin) / s) ** 2]).filter(w => w[1] > 1e-3)
      .sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = ws.reduce((a, w) => a + w[1], 0);
    ws.forEach(([b, w], i) => { skinIndex[v * 4 + i] = b; skinWeight[v * 4 + i] = w / sum; });
  }
  return { skinIndex, skinWeight };
}

// ---------- skinned meshes ----------
// The ink for a skinned mesh: toon3d's inkMaterial, bending with the bones.
const PER_PX = (2 * Math.tan((18 * Math.PI) / 360)) / 1080;
const inks = new Map();
export function skinnedInk(width = 2.6, color = INK) {
  const key = `${width}|${color}`;
  if (inks.has(key)) return inks.get(key);
  const m = new THREE.ShaderMaterial({
    uniforms: { ink: { value: new THREE.Color(color) }, push: { value: width * INK3D * PER_PX } },
    vertexShader: /* glsl */ `
      #include <common>
      #include <skinning_pars_vertex>
      uniform float push;
      void main() {
        #include <beginnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
        vec3 n = normalize(normalMatrix * objectNormal);
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

// Mesh a shape and bind it to the skeleton. Options: cell (the grid's size, in model units: smaller
// is finer), pad (room round the shape's box), soft (how far skin blends between bones), ink (px, 0
// for none), colors(x, y, z, nx, ny, nz) => [r, g, b] for vertex colours (the material needs
// vertexColors: true), uvs(x, y, z, nx, ny, nz) => [u, v] for a texture (a painted face), bounds
// [[lo], [hi]] to mesh only part of space. The mesh goes into the
// skeleton's group; it is left out of frustum culling, as a posed body can reach beyond its rest box.
// `key` names the mesh, so another skeleton built the same way (a second copy of a character) shares
// it instead of meshing it again.
const meshed = new Map();
export function skinned(sk, shape, material, { cell = 2, pad, soft = 6, ink = 2.6, colors, uvs, bounds, shadow = true, key } = {}) {
  const geo = key && meshed.get(key) || meshField(sk, shape, { cell, pad, soft, colors, uvs, bounds });
  if (key) meshed.set(key, geo);
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.castShadow = shadow;
  mesh.frustumCulled = false;
  sk.group.add(mesh);
  mesh.bind(sk.skeleton, sk.bind);
  if (ink) {
    const o = new THREE.SkinnedMesh(geo, skinnedInk(ink));
    o.frustumCulled = false; o.raycast = () => {};
    mesh.add(o);
    o.bind(sk.skeleton, sk.bind);
  }
  return mesh;
}

// A shape's distance function, in model space at the rest pose: to find its surface (to sit an eye
// or a brow on it), f(x, y, z) < 0 inside.
export const field = (sk, shape) => compile(shape, sk);

function meshField(sk, shape, { cell, pad, soft, colors, uvs, bounds }) {
  const f = compile(shape, sk);
  const all = leaves(shape);
  let lo, hi;
  if (bounds) [lo, hi] = bounds;
  else {
    // the shapes' rest boxes, roughly, from their frames and sizes
    lo = [Infinity, Infinity, Infinity]; hi = [-Infinity, -Infinity, -Infinity];
    const v = new THREE.Vector3();
    for (const L of all) {
      const m = new THREE.Matrix4().copy(sk.rest(L.bone)).multiply(new THREE.Matrix4().compose(new THREE.Vector3(...(L.at ?? [0, 0, 0])),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...(L.rot ?? [0, 0, 0]), L.order ?? 'XYZ')), new THREE.Vector3(1, 1, 1)));
      const r = L.kind === 'cone' ? Math.max(L.r1, L.r2) : L.kind === 'ell' ? Math.max(...L.r) : L.kind === 'ring' ? L.R + L.r : Math.max(...L.h);
      const s = Math.max(...(L.scale ?? [1, 1, 1]));
      for (const y of L.kind === 'cone' ? [0, -L.len] : [0]) {
        v.set(0, y, 0).applyMatrix4(m);
        for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], v.getComponent(a) - r * s); hi[a] = Math.max(hi[a], v.getComponent(a) + r * s); }
      }
    }
    const p = pad ?? cell * 3;
    lo = lo.map(x => x - p); hi = hi.map(x => x + p);
  }
  const { positions, normals, indices } = surfaceNets(f, lo, hi, cell);
  const { skinIndex, skinWeight } = weights(positions, sk, all, soft);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  if (colors) {
    const c = new Float32Array(positions.length);
    for (let v = 0; v < positions.length; v += 3) c.set(colors(positions[v], positions[v + 1], positions[v + 2], normals[v], normals[v + 1], normals[v + 2]), v);
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  if (uvs) {
    const u = new Float32Array((positions.length / 3) * 2);
    for (let v = 0, i = 0; v < positions.length; v += 3, i += 2) u.set(uvs(positions[v], positions[v + 1], positions[v + 2], normals[v], normals[v + 1], normals[v + 2]), i);
    geo.setAttribute('uv', new THREE.BufferAttribute(u, 2));
  }
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}
