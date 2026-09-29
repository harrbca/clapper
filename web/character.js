// Characters as master data: the bones and the pieces drawn on them, tags that say what the bones
// are for, and every pose key the character understands, all declared. A scene that asks for
// something the character doesn't have fails with a message saying what and where, instead of
// drawing something quietly wrong. Nothing here knows about arms or heads: a tail, a wing or a
// forklift's mast is just bones. Kits (cutout.js) find arms, legs and heads through the tags.
//
//   export const dex = defineCharacter({
//     id: 'dex', version: 1, name: 'Dex', height: 950,
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
//     limits: { shinL: [-0.15, 2.9] },                             // radians a bone may turn (facing right)
//     rest, poses, expressions, clips,
//   });
//
// A bone's own keys are '<bone>.r', '.x', '.y', '.s', '.sx', '.sy' and '.z'. Any other key must be
// declared, by the character or by one of its pieces: [min, max] for a number, { shape: [names] }
// for one that picks a drawing, and { range, mirror: 'negate' } for a number that changes sign when
// the drawing is mirrored (a sideways glance); flip: 'negate' changes its sign in a flipped clip.
//
// A chain is a line of bones, each hanging from the one before. `side` pairs it with its twin (the
// chain of the same name with R for L, or `twin`), which is how mirroring swaps left and right.
// `kind` says what kits may do with it (an arm, a leg); `bend` which way its middle joint bends.
//
// Clips are timed moves, written against tags so any character with the same tags can play them:
// '@armR.0.r' is the first bone of chain armR, '@look.r' the bone tagged look, and 'rest' as a
// value is the character's rest value for that key. character.play('wave', 2.1) gives the moves.
//
// Checks. Errors, at definition: bones, parents, pieces and tags that don't exist, chains that
// aren't lines of bones, swap sets missing a drawing they need (unless they say what stands in for
// it), and rest, poses and expressions using keys the character doesn't have. Errors, when moves
// load, clips play and extras come in: a key the character doesn't have (with the nearest one it
// does), a value that isn't a finite number, a '.shape' value that isn't one of its drawings, a tag
// or chain it hasn't got. When drawn, the same for keys added since, and NaN or infinite values.
// Warnings (printed once each, with the time): an IK target out of reach, a bone turned beyond its
// limits, a chain drawn partly behind the body and partly in front, and a squash or stretch keyed
// away from rest and never keyed back.
import { Puppet } from './puppet.js';

export const TRANSFORMS = ['r', 'x', 'y', 's', 'sx', 'sy', 'z'];
const SCALE = /\.(s|sx|sy)$/;

const q = k => `'${k}'`;
const when = t => `t = ${Number(Number(t).toFixed(3))}`;
const round = x => Number(x.toFixed(2));

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
  constructor({ id, version, name = id, height, bones, tags = {}, pieces = {}, keys = {}, sides = [], limits = {}, rest = {}, poses = {}, expressions = {}, clips = {}, facing }) {
    if (typeof id !== 'string' || !id) throw new Error('defineCharacter: a character needs an id');
    if (!Number.isInteger(version) || version < 1) throw new Error(`${name}: version must be a whole number, 1 or more`);
    if (!Array.isArray(bones) || !bones.length) throw new Error(`${name}: bones must be a list, with at least one`);
    for (const b of bones) {
      if (b.piece !== undefined && !pieces[b.piece]) throw new Error(`${name}: bone ${b.name} wears piece ${b.piece}, which isn't in pieces`);
      if (b.piece !== undefined && typeof pieces[b.piece].draw !== 'function') throw new Error(`${name}: piece ${b.piece}, on bone ${b.name}, has no draw function`);
    }
    let self;                                      // the character, for its pieces' draw calls
    super(bones.map(({ piece, ...b }) => (piece === undefined ? b : { ...b, piece, draw: (ctx, pose, part, opts) => pieces[piece].draw(ctx, pose, self, opts) })));
    self = this;
    Object.assign(this, { id, version, name, height, pieces, limits, rest, poses, expressions, clips });
    this.facing = facing || (() => 1);             // which way the body faces (-1 left), for limits
    this.tags = this.#tagsChecked(tags);

    // declared keys: the character's own, then its pieces' (which don't replace the character's)
    this.keys = new Map();
    for (const [k, s] of Object.entries(keys)) this.keys.set(k, spec(name, k, s));
    for (const pc of Object.values(pieces)) for (const [k, s] of Object.entries(pc.keys || {})) if (!this.keys.has(k)) this.keys.set(k, spec(name, k, s));
    this.negated = [...this.keys].filter(([, s]) => s.mirror === 'negate').map(([k]) => k);
    this.good = new Set();                         // keys found good, so each is looked up once
    this.checked = new WeakSet();                  // move lists already checked
    this.warned = new Set();                       // warnings already given

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
    for (const [b, lim] of Object.entries(limits)) {
      if (!this.by[b]) throw new Error(`${name}: limits name ${b}, which isn't a bone`);
      if (!Array.isArray(lim) || lim.length !== 2 || !(lim[0] <= lim[1])) throw new Error(`${name}: ${b}'s limits must be [min, max] in radians`);
    }

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
    for (const n of Object.keys(clips)) if (typeof clips[n] !== 'function') this.play(n, 0);   // resolves and checks it
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

  // A key's rest value: the rest pose's, else 1 for scales and 0 for the rest.
  restOf(key) { return this.rest[key] ?? (SCALE.test(key) ? 1 : 0); }

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

  // Checks a list of moves for choreo (each { t, dur, pose }), once per list. Also notes a squash or
  // stretch that the moves key away from rest and never key back, since it holds for the rest of
  // the video.
  checkMoves(moves) {
    if (!moves || this.checked.has(moves)) return;
    const last = {};
    for (const m of moves) {
      if (!Number.isFinite(m?.t)) throw new Error(`${this.name}: a move has no time (t): ${JSON.stringify(m).slice(0, 120)}`);
      if (m.dur !== undefined && !(Number.isFinite(m.dur) && m.dur >= 0)) throw new Error(`${this.name}: the move at ${when(m.t)} lasts ${m.dur}, which isn't a time.`);
      this.checkPose(m.pose || {}, `the move at ${when(m.t)}`);
      for (const [k, val] of Object.entries(m.pose || {})) if (SCALE.test(k) && !(last[k]?.t > m.t)) last[k] = { t: m.t, val };
    }
    // (a list of one move holds a pose, as a lab page does, so a squash there is meant)
    if (moves.length > 1) for (const [k, { t, val }] of Object.entries(last)) {
      if (Math.abs(val - this.restOf(k)) > 1e-6) this.warn(`rest ${k}`, `the move at ${when(t)} leaves ${q(k)} at ${val}, and nothing keys it back to ${this.restOf(k)}, so it holds for the rest of the video.`);
    }
    this.checked.add(moves);
  }

  // A warning, once for each subject.
  warn(subject, message) {
    if (this.warned.has(subject)) return;
    this.warned.add(subject);
    console.warn(`${this.name}: ${message}`);
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

  // A clip key for this character: '@chain.i.prop' (i from the chain's root; -1 its end) or
  // '@tag.prop', as a bone key. `where` names the clip, for the error if it can't be resolved.
  resolve(key, where) {
    if (key[0] !== '@') return key;
    const [name, a, b] = key.slice(1).split('.');
    const chain = this.tags.chains?.[name];
    if (chain && b !== undefined) {
      const i = Number(a), bone = chain.bones[i < 0 ? chain.bones.length + i : i];
      if (bone === undefined) throw new Error(`${this.name}: ${where} uses ${q(key)}, but chain ${name} has ${chain.bones.length} bones.`);
      return `${bone}.${b}`;
    }
    if (typeof this.tags[name] === 'string' && b === undefined) return `${this.tags[name]}.${a}`;
    const have = [...Object.keys(this.tags.chains || {}), ...Object.keys(this.tags).filter(t => typeof this.tags[t] === 'string')];
    throw new Error(`${this.name}: ${where} uses ${q(key)}, and ${this.name} has no ${b !== undefined ? 'chain' : 'tag'} called ${name} (it has ${have.join(', ')}).`);
  }

  // A clip's moves, played from time `at`: times from `at`, keys resolved for this character.
  // `clip` is the name of one of its clips, or a clip ({ dur, moves }). speed > 1 plays it faster;
  // mirror: true plays it on the other side (left for right, turns negated). A clip that's a
  // function gets the options (a turn's from and to) and returns the clip.
  play(clip, at, opts = {}) {
    const { speed = 1, mirror = false } = opts;
    const name = typeof clip === 'string' ? `clip ${clip}` : 'a clip';
    if (typeof clip === 'string') {
      if (!this.clips[clip]) throw new Error(`${this.name}: there's no clip called ${clip}; ${this.name} has ${Object.keys(this.clips).join(', ') || 'none'}.`);
      clip = this.clips[clip];
    }
    if (typeof clip === 'function') clip = clip(opts);
    if (!(speed > 0)) throw new Error(`${this.name}: ${name} played at speed ${speed}; speed must be more than 0.`);
    return clip.moves.map(m => {
      const where = `${name} (its move at ${when(m.t)})`, pose = {};
      for (const [k0, v0] of Object.entries(m.pose)) {
        let k = this.resolve(k0, where);
        if (mirror) k = this.swapSide(k);
        let val = v0 === 'rest' ? this.restOf(k) : v0;
        const s = this.keys.get(k);
        if (mirror && v0 !== 'rest' && (/\.(r|x)$/.test(k) && !s || s?.mirror === 'negate' || s?.flip === 'negate')) val = -val;
        pose[k] = val;
      }
      this.checkPose(pose, where);
      return { ...m, t: at + m.t / speed, dur: (m.dur ?? 0.5) / speed, pose };
    });
  }

  // IK, as Puppet.reach, with a warning when the target is out of reach (the limb stops short);
  // quiet: true for a contact a scene is letting go of, as it goes out of reach on purpose.
  reach(pose, upper, lower, target, bend, { quiet = false } = {}) {
    const U = this.by[upper], L = this.by[lower];
    if (!U?.len || !L?.len) throw new Error(`${this.name}: reach needs two bones with lengths; ${!U?.len ? upper : lower} has none.`);
    const [sx, sy] = this.where(upper, { ...pose, [`${upper}.r`]: 0, [`${lower}.r`]: 0 });
    const d = Math.hypot(target[0] - sx, target[1] - sy), long = U.len + L.len, short = Math.abs(U.len - L.len), slack = 0.02 * long;
    if (quiet) { /* no warning */ } else if (d > long + slack) this.warn(`reach ${upper}`, `at ${when(this.now)}, ${upper} and ${lower} can't reach their target: it's ${Math.round(d - long)} px beyond their ${Math.round(long)} px, so the limb stops short.`);
    else if (d < short - slack) this.warn(`reach ${upper}`, `at ${when(this.now)}, ${upper} and ${lower}'s target is ${Math.round(short - d)} px too close to fold to.`);
    return super.reach(pose, upper, lower, target, bend);
  }

  draw(ctx, pose, opts) {
    for (const k in pose) {
      const val = pose[k];
      if (!this.known(k)) this.checkPose({ [k]: val }, `the pose drawn at ${when(this.now)}`);
      if (typeof val !== 'number' || !Number.isFinite(val)) throw new Error(`${this.name}: ${q(k)} is ${val} in the pose drawn at ${when(this.now)}.`);
    }
    // limits: given for facing right (and front), mirrored for facing left; a turn is compared as the
    // same turn nearest the limits (IK can give -4.1 for 2.2)
    const face = this.facing(pose);
    for (const [b, [lo, hi]] of Object.entries(this.limits)) {
      const [a, z] = face < 0 ? [-hi, -lo] : [lo, hi], r0 = pose[`${b}.r`] ?? 0;
      const r = r0 - 2 * Math.PI * Math.round((r0 - (a + z) / 2) / (2 * Math.PI));
      if (r < a - 0.05 || r > z + 0.05) this.warn(`limit ${b}`, `at ${when(this.now)}, ${b} turns ${round(r)}, beyond its limits (${round(a)} to ${round(z)}${face < 0 ? ', facing left' : ''}).`);
    }
    // chains drawn partly behind the body and partly in front of it
    const chest = this.tags.chest && this.by[this.tags.chest];
    if (chest) {
      const zOf = b => pose[`${b}.z`] ?? this.by[b].z, cz = zOf(chest.name);
      for (const [cn, ch] of this.chainsOf()) {
        const drawn = ch.bones.filter(b => this.by[b].draw);
        const behind = drawn.find(b => zOf(b) < cz), before = drawn.find(b => zOf(b) > cz);
        if (behind && before) this.warn(`layers ${cn}`, `at ${when(this.now)}, chain ${cn} is split around the body: ${behind} is drawn behind ${chest.name} and ${before} in front of it.`);
      }
    }
    super.draw(ctx, pose, opts);
  }

  // Everything the character has, for clap list.
  registry() {
    const pieceOf = Object.fromEntries(this.parts.filter(p => p.piece).map(p => [p.piece, p.name]));
    return {
      id: this.id, name: this.name, version: this.version, height: this.height,
      bones: this.parts.map(p => ({ name: p.name, parent: p.parent, piece: p.piece })),
      tags: Object.fromEntries(Object.entries(this.tags).filter(([t]) => t !== 'chains' && typeof this.tags[t] === 'string')),
      chains: Object.fromEntries(this.chainsOf().map(([n, c]) => [n, { bones: c.bones, side: c.side, kind: c.kind, bend: c.bend }])),
      pieces: Object.fromEntries(Object.entries(this.pieces).map(([n, p]) => [n, {
        kind: p.kind || 'drawing', on: pieceOf[n] || p.within, variants: p.variants ? Object.keys(p.variants).map(k => (p.describe ? p.describe(isNaN(k) ? k : Number(k)) : k)) : [],
        fallback: p.fallback && Object.keys(p.fallback).length ? p.fallback : undefined,
      }])),
      keys: Object.fromEntries([...this.keys].map(([k, s]) => [k, s.shape ? { shape: s.shape } : { range: s.range }])),
      limits: this.limits,
      poses: Object.keys(this.poses), expressions: Object.keys(this.expressions),
      clips: Object.fromEntries(Object.entries(this.clips).map(([n, c]) => [n, typeof c === 'function' ? { params: c.params || [] } : { dur: c.dur }])),
    };
  }
}

export const defineCharacter = def => new Character(def);
