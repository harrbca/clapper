// The 3D part's distances and walks, shared by the timeline (for footsteps) and the scenes.
// Millimetres, y up; the dock's desk is at the origin, the racks start at x = 2056, the aisle is z > -450.
export const PIP_SCALE = 1.8;                 // pip3d is 910 tall in her own units: about 1.64 m
export const FEED = 1.9;                      // seconds for the label to print
export const WALK = 5.2;                      // seconds from the printer to the bin
export const ASIDE = 1.5;                     // seconds to step out of Tilly's way
export const AT_PRINTER = [-120, 690];        // where Pip stands at the printer, facing it (-z)
export const AT_BIN = [3840, -30];            // where she stands at the bin, facing it (-z)
export const WATCH = [3150, 560];             // where she steps to, to watch Tilly
export const WALK_PATH = [AT_PRINTER, [250, 1080], [1300, 1180], [2700, 1000], [3600, 560], [3810, 160], AT_BIN];
export const ASIDE_PATH = [AT_BIN, [3700, 260], [3380, 500], WATCH];
export const WALK_OPTS = { step: 400, width: 150, lift: 45 };
