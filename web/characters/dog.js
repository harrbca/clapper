// Biscuit, a cut-out stock character: import { dog, pose, EXPR, POSES, REST } from '/@kit/characters/dog.js'.
// A golden puppy with floppy ears, a cream muzzle and a red collar. About 430 px tall and 400 long,
// origin on the floor under the middle of his body; L and R are the screen's left and right as he
// faces us, so facing right his L legs are the near ones.
// He is data, in characters/dog/: character.json (his bones, the tags that say what they are, his
// pieces and poses) and SVG drawings (bodies, heads and paws from each angle; the heads have places
// for the kit's eyes, brows and mouth). His legs are the kit's noodles and his tail a ribbon, a chain
// that trailChain swings: trailChain(dog, p, t, 'tail', motion, { posed: true }) wags it where the
// pose holds it. His poses are keyed side on, facing right; play them with mirror: true to face left.
import { loadCutout } from '../cutout.js';

export const dog = await loadCutout(new URL('./dog/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = dog;

// Biscuit at time t: see cutoutPose in cutout.js.
export const pose = dog.pose;
