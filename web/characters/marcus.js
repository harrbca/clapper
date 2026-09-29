// Marcus, a cut-out stock character (a picker on the day shift):
// import { marcus, pose, EXPR, POSES, REST } from '/@kit/characters/marcus.js'.
// Data, in characters/marcus/, made by tools/make_people.py on Dex's frame (his rig, clips and style).
import { loadCutout } from '../cutout.js';

export const marcus = await loadCutout(new URL('./marcus/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = marcus;
export const pose = marcus.pose;
