// Priya, a cut-out stock character (an inventory clerk with a headset):
// import { priya, pose, EXPR, POSES, REST } from '/@kit/characters/priya.js'.
// Data, in characters/priya/, made by tools/make_people.py on Dex's frame (his rig, clips and style).
import { loadCutout } from '../cutout.js';

export const priya = await loadCutout(new URL('./priya/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = priya;
export const pose = priya.pose;
