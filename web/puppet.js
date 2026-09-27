// Puppets: a character as a tree of parts, each drawn in its own space around its pivot, and posed
// by rotating, moving and scaling the parts.
//
// A pose is a flat object of numbers: 'head.r' (radians), 'armL.x', 'body.sy', 'mouth.open', ...
// Flat poses blend, key, spring and add together simply, and parts read whatever keys they need.
// Bones hang downwards (+y) at rotation 0, so an arm at rest points at the floor.
import { E, ik, inv, lerp } from './core.js';

export class Puppet {
  // parts: [{ name, parent, at: [x, y] (the pivot, in the parent's space), z (draw order), len
  // (a bone's length, for IK), draw(ctx, pose, part) }]. One part has no parent: the root.
  constructor(parts) {
    this.parts = parts.map((p, i) => ({ z: 0, at: [0, 0], ...p, order: i }));
    this.by = Object.fromEntries(this.parts.map(p => [p.name, p]));
    this.drawOrder = [...this.parts].sort((a, b) => a.z - b.z || a.order - b.order);
  }

  // Every part's transform, in the puppet's own space.
  matrices(pose) {
    const M = {};
    const of = p => {
      if (M[p.name]) return M[p.name];
      const base = p.parent ? of(this.by[p.parent]) : new DOMMatrix();
      const g = k => pose[`${p.name}.${k}`];
      const s = g('s') ?? 1;
      M[p.name] = base.translate(p.at[0] + (g('x') ?? 0), p.at[1] + (g('y') ?? 0))
        .rotate(((g('r') ?? 0) * 180) / Math.PI)
        .scale(s * (g('sx') ?? 1), s * (g('sy') ?? 1));
      return M[p.name];
    };
    this.parts.forEach(of);
    return M;
  }

  // Draw the puppet with its origin at (x, y). `flip` mirrors it to face the other way.
  draw(ctx, pose, { x = 0, y = 0, scale = 1, flip = false, hide = [] } = {}) {
    const M = this.matrices(pose);
    const base = ctx.getTransform().translate(x, y).scale(flip ? -scale : scale, scale);
    for (const p of this.drawOrder) {
      if (!p.draw || hide.includes(p.name)) continue;
      ctx.save();
      ctx.setTransform(base.multiply(M[p.name]));
      p.draw(ctx, pose, p);
      ctx.restore();
    }
  }

  // A point given in a part's space ([0, 0] is its pivot), in the puppet's space.
  where(part, pose, [x, y] = [0, 0]) {
    const m = this.matrices(pose)[part], q = m.transformPoint(new DOMPoint(x, y));
    return [q.x, q.y];
  }

  // A part's rotation in the puppet's space.
  angle(part, pose) { const m = this.matrices(pose)[part]; return Math.atan2(m.b, m.a); }

  // Rotate a two-bone limb (upper, lower) so the end of `lower` reaches target, in puppet space.
  // bend +1 or -1 picks which way the elbow or knee points. Returns the pose with the angles set.
  reach(pose, upper, lower, target, bend = 1) {
    const U = this.by[upper], L = this.by[lower];
    const p = { ...pose, [`${upper}.r`]: 0, [`${lower}.r`]: 0 };
    const [sx, sy] = this.where(upper, p);
    const parent = U.parent ? this.angle(U.parent, p) : 0;
    const { ex, ey, hx, hy } = ik(sx, sy, target[0], target[1], U.len, L.len, bend);
    const a1 = Math.atan2(ey - sy, ex - sx) - Math.PI / 2 - parent;
    const a2 = Math.atan2(hy - ey, hx - ex) - Math.PI / 2 - parent - a1;
    return { ...pose, [`${upper}.r`]: a1, [`${lower}.r`]: a2 };
  }
}

// ---------- poses ----------

// Mix two poses: keys missing from one count as 0 (or 1 for scales).
export function blend(a, b, k) {
  const out = { ...a };
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const rest = /\.(s|sx|sy)$/.test(key) ? 1 : 0;
    out[key] = lerp(a[key] ?? rest, b[key] ?? rest, k);
  }
  return out;
}

// Add offsets onto a pose: for layering breathing, sways and gestures over a base.
export function add(pose, ...layers) {
  const out = { ...pose };
  for (const l of layers) for (const [k, v] of Object.entries(l)) out[k] = /\.(s|sx|sy)$/.test(k) ? (out[k] ?? 1) * v : (out[k] ?? 0) + v;
  return out;
}

// Choreography: each move eases the keys it names from wherever they were to its values, over its
// span, then they hold. Moves may overlap, and other keys keep whatever earlier moves left them at.
//   choreo(t, rest, [{ t: 2.1, dur: 0.5, pose: { 'armR.r': -1.2 }, ease: E.back }, ...])
export function choreo(t, rest, moves) {
  const s = { ...rest };
  for (const m of moves) {
    if (t <= m.t) break;
    const k = (m.ease || E.io)(inv(m.t, m.t + (m.dur ?? 0.5), t));
    for (const [key, to] of Object.entries(m.pose)) {
      const from = s[key] ?? (/\.(s|sx|sy)$/.test(key) ? 1 : 0);
      s[key] = lerp(from, to, k);
    }
  }
  return s;
}

// Moves for choreo, sorted, from a list that may be built out of order.
export const moves = list => [...list].sort((a, b) => a.t - b.t);
