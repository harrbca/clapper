// Jess, a cut-out stock character (a shipping clerk in a hoodie):
// import { jess, pose, EXPR, POSES, REST } from '/@kit/characters/jess.js'.
// Data, in characters/jess/, made by tools/make_people.py on Dex's frame (his rig, clips and style).
import { loadCutout } from '../cutout.js';

export const jess = await loadCutout(new URL('./jess/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = jess;
export const pose = jess.pose;
