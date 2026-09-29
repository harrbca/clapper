// Rosa, a cut-out stock character (a warehouse team lead who drives the forklifts):
// import { rosa, pose, EXPR, POSES, REST } from '/@kit/characters/rosa.js'.
// Data, in characters/rosa/, made by tools/make_people.py on Dex's frame (his rig, clips and style).
import { loadCutout } from '../cutout.js';

export const rosa = await loadCutout(new URL('./rosa/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = rosa;
export const pose = rosa.pose;
