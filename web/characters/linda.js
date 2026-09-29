// Linda, a cut-out stock character (the receptionist):
// import { linda, pose, EXPR, POSES, REST } from '/@kit/characters/linda.js'.
// Data, in characters/linda/, made by tools/make_people.py on Dex's frame (his rig, clips and style).
import { loadCutout } from '../cutout.js';

export const linda = await loadCutout(new URL('./linda/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = linda;
export const pose = linda.pose;
