// Characters as master data: the bones and the pieces drawn on them, tags that say what the bones
// are for, and every pose key the character understands, all declared. A scene that asks for
// something the character doesn't have fails with a message saying what and where, instead of
// drawing something quietly wrong. Nothing here knows about arms or heads: a tail, a wing or a
// forklift's mast is just bones. Kits (cutout.js) find arms, legs and heads through the tags.
//
//   export const dex = defineCharacter({
//     id: 'dex', version: 1, name: 'Dex',
//     bones: [
//       { name: 'hips', at: [0, -424] },
//       { name: 'legL', parent: 'hips', at: [-34, -4], len: 196, piece: 'legL' },   // or draw: fn
//       ...
//     ],
//     tags: {
//       root: 'hips', chest: 'torso', look: 'head',                // single bones, by what they do
//       chains: { legL: { bones: ['legL', 'shinL', 'footL'], side: 'L', kind: 'leg', bend: 'forward' }, ... },
//     },
//     pieces: { legL: { draw: (ctx, pose, character, opts) => ... }, head: angleSet('head', {...}), ... },
//     keys: { 'mood.smile': [-1, 1] },                             // pose keys beyond the bones' own
//     limits: { foreL: [-2.9, 0.2] },                              // radians a bone may turn (not checked yet)
//     rest, poses, expressions,
//   });
//
// A bone's own keys are '<bone>.r', '.x', '.y', '.s', '.sx', '.sy' and '.z'. Any other key must be
// declared, by the character or by one of its pieces: [min, max] for a number, { shape: [names] }
// for one that picks a drawing, and { range, mirror: 'negate' } for a number that changes sign when
// the drawing is mirrored (a sideways glance).
//
// A chain is a line of bones, each hanging from the one before. `side` pairs it with its twin (the
// chain of the same name with R for L, or `twin`), which is how mirroring swaps left and right.
// `kind` says what kits may do with it (an arm, a leg); `bend` which way its middle joint bends.
//
// Checks. At definition: bones, parents, pieces and tags that don't exist, chains that aren't lines
// of bones, swap sets missing a drawing they need (unless they say what stands in for it), and
// rest, poses and expressions using keys the character doesn't have. When moves load (checkMoves)
// and extras come in (checkPose): a key the character doesn't have (with the nearest one it does),
// a value that isn't a finite number, a '.shape' value that isn't one of its drawings. When drawn:
// the same for keys added since, and NaN or infinite values in the finished pose. needs() and
// chain(): a kit asking for a tag or chain the character hasn't got.
import { Puppet } from './puppet.js';

export const TRANSFORMS = ['r', 'x', 'y', 's', 'sx', 'sy', 'z'];

const q = k => `'${k}'`;
const when = t => `t = ${Number(Number(t).toFixed(3))}`;

// How many single-character edits turn a into b.
function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

function spec(who, key, s) {
  if (Array.isArray(s)) return { range: s };
  if (s && typeof s === 'object') return s;
  throw new Error(`${who}: key ${q(key)} needs [min, max] or { shape: [...] }, not ${JSON.stringify(s)}`);
}

export class Character extends Puppet {
  constructor({ id, version, name = id, bones, tags = {}, pieces = {}, keys = {}, sides = [], limits = {}, rest = {}, poses = {}, expressions = {} }) {
    if (typeof id !== 'string' || !id) throw new Error('defineCharacter: a character needs an id');
    if (!Number.isInteger(version) || version < 1) throw new Error(`${name}: version must be a whole number, 1 or more`);
    if (!Array.isArray(bones) || !bones.length) throw new Error(`${name}: bones must be a list, with at least one`);
    for (const b of bones) {
      if (b.piece !== undefined && !pieces[b.piece]) throw new Error(`${name}: bone ${b.name} wears piece ${b.piece}, which isn't in pieces`);
      if (b.piece !== undefined && typeof pieces[b.piece].draw !== 'function') throw new Error(`${name}: piece ${b.piece}, on bone ${b.name}, has no draw function`);
    }
    let self;                                      // the character, for its pieces' draw calls
    super(bones.map(({ piece, ...b }) => (piece === undefined ? b : { ...b, draw: (ctx, pose, part, opts) => pieces[piece].draw(ctx, pose, self, opts) })));
    self = this;
    Object.assign(this, { id, version, name, pieces, limits, rest, poses, expressions });
    this.tags = this.#tagsChecked(tags);

    // declared keys, the character's own and its pieces'
    this.keys = new Map();
    for (const [k, s] of Object.entries(keys)) this.keys.set(k, spec(name, k, s));
    for (const pc of Object.values(pieces)) for (const [k, s] of Object.entries(pc.keys || {})) this.keys.set(k, spec(name, k, s));
    this.negated = [...this.keys].filter(([, s]) => s.mirror === 'negate').map(([k]) => k);
    this.good = new Set();                         // keys found good, so each is looked up once
    this.checked = new WeakSet();                  // move lists already checked

    // swap sets: every drawing they need, or something declared to stand in for it
    for (const [pn, pc] of Object.entries(pieces)) {
      for (const need of pc.required || []) {
        if (pc.variants?.[need] !== undefined) continue;
        const stand = pc.fallback?.[need];
        const say = pc.describe ? pc.describe(need) : need;
        if (stand === undefined) throw new Error(`${name}: piece ${pn} has no drawing for ${say}, and nothing declared to stand in for it (fallback)`);
        if (pc.variants?.[stand] === undefined) throw new Error(`${name}: piece ${pn} has ${pc.describe ? pc.describe(stand) : stand} standing in for ${say}, but no drawing for that either`);
      }
    }
    for (const b of Object.keys(limits)) if (!this.by[b]) throw new Error(`${name}: limits name ${b}, which isn't a bone`);

    // left and right, for mirrored drawings: bones paired through their chains, and key prefixes
    // the kits pair (eyeL. with eyeR.)
    this.sidePairs = [...sides];
    const chains = this.tags.chains || {};
    for (const [cn, c] of Object.entries(chains)) {
      if (c.side !== 'L') continue;
      const twin = chains[c.twin ?? (cn.endsWith('L') ? cn.slice(0, -1) + 'R' : '')];
      if (twin) c.bones.forEach((b, i) => twin.bones[i] && this.sidePairs.push([`${b}.`, `${twin.bones[i]}.`]));
    }
    this.swaps = new Map();

    this.checkPose(rest, 'the rest pose');
    for (const [n, p] of Object.entries(poses)) this.checkPose(p, `pose ${n}`);
    for (const [n, p] of Object.entries(expressions)) this.checkPose(p, `expression ${n}`);
    this.now = 0;                                  // the time of the latest pose, for messages
  }

  #tagsChecked(tags) {
    const { chains = {}, ...rest } = tags;
    for (const [t, bone] of Object.entries(rest)) if (typeof bone === 'string' && !this.by[bone]) throw new Error(`${this.name}: tags.${t} is ${bone}, which isn't a bone`);
    for (const [cn, c] of Object.entries(chains)) {
      if (!Array.isArray(c.bones) || !c.bones.length) throw new Error(`${this.name}: chain ${cn} needs bones: [...]`);
      c.bones.forEach((b, i) => {
        if (!this.by[b]) throw new Error(`${this.name}: chain ${cn} lists ${b}, which isn't a bone`);
        if (i && this.by[b].parent !== c.bones[i - 1]) throw new Error(`${this.name}: chain ${cn} isn't a line of bones: ${b} hangs from ${this.by[b].parent}, not ${c.bones[i - 1]}`);
      });
      if (c.side !== undefined && c.side !== 'L' && c.side !== 'R') throw new Error(`${this.name}: chain ${cn}'s side is ${c.side}; it can be 'L' or 'R'`);
      if (c.bend !== undefined && c.bend !== 'forward' && c.bend !== 'back') throw new Error(`${this.name}: chain ${cn} bends ${c.bend}; it can bend 'forward' or 'back'`);
    }
    return tags;
  }

  // Whether the character has this pose key.
  known(key) {
    if (this.good.has(key)) return true;
    const dot = key.lastIndexOf('.');
    const ok = this.keys.has(key) || (dot > 0 && this.by[key.slice(0, dot)] !== undefined && TRANSFORMS.includes(key.slice(dot + 1)));
    if (ok) this.good.add(key);
    return ok;
  }

  // Every pose key the character has, bones' first.
  allKeys() { return [...this.parts.flatMap(p => TRANSFORMS.map(t => `${p.name}.${t}`)), ...this.keys.keys()]; }

  // The key it has that's nearest to `key` (a likely typo), or null.
  suggest(key) {
    let best = null, bestD = Infinity;
    for (const k of this.allKeys()) { const d = distance(key, k); if (d < bestD) { bestD = d; best = k; } }
    return bestD <= Math.max(2, Math.round(key.length / 4)) ? best : null;
  }

  // Throws unless every key in `pose` (a whole or partial pose) is one the character has, with a
  // finite number, and '.shape' keys pick a drawing it has. `where` says where the pose came from.
  checkPose(pose, where) {
    for (const k in pose) {
      const val = pose[k];
      if (!this.known(k)) {
        const near = this.suggest(k);
        throw new Error(`${this.name}: ${where} uses ${q(k)}, which isn't one of ${this.name}'s pose keys.${near ? ` Did you mean ${q(near)}?` : ''}`);
      }
      if (typeof val !== 'number' || !Number.isFinite(val)) throw new Error(`${this.name}: ${where} sets ${q(k)} to ${val}, which isn't a number.`);
      const s = this.keys.get(k);
      if (s?.shape && !(Number.isInteger(val) && val >= 0 && val < s.shape.length)) {
        throw new Error(`${this.name}: ${where} sets ${q(k)} to ${val}. It picks one of ${s.shape.length} drawings, so it must be a whole number from 0 to ${s.shape.length - 1} (${s.shape.join(', ')}).`);
      }
    }
  }

  // Checks a list of moves for choreo (each { t, dur, pose }), once per list.
  checkMoves(moves) {
    if (!moves || this.checked.has(moves)) return;
    for (const m of moves) {
      if (!Number.isFinite(m?.t)) throw new Error(`${this.name}: a move has no time (t): ${JSON.stringify(m).slice(0, 120)}`);
      if (m.dur !== undefined && !(Number.isFinite(m.dur) && m.dur >= 0)) throw new Error(`${this.name}: the move at ${when(m.t)} lasts ${m.dur}, which isn't a time.`);
      this.checkPose(m.pose || {}, `the move at ${when(m.t)}`);
    }
    this.checked.add(moves);
  }

  // For kits: throws unless the character has these tags. `who` names what needs them.
  needs(names, who) {
    const missing = names.filter(n => this.tags[n] === undefined);
    if (missing.length) throw new Error(`${this.name}: ${who} needs tags.${missing.join(' and tags.')}, which ${this.name} doesn't have.`);
  }

  // A chain by name, or a clear error naming the chains there are.
  chain(name, who = 'a helper') {
    const c = this.tags.chains?.[name];
    if (!c) throw new Error(`${this.name}: ${who} asks for chain ${name}, and ${this.name} has ${Object.keys(this.tags.chains || {}).join(', ') || 'no chains'}.`);
    return c;
  }

  // [name, chain] pairs, of one kind or all.
  chainsOf(kind) { return Object.entries(this.tags.chains || {}).filter(([, c]) => kind === undefined || c.kind === kind); }

  // A key's name on the other side: armL.r and armR.r, eyeL.open and eyeR.open.
  swapSide(key) {
    let out = this.swaps.get(key);
    if (out === undefined) {
      out = key;
      for (const [a, b] of this.sidePairs) {
        if (key.startsWith(a)) { out = b + key.slice(a.length); break; }
        if (key.startsWith(b)) { out = a + key.slice(b.length); break; }
      }
      this.swaps.set(key, out);
    }
    return out;
  }

  // The pose for a drawing mirrored to face the other way: left and right keys swapped, sideways
  // numbers (a glance) negated.
  mirrored(pose) {
    const out = {};
    for (const [k, val] of Object.entries(pose)) out[this.swapSide(k)] = val;
    for (const k of this.negated) out[k] = -(pose[k] ?? 0);
    return out;
  }

  draw(ctx, pose, opts) {
    for (const k in pose) {
      const val = pose[k];
      if (!this.known(k)) this.checkPose({ [k]: val }, `the pose drawn at ${when(this.now)}`);
      if (typeof val !== 'number' || !Number.isFinite(val)) throw new Error(`${this.name}: ${q(k)} is ${val} in the pose drawn at ${when(this.now)}.`);
    }
    super.draw(ctx, pose, opts);
  }
}

export const defineCharacter = def => new Character(def);
