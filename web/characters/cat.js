// Miso, a cut-out stock character: import { cat, pose, EXPR, POSES, REST } from '/@kit/characters/cat.js'.
// A slate-grey tabby with a white bib, muzzle and socks, a pink nose and whiskers. About 424 px tall
// to the tips of her ears and 400 long, origin on the floor under the middle of her body; L and R are
// the screen's left and right as she faces us, so facing right her L legs are the near ones.
// She is data, in characters/cat/: character.json (her bones, the tags that say what they are, her
// pieces and poses) and SVG drawings (bodies, heads and paws from each angle; the heads have places
// for the kit's eyes, brows and mouth). Her legs are the kit's noodles and her tail a ribbon, a chain
// that trailChain swings: trailChain(cat, p, t, 'tail', motion, { posed: true }) sways it where the
// pose holds it. Her poses are keyed side on, facing right; play them with mirror: true to face left.
import { loadCutout } from '../cutout.js';

export const cat = await loadCutout(new URL('./cat/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = cat;

// Miso at time t: see cutoutPose in cutout.js.
export const pose = cat.pose;
