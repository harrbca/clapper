// The Ray rig test: a pantomime, timed by hand. Each beat names a test, shown as a caption.
export const BEATS = {
  wave: 1.4, waveDown: 4.2, count: 5.0, countDown: 8.8, point: 9.4, pointBack: 11.2,
  pick: 12.0, grasp: 13.3, lift: 14.1, thumbs: 16.0, putDown: 18.0, release: 18.9, ok: 20.6, done: 22.4,
};
export const CAPTIONS = [
  [0.2, 'Standing: breathing, shifting his weight, blinking'],
  [1.3, 'A wave: the fingers trail the wrist'],
  [4.9, 'Counting'],
  [9.3, 'Pointing: chest, head and eyes turn together'],
  [11.9, 'Picking it up: the hips go back, the fingers find the handle'],
  [14.6, 'Turning it over; a thumbs up with the other hand'],
  [17.9, 'Putting it down'],
  [20.4, 'OK'],
];
export function layout(L) {
  L.scene('ray');
  for (const [k, t] of Object.entries(BEATS)) L.at(k, t);
  L.pause(23.6 - L.t);
  L.scene('end');
  L.pause(0.4);
}
export const review = c => [0.8, c.wave + 1.2, c.wave + 1.5, c.count + 1.4, c.count + 3.2, c.point + 1.0, c.pick + 0.6, c.grasp + 0.3,
  c.lift + 0.6, c.thumbs + 0.6, c.putDown + 0.7, c.release + 0.5, c.ok + 0.9, c.done + 0.8];
