// Walt, a cut-out stock character (a receiver with forty years on the dock):
// import { walt, pose, EXPR, POSES, REST } from '/@kit/characters/walt.js'.
// Data, in characters/walt/, made by tools/make_people.py on Dex's frame (his rig, clips and style).
import { loadCutout } from '../cutout.js';

export const walt = await loadCutout(new URL('./walt/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = walt;
export const pose = walt.pose;
