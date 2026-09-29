// Dex, a cut-out stock character: import { dex, pose, EXPR, POSES, REST } from '/@kit/characters/dex.js'.
// A warehouse picker in a hi-vis vest and an orange beanie. About 950 px tall, origin on the floor
// between his feet; L and R are the screen's left and right as he faces us.
// He is data, in characters/dex/: character.json (his bones, the tags that say what they are, his
// pieces, limits and poses) and SVG drawings (heads, torsos and boots from each angle; the heads have
// places for the kit's eyes, brows and mouth). The limbs, hands and mouth chart are the kit's own,
// named in the JSON. cutout.js's loadCutout reads the folder and returns the character.
// A prop goes in a hand through the draw call: dex.draw(ctx, pose, { x, y, held: { handL: fn } }).
import { loadCutout } from '../cutout.js';

export const dex = await loadCutout(new URL('./dex/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = dex;

// Dex at time t: see cutoutPose in cutout.js.
export const pose = dex.pose;
