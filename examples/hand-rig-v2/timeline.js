// The hand rig test: a pantomime, timed by hand. Each beat names a test, shown as a caption.
export const BEATS = {
  open: 0.6, close: 1.8, reopen: 3.0, relax: 3.8,
  count: 4.8, touch: 9.6, wave: 15.2, ripple: 18.9, grip: 21.9, squeeze: 23.6, release: 27.4, gestures: 28.3, done: 32.6,
};
export const CAPTIONS = [
  [0.4, 'Open and close: the fingers move one after another'],
  [4.6, 'Counting'],
  [9.4, 'The thumb meets each fingertip'],
  [15.0, 'A wave: the fingers trail the wrist'],
  [18.7, 'A ripple across the fingers'],
  [21.6, 'A grip that wraps whatever it holds, thick or thin'],
  [28.1, 'Thumbs up, pointing, peace, OK'],
];
export function layout(L) {
  L.scene('hands');
  for (const [k, t] of Object.entries(BEATS)) L.at(k, t);
  L.pause(33.6 - L.t);
  L.scene('end');
  L.pause(0.4);
}
export const review = c => [0.2, c.close + 0.6, c.count + 2.2, c.count + 3.9, c.touch + 0.6, c.touch + 2.2, c.wave + 1.1, c.ripple + 0.9,
  c.grip + 1.2, c.squeeze + 1.4, c.squeeze + 3.1, c.gestures + 0.5, c.gestures + 1.5, c.gestures + 2.5, c.gestures + 3.6];
