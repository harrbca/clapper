// The cut-out kit: characters rigged the way TV cut-out animation rigs them (the Toon Boom Harmony
// shows). Flat colour and one even ink line. Drawings swapped per angle (front, 3/4, profile, 3/4
// back, back) instead of morphed. A library of drawn hands, a mouth chart picked by the sound being
// said, and eyes, lids and brows as layers of their own. characters/dex.js is made from it.
//
// A cut-out character is defined as data with defineCutout (see character.js for the format and its
// checks): its bones, pieces (angleSet, handPiece, mouthChart, or plain drawings), and tags that say
// which bones are its root, chest and head (look) and which chains are arms and legs, on which side
// and bending which way. The kit finds everything through the tags, so it has no bone names in it.
//
// Poses are flat objects of numbers, as for any Puppet. Keys ending in '.shape' (a hand, a mouth)
// swap drawings: choreo doesn't blend them, they change halfway through the move that keys them.
import { clamp, E, onTwos } from './core.js';
import { defineCharacter } from './character.js';
import { add, choreo } from './puppet.js';
import { blink, breath, glance, sway } from './life.js';
import { loudness, viseme } from './lipsync.js';
import { springs } from './spring.js';

export const INK = '#1D1A24', LW = 3.4;
export const v = (pose, k, d = 0) => pose[k] ?? d;
export const P = s => new Path2D(s);

// ---------- ink ----------
export function ink(ctx, path, fill, lw = LW) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(path); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(path); }
}
export function stroke(ctx, path, lw = LW, col = INK) {
  ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(typeof path === 'string' ? P(path) : path);
}
export function line(ctx, pts, lw = LW, col = INK) {
  const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  stroke(ctx, p, lw, col);
}
export function within(ctx, path, fn) { ctx.save(); ctx.clip(path); fn(); ctx.restore(); }
export function at(ctx, x, y, sx, fn) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1); fn(); ctx.restore(); }

// ---------- angles ----------
// A character is drawn from set angles, as a cut-out rig is: 0 front, 1 three-quarter, 2 profile,
// 3 three-quarter from behind, 4 back; negative faces the screen's left, with the same drawings
// mirrored. 'body.view' turns the whole character; 'head.view' turns the head on from there, so the
// head can lead a turn or look aside. They key like any other number, and the drawing swaps as the
// value passes each half step, through every angle between: that is how cut-out turns animate.
export const ANGLES = ['front', '3/4', 'profile', '3/4 back', 'back'];
export function angle(x) { const n = ((Math.round(x) + 4) % 8 + 8) % 8 - 4; return n === -4 ? 4 : n; }
export const bodyAngle = pose => angle(v(pose, 'body.view'));
export const headAngle = pose => angle(v(pose, 'body.view') + v(pose, 'head.view'));

// The angle keys: -4 to 4, their sign changed when a clip is played on the other side.
const VIEW = { range: [-4, 4], flip: 'negate' };

// A swap set of drawings by angle, as a piece: angleSet('body', { 0: front, 1: threeQuarter, ...
// 4: back }) draws the one for the body's angle ('head' for the head's: body.view plus head.view),
// mirrored, and given the mirrored pose, to face left. Each drawing is fn(ctx, pose, n). Every angle
// needs a drawing unless `fallback` names one to stand in ({ 3: 2 }: the profile for 3/4 back).
// around(ctx, n, draw) wraps the drawing (a scale, a turn) and calls draw() inside.
export function angleSet(of, drawings, { fallback = {}, around } = {}) {
  const angleOf = of === 'head' ? headAngle : bodyAngle;
  const drawAt = (ctx, n, pose, character) => {
    const a = Math.abs(n);
    ctx.save();
    if (n < 0) ctx.scale(-1, 1);
    (drawings[a] ?? drawings[fallback[a]])(ctx, n < 0 ? character.mirrored(pose) : pose, n);
    ctx.restore();
  };
  return {
    kind: 'angle', of, variants: drawings, required: [0, 1, 2, 3, 4], fallback,
    describe: a => `angle ${a} (${ANGLES[a]})`,
    keys: of === 'head' ? { 'body.view': VIEW, 'head.view': VIEW } : { 'body.view': VIEW },
    draw(ctx, pose, character) {
      const n = angleOf(pose);
      if (around) around(ctx, n, () => drawAt(ctx, n, pose, character));
      else drawAt(ctx, n, pose, character);
    },
  };
}

// Where a chain goes in the drawing order as the body turns, by its kind: near (the side towards us),
// far, and facing us (front) or away (back); `end` is added for its last bone (a hand, a foot). A
// chain can give its own `layers`; chains of other kinds keep their bones' own z.
const LAYERS = { arm: { near: 5.5, far: -0.6, front: 5.5, back: -0.6, end: 0.5 }, leg: { near: 0.3, far: 0, front: 0, back: 0, end: 0.1 } };

// Where the limbs hang at angle n. Each chain with a side comes round towards the middle (L is the
// screen's left when facing us, so it is the near side facing right) by as far as its first bone's
// pivot is from the middle, and goes in front of the body or behind it (and behind the legs).
// tags.turn.offsets adds the character's own offsets per angle ({ 2: { 'neck.x': 12 } }), mirrored
// for negative angles. Offsets are added to the pose; draw orders are set where not given.
export function turnRig(pose, n, character) {
  const th = (n * Math.PI) / 4, c = Math.cos(th), s = Math.sin(th), back = c < -0.1;
  const sided = character.chainsOf().filter(([, ch]) => ch.side);
  const shift = {};
  for (const [, ch] of sided) shift[`${ch.bones[0]}.x`] = (ch.side === 'L' ? 1 : -1) * Math.abs(character.by[ch.bones[0]].at[0]) * (1 - c);
  const p = add(pose, shift);
  for (const [k0, val] of Object.entries(character.tags.turn?.offsets?.[Math.abs(n)] || {})) {
    const k = n < 0 ? character.swapSide(k0) : k0;
    p[k] = /\.z$/.test(k) ? val : v(p, k) + (n < 0 && /\.(x|r)$/.test(k) ? -val : val);
  }
  for (const [, ch] of sided) {
    const L = ch.layers || LAYERS[ch.kind];
    if (!L) continue;
    const near = ch.side === 'L' ? s > 0.1 : s < -0.1, far = ch.side === 'L' ? s < -0.1 : s > 0.1;
    const first = ch.bones[0], last = ch.bones[ch.bones.length - 1];
    p[`${first}.z`] ??= near ? L.near : far ? L.far : back ? L.back : L.front;
    p[`${last}.z`] ??= p[`${first}.z`] + L.end;
  }
  return p;
}

// ---------- limbs ----------
// A noodle limb, as cut-out rigs bend them with a deformer: from the pivot down (+y) `a` long to the
// elbow or knee, then `b` more turned by `bend`, one even tube with a rounded bend and no seam. w2
// narrows the lower half.
export function noodle(ctx, a, b, bend, w, col, { w2 = w, round = 0.42 } = {}) {
  const wx = -Math.sin(bend) * b, wy = a + Math.cos(bend) * b;
  const r = round * Math.min(a, b) * Math.min(1, Math.abs(bend) * 1.5 + 0.15);
  const k = r / b, mid = [wx * k, a + (wy - a) * k];
  const upper = new Path2D(), lower = new Path2D();
  upper.moveTo(0, 0); upper.lineTo(0, a - r); upper.quadraticCurveTo(0, a, ...mid);
  lower.moveTo(...mid); lower.lineTo(wx, wy);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + LW * 2; ctx.stroke(upper);
  ctx.lineWidth = w2 + LW * 2; ctx.stroke(lower);
  ctx.strokeStyle = col;
  ctx.lineWidth = w; ctx.stroke(upper);
  ctx.lineWidth = w2; ctx.stroke(lower);
  return [wx, wy];
}

// A short sleeve over the top of an arm: `len` down the upper arm, `w` wide, rounded over the
// shoulder.
export function sleeve(ctx, len, w, col) {
  const h = w / 2, p = new Path2D(`M ${-h} ${len} L ${-h} ${h * 0.4} A ${h} ${h} 0 0 1 ${h} ${h * 0.4} L ${h} ${len} Z`);
  ink(ctx, p, col);
}

// ---------- contact ----------
// Which way IK bends a chain's middle joint: the chain's tag ('forward', a knee; 'back', an elbow)
// turned into a side of the reach for the way the body faces. An explicit `bend` (+1 or -1) wins.
function bendOf(character, name, ch, pose, bend) {
  if (bend !== undefined) return bend;
  if (!ch.bend) throw new Error(`${character.name}: chain ${name} doesn't say which way it bends (bend: 'forward' or 'back'), so IK can't choose.`);
  return (ch.bend === 'back' ? 1 : -1) * (bodyAngle(pose) < 0 ? -1 : 1);
}

// Plant a foot: a leg chain (hip, knee, foot) reaches its ankle to `target` (in the character's
// space) by IK, and the foot turns to `tilt` from level whatever the leg does, for crouches,
// landings and kneels. Run it on a finished pose (after the pose function, which moves the hips
// round for the angle).
export function plant(character, pose, chain, target, { bend, tilt = 0, quiet } = {}) {
  const ch = character.chain(chain, 'plant');
  if (ch.bones.length < 3) throw new Error(`${character.name}: plant needs a chain of three bones (hip, knee, foot), and ${chain} has ${ch.bones.length}.`);
  const [upper, lower, foot] = ch.bones;
  const p = character.reach(pose, upper, lower, target, bendOf(character, chain, ch, pose, bend), { quiet });
  p[`${foot}.r`] = tilt - character.angle(lower, p);
  return p;
}

// Reach a chain's end (a hand, at the end of its forearm) to `target` by IK. quiet: true, for both,
// when the contact is being let go of and may go out of reach.
export function reachChain(character, pose, chain, target, { bend, quiet } = {}) {
  const ch = character.chain(chain, 'reachChain');
  if (ch.bones.length < 2) throw new Error(`${character.name}: reachChain needs a chain of at least two bones, and ${chain} has ${ch.bones.length}.`);
  return character.reach(pose, ch.bones[0], ch.bones[1], target, bendOf(character, chain, ch, pose, bend), { quiet });
}

// Mix the keys of two poses by k (for easing IK in and out over animation).
export function mixKeys(a, b, k, keys) {
  const out = { ...a };
  for (const key of keys) out[key] = v(a, key) + (v(b, key) - v(a, key)) * k;
  return out;
}

// ---------- hands ----------
// The hand library: drawings, swapped, not bent. Four fingers (three and a thumb), from the wrist
// along +y, the thumb on the inside (towards the body when the arms hang). A hand's shape is a pose
// key, '<hand>.shape', set to one of these: { 'handR.shape': HAND.point }. '<hand>.flip': 1 shows it
// from the other side, the thumb outside (a thumbs up on an arm held across the body).
export const HANDS = ['relaxed', 'open', 'spread', 'palm', 'point', 'fist', 'thumb', 'grip', 'ok', 'peace'];
export const HAND = Object.fromEntries(HANDS.map((n, i) => [n, i]));
const PALM = [-20, 0, 40, 38, 16];
// fingers: [x, y, length, width, angle] (angle + turns the tip towards the thumb); curled fingers are
// short stubs. `lines` are extra ink (knuckles, a crease); `ring` a circle of finger and thumb.
const HAND_DRAWINGS = {
  relaxed: { fingers: [[-12, 34, 13, 13, 0.18], [0, 36, 15, 13, 0.02], [12, 34, 12, 13, -0.12]], thumb: [-17, 16, 14, 13, 0.7] },
  open: { fingers: [[-13, 34, 21, 13, 0.22], [0, 36, 23, 13, 0], [13, 34, 20, 13, -0.22]], thumb: [-18, 14, 18, 13, 1.05] },
  spread: { fingers: [[-13, 32, 22, 13, 0.5], [0, 36, 24, 13, 0], [13, 32, 21, 13, -0.5]], thumb: [-18, 12, 20, 13, 1.4] },
  palm: { fingers: [[-12, 34, 22, 13, 0.06], [0, 36, 24, 13, 0], [12, 34, 21, 13, -0.06]], thumb: [-18, 14, 17, 13, 0.9], lines: ['M -10 20 Q 0 28 12 16'] },
  point: { fingers: [[-11, 34, 27, 13, 0.03], [2, 38, 2, 13, 0], [12, 36, 1, 13, 0]], thumb: [-12, 26, 13, 12, -1.1], lines: ['M -4 38 L -4 44', 'M 7 38 L 7 44'] },
  fist: { palm: [-21, 0, 42, 42, 17], fingers: [], thumb: [-15, 20, 20, 12, -1.35], lines: ['M -7 35 L -7 42', 'M 6 35 L 6 42'] },
  thumb: { palm: [-21, 0, 42, 42, 17], fingers: [], thumb: [-17, 14, 22, 13, 1.75], lines: ['M -7 34 L -7 42', 'M 6 34 L 6 42', 'M -13 25 Q 0 29 14 25'] },
  grip: { palm: [-21, 0, 42, 42, 17], fingers: [], thumb: [-15, 10, 19, 12, -1.0], lines: ['M -7 34 L -7 42', 'M 6 34 L 6 42'] },
  ok: { fingers: [[1, 35, 23, 13, -0.06], [13, 33, 21, 13, -0.26]], thumb: [-15, 14, 14, 13, 0.5], ring: [-17, 40, 12] },
  peace: { fingers: [[-8, 34, 25, 13, 0.22], [4, 36, 26, 13, -0.18], [13, 36, 2, 13, 0]], thumb: [-12, 26, 13, 12, -1.1], lines: ['M 9 38 L 9 44'] },
};
function capsule(ctx, [x, y, len, w, r], extra, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(r);
  ctx.lineWidth = w + extra; ctx.strokeStyle = col; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke();
  ctx.restore();
}
// Draw hand `name` (or the shape the pose keys for `key`); side -1 is the left hand, mirrored.
export function hand(ctx, pose, side, key, { skin, size = 1, name } = {}) {
  const d = HAND_DRAWINGS[name ?? HANDS[clamp(Math.round(v(pose, `${key}.shape`)), 0, HANDS.length - 1)]];
  const [px, py, pw, ph, pr] = d.palm || PALM;
  const palm = new Path2D(); palm.roundRect(px, py, pw, ph, pr);
  const all = [...d.fingers, d.thumb];
  ctx.save(); ctx.scale(side * size * (v(pose, `${key}.flip`) > 0.5 ? -1 : 1), size);
  // the silhouette in ink first, then the skin over it, so fingers and palm join without seams
  for (const f of all) capsule(ctx, f, LW * 2, INK);
  ctx.lineWidth = LW * 2; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(palm);
  if (d.ring) { ctx.beginPath(); ctx.arc(d.ring[0], d.ring[1], d.ring[2], 0, Math.PI * 2); ctx.lineWidth = 9 + LW * 2; ctx.stroke(); }
  ctx.fillStyle = skin; ctx.fill(palm);
  for (const f of all) capsule(ctx, f, 0, skin);
  if (d.ring) { ctx.beginPath(); ctx.arc(d.ring[0], d.ring[1], d.ring[2], 0, Math.PI * 2); ctx.lineWidth = 9; ctx.strokeStyle = skin; ctx.stroke(); }
  // where fingers overlap, a line between them, from the palm to the tip
  d.fingers.forEach((f, i) => {
    if (!i || f[2] < 8) return;
    const [x, y, len, w, r] = f;
    ctx.save(); ctx.translate(x, y); ctx.rotate(r);
    line(ctx, [[-w / 2, 2], [-w / 2, len - w * 0.3]], LW * 0.75);
    ctx.restore();
  });
  for (const l of d.lines || []) stroke(ctx, l, LW * 0.75);
  ctx.restore();
}

// A hand from the library as a piece, for its bone: '<bone>.shape' picks the drawing and
// '<bone>.flip' shows the other side. What the draw call's `held[bone]` draws goes in the hand,
// under the fingers, so a 'grip' closes over a handle: dex.draw(ctx, pose, { held: { handL: fn } }).
export function handPiece(bone, side, opts) {
  return {
    kind: 'shape', variants: { ...HANDS }, required: HANDS.map((_, i) => i), describe: i => `hand ${i} (${HANDS[i]})`,
    keys: { [`${bone}.shape`]: { shape: HANDS }, [`${bone}.flip`]: [0, 1] },
    draw(ctx, pose, character, drawOpts) { drawOpts?.held?.[bone]?.(ctx, pose); hand(ctx, pose, side, bone, opts); },
  };
}

// ---------- eyes and brows ----------
// A big round eye with a dot pupil. Lids are skin inside the eye's outline: they drop (lids.drop,
// or lidL.drop for one), slant (lids.slant: + angry, - sad), and the lower lid rises with a squint.
// eyes.x / eyes.y aim the pupil (-1..1), eyes.pupil sizes it, eyes.open widens the eye. Nearly
// shut, it swaps to the closed drawing: the lid over the eye with a lash line, or in a squint the
// happy arcs of a laugh. `sx` narrows it for the far eye or a
// profile, and `look` pushes the pupil the way the face points.
export function eye(ctx, pose, side, { rx = 26, ry = 29, pupil = 5.5, lid, sx = 1, look = 0, lw = LW } = {}) {
  const S = side < 0 ? 'L' : 'R';
  const open = clamp(v(pose, 'eyes.open', 1) * v(pose, `eye${S}.open`, 1), 0, 1.4);
  const cover = clamp(Math.max(v(pose, 'eyes.blink'), v(pose, 'lids.drop') + v(pose, `lid${S}.drop`), 1 - Math.min(open, 1)), 0, 1);
  const slant = clamp(v(pose, 'lids.slant') + v(pose, `lid${S}.slant`), -1, 1);
  const squint = clamp(v(pose, 'eyes.squint') + v(pose, `eye${S}.squint`));
  const big = Math.max(1, open), RX = rx * sx * (1 + (big - 1) * 0.3), RY = ry * big;
  const inner = -side * RX;                                  // the corner towards the nose
  const white = new Path2D(); white.ellipse(0, 0, RX, RY, 0, 0, Math.PI * 2);
  if (cover > 0.86) {                                        // shut: happy arcs in a squint, else a lid over the eye
    if (squint > 0.5) { line(ctx, [[inner * 1.02, RY * 0.1], [0, -RY * 0.3], [-inner * 1.02, RY * 0.1]], lw * 1.1); return; }
    ink(ctx, white, lid, lw);
    stroke(ctx, P(`M ${inner * 0.95} ${RY * 0.12} Q 0 ${RY * 0.5} ${-inner * 0.95} ${RY * 0.12}`), lw);
    return;
  }
  ctx.fillStyle = '#FFFFFF'; ctx.fill(white);
  within(ctx, white, () => {
    const gx = clamp(v(pose, 'eyes.x') + look, -1.3, 1.3) * (RX - pupil * 1.4) * 0.8;
    const gy = clamp(v(pose, 'eyes.y'), -1, 1) * (RY - pupil * 1.4) * 0.7;
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(gx, gy, pupil * v(pose, 'eyes.pupil', 1), 0, Math.PI * 2); ctx.fill();
    // the upper lid: its edge a line from the inner corner to the outer, dropped and slanted
    const lidY = -RY + 2 * RY * cover, tilt = slant * RY * 0.55 * (1 - cover * 0.5);
    const yIn = lidY + tilt, yOut = lidY - tilt * 0.45;
    if (cover > 0.02 || Math.abs(slant) > 0.05) {
      const edge = new Path2D(); edge.moveTo(inner * 1.3, yIn); edge.lineTo(-inner * 1.3, yOut);
      const lidP = new Path2D(edge); lidP.lineTo(-inner * 1.3, -RY - 6); lidP.lineTo(inner * 1.3, -RY - 6); lidP.closePath();
      ctx.fillStyle = lid; ctx.fill(lidP); stroke(ctx, edge, lw * 0.9);
    }
    if (squint > 0.02) {                                     // the lower lid, rising
      const y = RY - 2 * RY * squint * 0.42;
      const low = new Path2D(); low.moveTo(inner * 1.3, y + 6); low.quadraticCurveTo(0, y - RY * 0.3 * squint, -inner * 1.3, y + 6);
      const lowP = new Path2D(low); lowP.lineTo(-inner * 1.3, RY + 6); lowP.lineTo(inner * 1.3, RY + 6); lowP.closePath();
      ctx.fillStyle = lid; ctx.fill(lowP); stroke(ctx, low, lw * 0.9);
    }
  });
  stroke(ctx, white, lw);
}

// A brow: brows.up, brows.in (a frown), and each on its own (browL.up, browL.slant: + angry,
// - worried). A plain ink stroke unless it has a colour.
export function brow(ctx, pose, side, { len = 22, w = 5, color, rise = 12, sx = 1 } = {}) {
  const S = side < 0 ? 'L' : 'R';
  const up = (v(pose, 'brows.up') + v(pose, `brow${S}.up`)) * rise;
  const slant = clamp(v(pose, 'brows.in') + v(pose, `brow${S}.slant`), -1.2, 1.2);
  ctx.save(); ctx.translate(0, -up); ctx.scale(sx, 1); ctx.rotate(side * (0.06 - slant * 0.34));
  const path = P(`M ${-len} 3 Q 0 -6 ${len} 3`);
  if (color) { stroke(ctx, path, w + LW * 2); stroke(ctx, path, w, color); } else stroke(ctx, path, w);
  ctx.restore();
}

// ---------- the mouth chart ----------
// One drawing per sound, as a TV mouth chart has, and a few for expressions. The talking mouths are
// lipsync.js's shape names. Sizes are in units of the mouth's half-width: w (width), top and bot (the
// lips at the middle, down +), lift (the corners, up +), teeth and teethBot (how far the teeth show),
// tongue, and line: 1 for a closed mouth, drawn as one stroke.
export const MOUTHS = {
  rest: { line: 1, w: 0.72, sag: 0.1 },
  mbp: { line: 1, w: 0.6, sag: 0.04, press: 1 },
  etc: { w: 0.9, top: -0.14, bot: 0.34, teeth: 0.62, teethBot: 0.36 },
  ai: { w: 1, top: -0.22, bot: 1.05, teeth: 0.2, tongue: 0.34 },
  uh: { w: 0.82, top: -0.14, bot: 0.62, teeth: 0.26, tongue: 0.3 },
  e: { w: 1.08, top: -0.2, bot: 0.46, teeth: 0.42, teethBot: 0.24, lift: 0.1 },
  o: { oval: 1, w: 0.5, top: -0.4, bot: 0.66, tongue: 0.28 },
  u: { oval: 1, w: 0.3, top: -0.22, bot: 0.3, pucker: 1 },
  fv: { w: 0.86, top: -0.16, bot: 0.2, teeth: 1, tuck: 1 },
  l: { w: 0.84, top: -0.18, bot: 0.68, teeth: 0.22, tongue: 0.9, tongueUp: 1 },
  th: { w: 0.84, top: -0.14, bot: 0.34, teeth: 0.46, tongueTip: 1 },
  smile: { line: 1, w: 0.95, sag: 0.24, lift: 0.3 },
  grin: { w: 1.12, top: -0.2, bot: 0.74, teeth: 0.44, lift: 0.34, flat: 1 },
  frown: { line: 1, w: 0.78, sag: -0.14, lift: -0.3 },
  grimace: { w: 1.12, top: -0.22, bot: 0.3, teeth: 1, teethBot: 1, grit: 1, lift: -0.16 },
  shout: { w: 0.98, top: -0.32, bot: 1.25, teeth: 0.18, tongue: 0.36, lift: -0.26 },
  smirk: { line: 1, w: 0.78, sag: 0.04, liftR: 0.36, liftL: -0.04 },
  gasp: { oval: 1, w: 0.62, top: -0.48, bot: 1.0, tongue: 0.3 },
};
export const MOUTH_NAMES = Object.keys(MOUTHS);
export const MOUTH = Object.fromEntries(MOUTH_NAMES.map((n, i) => [n, i]));
// The mouth chart's drawing for each of lipsync's shapes.
const SAYS = { rest: 'rest', mbp: 'mbp', ai: 'ai', e: 'e', uh: 'uh', o: 'o', u: 'u', fv: 'fv', l: 'l', th: 'th', r: 'etc', etc: 'etc', sh: 'etc' };

// How far a mouth drawing drops the jaw, in px for a mouth `w` px to each corner: the face's chin
// comes down with a wide-open mouth.
export const jawDrop = (name, w) => { const m = MOUTHS[name]; return m && !m.line ? Math.max(0, (m.bot - 0.66) * w) : 0; };

// Which mouth drawing a pose shows: the sound being said (mouth.say, set by cutoutPose while talking),
// else the expression's (mouth.shape).
export function mouthName(pose) {
  const say = v(pose, 'mouth.say', -1);
  return MOUTH_NAMES[clamp(Math.round(say >= 0 ? say : v(pose, 'mouth.shape')), 0, MOUTH_NAMES.length - 1)];
}

// Draw mouth `name` at the origin, `w` px to each corner. `smile` (mood.smile) lifts or drops the
// corners of the talking mouths; mouth.cornerL / cornerR lift one side. pal: { mouth, tongue }.
export function mouth(ctx, name, { w = 26, smile = 0, cornerL = 0, cornerR = 0, pal, lw = LW } = {}) {
  const m = MOUTHS[name] || MOUTHS.rest;
  const W = w * m.w, talk = !['smile', 'grin', 'frown', 'grimace', 'shout', 'smirk'].includes(name);
  const lift = (m.lift || 0) + (talk ? smile * 0.22 : 0);
  const yL = -(lift + (m.liftL || 0) + cornerL * 0.3) * w, yR = -(lift + (m.liftR || 0) + cornerR * 0.3) * w;
  if (m.line) {
    const cy = (m.sag || 0) * w + (talk ? -smile * 0.06 * w : 0);
    const c = 2 * cy - (yL + yR) / 2;
    const p = new Path2D(); p.moveTo(-W, yL); p.quadraticCurveTo(0, c, W, yR);
    stroke(ctx, p, lw * (m.press ? 1.5 : 1.15));
    if (m.press) line(ctx, [[-W * 0.4, cy + 7], [W * 0.4, cy + 7]], lw * 0.7);
    for (const [x, y, s] of [[-W, yL, -1], [W, yR, 1]]) if (Math.abs(lift) > 0.2 || m.press || (s > 0 ? m.liftR : 0)) line(ctx, [[x - s * 1, y - 5], [x + s * 3, y + 4]], lw * 0.8);
    return;
  }
  const top = m.top * w, bot = m.bot * w, h = bot - top;
  const shape = new Path2D();
  if (m.oval) shape.ellipse(0, (top + bot) / 2, W, h / 2, 0, 0, Math.PI * 2);
  else {
    const ct = m.flat ? (yL + yR) / 2 : (top - 0.25 * (yL + yR)) / 0.75, cb = (bot - 0.25 * (yL + yR)) / 0.75;
    shape.moveTo(-W, yL);
    shape.bezierCurveTo(-W * 0.45, ct, W * 0.45, ct, W, yR);
    shape.bezierCurveTo(W * 0.95, cb, -W * 0.95, cb, -W, yL);
    shape.closePath();
  }
  ctx.fillStyle = pal.mouth; ctx.fill(shape);
  within(ctx, shape, () => {
    if (m.tongue || m.tongueUp) {
      ctx.fillStyle = pal.tongue; ctx.beginPath();
      if (m.tongueUp) ctx.ellipse(0, top + h * 0.5, W * 0.5, h * 0.42, 0, 0, Math.PI * 2);
      else ctx.ellipse(W * 0.06, bot - h * 0.12, W * 0.64, h * (0.2 + m.tongue * 0.35), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (m.tongueTip) { ctx.fillStyle = pal.tongue; ctx.beginPath(); ctx.ellipse(0, top + h * 0.62, W * 0.42, h * 0.34, 0, 0, Math.PI * 2); ctx.fill(); }
    const lo = Math.min(yL, yR, top) - 12;
    if (m.teeth) {
      const y = top + h * m.teeth * (m.tuck ? 1.1 : 1);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-W - 4, lo, W * 2 + 8, y - lo);
      if (m.teeth < 1 || m.teethBot) line(ctx, [[-W, y], [W, y]], lw * 0.6);
      if (m.grit) for (const x of [-0.55, -0.18, 0.18, 0.55]) line(ctx, [[x * W, top - 4], [x * W, bot + 4]], lw * 0.55);
    }
    if (m.teethBot && !m.grit) {
      const y = bot - h * m.teethBot;
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-W - 4, y, W * 2 + 8, bot - y + 12);
      line(ctx, [[-W, y], [W, y]], lw * 0.6);
    }
  });
  stroke(ctx, shape, lw);
  if (m.tuck) stroke(ctx, P(`M ${-W * 0.8} ${bot + 5} Q 0 ${bot + 13} ${W * 0.8} ${bot + 5}`), lw * 0.8);
  if (m.pucker) for (const s of [-1, 1]) stroke(ctx, P(`M ${s * W * 1.5} ${top - 2} Q ${s * W * 2} ${(top + bot) / 2} ${s * W * 1.5} ${bot + 2}`), lw * 0.7);
}

// The mouth chart as a piece. It has no bone: a head's drawings draw it (with mouth() and
// mouthName()), and declaring it lists its drawings and keys with the character's.
export const mouthChart = () => ({
  kind: 'shape', within: 'head', variants: { ...MOUTH_NAMES }, required: MOUTH_NAMES.map((_, i) => i), describe: i => `mouth ${i} (${MOUTH_NAMES[i]})`,
  keys: { 'mouth.shape': { shape: MOUTH_NAMES }, 'mouth.say': [-1, MOUTH_NAMES.length - 1] },
});

// ---------- expressions ----------
// The neutral face every expression starts from, so moving between expressions resets the keys. The
// same face keys as the toon kit's, plus the expression's mouth drawing.
export const NEUTRAL = {
  'eyes.open': 1, 'eyes.squint': 0, 'eyes.pupil': 1, 'lids.drop': 0, 'lids.slant': 0, 'lidL.drop': 0, 'lidR.drop': 0,
  'lidL.slant': 0, 'lidR.slant': 0, 'brows.up': 0, 'brows.in': 0, 'browL.up': 0, 'browR.up': 0, 'browL.slant': 0, 'browR.slant': 0,
  'mood.smile': 0, 'mouth.cornerL': 0, 'mouth.cornerR': 0, 'mouth.shape': MOUTH.rest,
};
const n = NEUTRAL;
export const EXPR = {
  neutral: n,
  happy: { ...n, 'mood.smile': 0.8, 'eyes.squint': 0.3, 'brows.up': 0.2, 'mouth.shape': MOUTH.smile },
  laugh: { ...n, 'mood.smile': 1, 'eyes.squint': 1, 'eyes.blink': 1, 'brows.up': 0.4, 'mouth.shape': MOUTH.grin },
  surprised: { ...n, 'brows.up': 1, 'eyes.open': 1.2, 'eyes.pupil': 0.7, 'mouth.shape': MOUTH.o },
  shocked: { ...n, 'brows.up': 1.3, 'brows.in': -0.4, 'eyes.open': 1.35, 'eyes.pupil': 0.5, 'mood.smile': -0.4, 'mouth.shape': MOUTH.gasp },
  skeptical: { ...n, 'browL.up': 0.9, 'browR.up': -0.4, 'browR.slant': 0.5, 'lidR.drop': 0.35, 'lidL.drop': 0.06, 'mouth.shape': MOUTH.smirk, 'mouth.cornerR': -0.4, 'mouth.cornerL': 0.2 },
  smug: { ...n, 'lids.drop': 0.4, 'browL.up': 0.5, 'browR.up': 0.1, 'mood.smile': 0.4, 'mouth.shape': MOUTH.smirk },
  angry: { ...n, 'brows.in': 1, 'lids.slant': 0.8, 'lids.drop': 0.12, 'eyes.pupil': 0.8, 'mood.smile': -0.6, 'mouth.shape': MOUTH.grimace },
  yelling: { ...n, 'brows.in': 1.1, 'lids.slant': 0.7, 'eyes.open': 1.1, 'eyes.pupil': 0.6, 'mood.smile': -0.6, 'mouth.shape': MOUTH.shout },
  sad: { ...n, 'brows.in': -0.9, 'brows.up': 0.2, 'lids.slant': -0.7, 'lids.drop': 0.3, 'mood.smile': -0.5, 'eyes.y': 0.4, 'mouth.shape': MOUTH.frown },
  worried: { ...n, 'brows.in': -0.8, 'brows.up': 0.5, 'eyes.open': 1.1, 'mood.smile': -0.25, 'eyes.pupil': 0.8, 'mouth.shape': MOUTH.grimace },
  deadpan: { ...n, 'lids.drop': 0.5, 'brows.up': -0.2 },
  grumpy: { ...n, 'brows.in': 0.55, 'lids.drop': 0.3, 'mood.smile': -0.4, 'mouth.shape': MOUTH.frown },
  delighted: { ...n, 'mood.smile': 1, 'eyes.open': 1.15, 'brows.up': 0.7, 'mouth.shape': MOUTH.grin },
};

// ---------- bringing a character to life ----------
// Joints on springs: lighter than the toon kit's, as cut-out shows move in eases and holds. Arms
// spring bone by bone, the shoulder leading and the hand trailing, and so does the head (tags.look).
// A chain can give its own `springs`.
const FEEL = { arm: { stiffness: 260, damping: 22 }, fore: { stiffness: 200, damping: 17 }, hand: { stiffness: 170, damping: 15 }, head: { stiffness: 200, damping: 19 } };
const SPRING_FEEL = { arm: [FEEL.arm, FEEL.fore, FEEL.hand] };
export function jointsOf(character) {
  const out = {};
  for (const [, ch] of character.chainsOf()) (ch.springs ?? SPRING_FEEL[ch.kind])?.forEach((f, i) => { if (ch.bones[i]) out[`${ch.bones[i]}.r`] = f; });
  if (character.tags.look) out[`${character.tags.look}.r`] = FEEL.head;
  return out;
}

// choreo, with '.shape' keys swapped rather than blended: each takes the value of the latest move
// keying it that is halfway done.
const STEP = /\.shape$/;
export function stepped(t, rest, moves) {
  const p = choreo(t, rest, moves), when = {};
  for (const k of Object.keys(p)) if (STEP.test(k)) p[k] = rest[k] ?? 0;
  for (const m of moves) {
    const mid = m.t + (m.dur ?? 0.5) * 0.5;
    if (t < mid) continue;
    for (const [k, val] of Object.entries(m.pose)) if (STEP.test(k) && !(when[k] > mid)) { p[k] = val; when[k] = mid; }
  }
  return p;
}

// A character's pose(t, moves, opts) function. On twos by default, with springs on the arms and
// head, breathing (tags.chest), a sway (tags.root), blinks, glances, and the mouth chart following
// the lines the character says (`speaker`). Checks each move list when it first comes in, and
// what extra(t) adds each frame.
export function cutoutPose(character, { rest = character.rest, seed = 5 } = {}) {
  character.needs(['root', 'chest', 'look'], 'cutoutPose');
  const { root, chest, look } = character.tags;
  const joints = jointsOf(character);
  return function pose(t, moves, { speaker, extra, twos = true, still = false, springy = !still, fps = 30 } = {}) {
    character.checkMoves(moves);
    if (twos) t = onTwos(t, fps);
    character.now = t;
    const chore = u => stepped(u, rest, moves);
    let p = chore(t);
    if (springy) Object.assign(p, springs(`${character.id}.joints`, t, chore, joints));
    if (extra) {
      const e = extra(t);
      character.checkPose(e, `extra() at t = ${Number(t.toFixed(3))}`);
      p = add(p, e);
    }
    if (!still) {
      const br = breath(t, seed), sw = sway(t, seed);
      p = add(p, { [`${chest}.sy`]: 1 + 0.006 * br, [`${look}.y`]: -1.2 * br, [`${root}.x`]: sw * 2, [`${look}.r`]: -sw * 0.01 });
      const g = glance(t, seed);
      p['eyes.x'] = v(p, 'eyes.x') + g[0] * 0.25;
      p['eyes.y'] = v(p, 'eyes.y') + g[1] * 0.25;
      p['eyes.blink'] = Math.max(v(p, 'eyes.blink'), blink(t, seed));
    }
    // the mouth chart: the drawing for the sound being said; between words, the expression's own
    const s = viseme(t, { speaker });
    p['mouth.say'] = s === 'rest' ? -1 : MOUTH[SAYS[s]];
    const talk = s === 'rest' ? 0 : loudness(t);
    p[`${look}.r`] = v(p, `${look}.r`) + Math.sin(t * 8 + seed) * 0.018 * talk;
    p[`${look}.y`] = v(p, `${look}.y`) - talk * 2.5;
    return turnRig(p, bodyAngle(p), character);
  };
}

// The pose keys the cut-out kit reads beyond the bones' own: the angles and the face. Sideways
// numbers change sign in a mirrored drawing; CUTOUT_SIDES pairs the face's left and right keys.
export const CUTOUT_KEYS = {
  'body.view': VIEW, 'head.view': VIEW,
  'eyes.x': { range: [-1.3, 1.3], mirror: 'negate' }, 'eyes.y': [-1, 1], 'eyes.blink': [0, 1], 'eyes.open': [0, 1.4],
  'eyes.squint': [0, 1], 'eyes.pupil': [0, 2], 'eyeL.open': [0, 1.4], 'eyeR.open': [0, 1.4], 'eyeL.squint': [0, 1], 'eyeR.squint': [0, 1],
  'lids.drop': [0, 1], 'lids.slant': [-1, 1], 'lidL.drop': [0, 1], 'lidR.drop': [0, 1], 'lidL.slant': [-1, 1], 'lidR.slant': [-1, 1],
  'brows.up': [-1, 1.5], 'brows.in': [-1.2, 1.2], 'browL.up': [-1, 1.5], 'browR.up': [-1, 1.5], 'browL.slant': [-1.2, 1.2], 'browR.slant': [-1.2, 1.2],
  'mood.smile': [-1, 1], 'mouth.cornerL': [-1, 1], 'mouth.cornerR': [-1, 1], 'mouth.shift': { range: [-1, 1], mirror: 'negate' },
};
export const CUTOUT_SIDES = [['eyeL.', 'eyeR.'], ['lidL.', 'lidR.'], ['browL.', 'browR.'], ['mouth.cornerL', 'mouth.cornerR']];

// ---------- clips ----------
// Clips for a cut-out biped (chains armL and armR, tags root and look), written against the tags so
// any such character can play them: character.play('wave', t), and mirror: true for the other side.
// wave, take and turn are whole gestures; point, shrug and thumbsUp end holding their pose, for the
// scene to key the way back when it wants.
const ARM_R_REST = { '@armR.0.r': 'rest', '@armR.1.r': 'rest', '@armR.2.r': 'rest', '@armR.2.shape': 'rest', '@armR.2.flip': 'rest' };
export const CLIPS = {
  // the right arm up, palm out, the hand flapping at the wrist, and down again
  wave: { dur: 1.6, moves: [
    { t: 0, dur: 0.25, ease: E.snap, anticipate: 0.2, pose: { '@armR.0.r': -2.5, '@armR.1.r': -0.45, '@armR.2.shape': HAND.palm, '@armR.2.r': 0 } },
    { t: 0.3, dur: 0.18, pose: { '@armR.2.r': 0.35 } },
    { t: 0.5, dur: 0.18, pose: { '@armR.2.r': -0.3 } },
    { t: 0.7, dur: 0.18, pose: { '@armR.2.r': 0.35 } },
    { t: 0.9, dur: 0.18, pose: { '@armR.2.r': -0.3 } },
    { t: 1.1, dur: 0.15, pose: { '@armR.2.r': 0 } },
    { t: 1.3, dur: 0.3, ease: E.io, pose: ARM_R_REST },
  ] },
  // the right arm out, a finger pointing along it
  point: { dur: 0.25, moves: [
    { t: 0, dur: 0.25, ease: E.snap, anticipate: 0.15, pose: { '@armR.0.r': -1.5, '@armR.1.r': -0.05, '@armR.2.shape': HAND.point, '@armR.2.r': 0.1 } },
  ] },
  // both forearms up and out, palms up, the head tilted, brows up
  shrug: { dur: 0.3, moves: [
    { t: 0, dur: 0.3, ease: E.snap, anticipate: 0.2, pose: {
      '@armL.0.r': 0.55, '@armL.1.r': 1.3, '@armR.0.r': -0.55, '@armR.1.r': -1.3, '@armL.2.shape': HAND.open, '@armR.2.shape': HAND.open,
      '@armL.2.r': 0.9, '@armR.2.r': -0.9, '@look.r': 0.1, 'brows.up': 0.6 } },
  ] },
  // a fist across the body, the thumb up (the hand flipped to show it), and a pump
  thumbsUp: { dur: 0.55, moves: [
    { t: 0, dur: 0.25, ease: E.snap, anticipate: 0.2, pose: { '@armR.0.r': -0.25, '@armR.1.r': -1.35, '@armR.2.shape': HAND.thumb, '@armR.2.flip': 1, '@armR.2.r': 0.1 } },
    { t: 0.3, dur: 0.1, pose: { '@armR.1.r': -1.55 } },
    { t: 0.4, dur: 0.15, pose: { '@armR.1.r': -1.35 } },
  ] },
  // a surprised take: down and screwed up first, then up, eyes wide, arms out, and a settle
  take: { dur: 0.9, moves: [
    { t: 0, dur: 0.12, pose: { '@root.y': 14, '@look.r': 0.06, 'eyes.squint': 0.4, 'brows.in': 0.4 } },
    { t: 0.12, dur: 0.14, ease: E.snap, pose: {
      '@root.y': -10, '@look.r': -0.08, 'eyes.squint': 0, 'brows.in': 0, 'brows.up': 1, 'eyes.open': 1.25, 'eyes.pupil': 0.7, 'mouth.shape': MOUTH.o,
      '@armL.0.r': 0.45, '@armR.0.r': -0.45, '@armL.2.shape': HAND.spread, '@armR.2.shape': HAND.spread } },
    { t: 0.5, dur: 0.4, pose: { '@root.y': 0, '@look.r': 0 } },
  ] },
  // a turn from angle `from` to angle `to`: the head gets there first, and the body follows
  turn: Object.assign(({ from = 0, to = 2, lead = 0.12, dur = 0.35 } = {}) => ({ dur: lead + dur, moves: [
    { t: 0, dur: lead + 0.04, pose: { 'head.view': to - from } },
    { t: lead, dur, pose: { 'body.view': to, 'head.view': 0 } },
  ] }), { params: ['from', 'to', 'lead', 'dur'] }),
};

// A cut-out character: defineCharacter with the kit's keys and sides, facing from body.view, and
// its pose function (character.pose). `life` sets cutoutPose's options ({ seed }).
export function defineCutout({ life, keys = {}, sides = [], ...def }) {
  const character = defineCharacter({ ...def, keys: { ...CUTOUT_KEYS, ...keys }, sides: [...CUTOUT_SIDES, ...sides], facing: pose => (bodyAngle(pose) < 0 ? -1 : 1) });
  character.pose = cutoutPose(character, life);
  return character;
}
