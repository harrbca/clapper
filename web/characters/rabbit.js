// Clover, a cut-out stock character: import { rabbit, pose, EXPR, POSES, REST } from '/@kit/characters/rabbit.js'.
// A cinnamon bunny with long ears, a cream belly, muzzle, feet and powder-puff tail. About 470 px
// tall to the tips of her ears, origin on the floor under the middle of her body; L and R are the
// screen's left and right as she faces us, so facing right her L legs are the near ones.
// She is data, in characters/rabbit/: character.json (her bones, the tags that say what they are, her
// pieces and poses) and SVG drawings (bodies, heads, front paws and long hind feet from each angle;
// the heads have places for the kit's eyes, brows and mouth). Her legs are the kit's noodles and her
// tail a short ribbon that trailChain twitches: trailChain(rabbit, p, t, 'tail', motion, { posed:
// true }). Her poses are keyed side on, facing right; play them with mirror: true to face left.
import { loadCutout } from '../cutout.js';

export const rabbit = await loadCutout(new URL('./rabbit/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = rabbit;

// Clover at time t: see cutoutPose in cutout.js.
export const pose = rabbit.pose;
