// The jump: timed by hand (a stunt is timed to its own physics, not to words), with three lines.
export const T = {
  turn: 1.45, crouch: 1.9, takeoff: 2.42, leave: 2.52, tuck: 2.62, open: 3.1, land: 3.34, hero: 3.46,
  lookUp: 4.35, standUp: 5.95, proud: 6.7, knee: 7.35, end: 9.8,
};
export function layout(L) {
  L.scene('jump');
  for (const [k, t] of Object.entries(T)) L.at(k, t);
  L.say('watch', { at: 0.55 });
  L.say('nailed', { at: 4.95 });
  L.say('knee', { at: 7.55 });
  L.pause(T.end - L.t);
  L.scene('end');
  L.pause(0.4);
}
export const review = c => [0.9, c.crouch + 0.35, c.takeoff + 0.08, c.tuck + 0.12, c.tuck + 0.28, c.tuck + 0.42, c.open + 0.08, c.land + 0.03,
  c.hero + 0.3, c.lookUp + 0.5, c.lookUp + 0.9, c.standUp + 0.3, c.proud + 0.3, c.knee + 0.2, c.knee + 0.9, c.end - 0.3];
