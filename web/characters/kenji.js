// Kenji, a cut-out stock character (the IT support tech):
// import { kenji, pose, EXPR, POSES, REST } from '/@kit/characters/kenji.js'.
// Data, in characters/kenji/, made by tools/make_people.py on Dex's frame (his rig, clips and style).
import { loadCutout } from '../cutout.js';

export const kenji = await loadCutout(new URL('./kenji/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = kenji;
export const pose = kenji.pose;
