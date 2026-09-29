// The set's distances and walks, shared by the timeline (for footsteps) and the scenes. Millimetres,
// y up. The dock's desk is at the origin, the racks start at x = 2056, the aisle is z > -450.
export const DEX_UNIT = 1780 / 950;          // Dex is 950 units tall and about 1.78 m: mm per unit
export const FEED = 1.9;                     // seconds for the label to print
export const WALK = 5.4;                     // seconds from the printer to the bin
export const ASIDE = 1.5;                    // seconds to step out of Tilly's way
export const AT_PRINTER = [1060, 330];       // where Dex stands at the printer, turned to it
export const AT_BIN = [3840, -30];           // where he stands at the bin, facing it (-z)
export const WATCH = [3150, 560];            // where he steps to, to watch Tilly
export const WALK_PATH = [AT_PRINTER, [1500, 1150], [2700, 1150], [3600, 620], [3810, 160], AT_BIN];
export const ASIDE_PATH = [AT_BIN, [3700, 260], [3380, 500], WATCH];
export const WALK_OPTS = { step: 380, width: 150, lift: 45 };
