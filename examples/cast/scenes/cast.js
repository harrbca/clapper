// The kit's cut-out people, loaded together: the warehouse and the office.
import { dex } from '/@kit/characters/dex.js';
import { rosa } from '/@kit/characters/rosa.js';
import { marcus } from '/@kit/characters/marcus.js';
import { priya } from '/@kit/characters/priya.js';
import { walt } from '/@kit/characters/walt.js';
import { jess } from '/@kit/characters/jess.js';
import { dana } from '/@kit/characters/dana.js';
import { kenji } from '/@kit/characters/kenji.js';
import { amara } from '/@kit/characters/amara.js';
import { greg } from '/@kit/characters/greg.js';
import { linda } from '/@kit/characters/linda.js';

export const WAREHOUSE = [dex, rosa, marcus, priya, walt, jess];
export const OFFICE = [dana, kenji, amara, greg, linda];
export const ALL = [...WAREHOUSE, ...OFFICE];
export const still = (c, p = {}) => c.pose(0, [{ t: -1, dur: 0.001, pose: { 'eyes.blink': 0, ...p } }], { still: true, twos: false });
