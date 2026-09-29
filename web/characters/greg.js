// Greg, a cut-out stock character (a salesman in a tie):
// import { greg, pose, EXPR, POSES, REST } from '/@kit/characters/greg.js'.
// Data, in characters/greg/, made by tools/make_people.py on Dex's frame (his rig, clips and style).
import { loadCutout } from '../cutout.js';

export const greg = await loadCutout(new URL('./greg/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = greg;
export const pose = greg.pose;
