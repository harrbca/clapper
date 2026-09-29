// 3D Bolt beside the 2D one, in three moods:  clap still 0 --entry scenes/lab3d.js
import { REST } from '/@kit/camera.js';
import { layer3d } from '/@kit/scene3d.js';
import { text } from '/@kit/draw.js';
import { bolt, boltPose } from '../characters/bolt.js';
import { bolt3d } from '../characters/bolt3d.js';
import { backdrop, FLOOR, shadow } from './set.js';

let L = null, bots = [];
export function setup(stage) {
  L = layer3d(stage);
  L.lights = L.studioLights();
  L.shadowFloor(FLOOR);
  bots = [0, 1, 2].map(() => bolt3d(L));
}

const still = () => [0, 0];
export function render({ ctx, W, H }, t) {
  backdrop(ctx, REST, t, W, H);
  // the 2D Bolt, for comparison
  shadow(ctx, 300, 90, 300);
  bolt.draw(ctx, boltPose(t, still, { 'eyes.mood': 0 }), { x: 300, y: 540, scale: 1.2 });
  text(ctx, '2D', 300, 760, { size: 30, weight: 700, color: '#8A6A55' });
  // three 3D Bolts, turned and in different moods
  const setups = [[760, 0.5, 0], [1200, -0.35, 1], [1640, 0.1, 2]];
  setups.forEach(([x, yaw, mood], i) => bots[i].update(boltPose(t + i, still, { 'eyes.mood': mood, 'body.r': [0.12, -0.08, 0][i] }), { x, y: 520, scale: 1.2, yaw }));
  L.match(REST); L.lights.follow(REST);
  L.draw(ctx);
  text(ctx, '3D', 1200, 760, { size: 30, weight: 700, color: '#8A6A55' });
}
