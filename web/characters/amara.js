// Amara, a cut-out stock character (an accountant):
// import { amara, pose, EXPR, POSES, REST } from '/@kit/characters/amara.js'.
// Data, in characters/amara/, made by tools/make_people.py on Dex's frame (his rig, clips and style).
import { loadCutout } from '../cutout.js';

export const amara = await loadCutout(new URL('./amara/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = amara;
export const pose = amara.pose;
