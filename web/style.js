// The video's drawing style, shared by the kits so that everything in a video is inked alike:
//   "style": { "ink": "#1D1A24", "line": 3.4, "line3d": 3 }
// in video.json. ink is the colour of every line. line is the 2D kits' line width (toon.js and
// cutout.js, and a cut-out character's SVG drawings), in the drawing's own units, so it thickens and
// thins with the character. line3d is the 3D kit's (toon3d.js and rig3d.js), in pixels on screen at
// any distance; the kit's thinner lines (a rack's bracing) keep their proportion to it. Each is
// optional, and without it each kit keeps its own look: the toon kit's ink is heavier and more purple
// than the cut-out kit's. For 2D and 3D lines to match on screen, line3d is about line times the
// scale the characters are drawn at.
import { VIDEO } from './timeline.js';

const KNOWN = ['ink', 'line', 'line3d'];
const style = VIDEO.style || {};
for (const k of Object.keys(style)) if (!KNOWN.includes(k)) throw new Error(`video.json: style.${k} isn't a style setting (${KNOWN.join(', ')} are)`);
for (const k of ['line', 'line3d']) if (style[k] !== undefined && !(style[k] > 0)) throw new Error(`video.json: style.${k} must be a width, more than 0`);
if (style.ink !== undefined && typeof style.ink !== 'string') throw new Error('video.json: style.ink must be a colour, like "#1D1A24"');

export const STYLE = Object.freeze({ ...style });
// The 3D kit's widths are given for its own 2.6 px line; a style's line3d scales all of them.
export const INK3D = (style.line3d ?? 2.6) / 2.6;
