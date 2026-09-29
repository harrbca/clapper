// Pip, cut out: the kit's toon Pip (characters/pip.js) redrawn as a cut-out stock character, with a
// ponytail that swings on its own:
// import { pip, pose, EXPR, POSES, REST } from '/@kit/characters/pip-cutout.js'.
// Data, in characters/pip-cutout/, made by tools/make_pip.py on the cast's frame (Dex's rig, clips and
// style). The ponytail swings as she nods, jumps and turns; pose(t, moves, { motion }) swings it as a
// scene moves her too.
import { loadCutout } from '../cutout.js';

export const pip = await loadCutout(new URL('./pip-cutout/', import.meta.url).href);
export const { rest: REST, poses: POSES, expressions: EXPR, palette: PAL } = pip;
export const pose = pip.pose;
