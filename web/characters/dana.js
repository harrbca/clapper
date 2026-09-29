// Dana, a cut-out stock character (an office manager):
// import { dana, pose, EXPR, POSES, REST } from '/@kit/characters/dana.js'.
// Data, in characters/dana/, made by tools/make_people.py on Dex's frame (his rig, clips and style).
import { loadCutout } from '../cutout.js';

export const dana = await loadCutout(new URL('./dana/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = dana;
export const pose = dana.pose;
