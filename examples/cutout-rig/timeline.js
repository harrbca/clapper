// Dex's rig test: four lines, keyed to the words the acting turns on, then he walks off.
export function layout(L) {
  L.scene('test');
  L.at('look', 0.9);
  L.say('hi', { at: 1.9 });
  L.at('morning', L.w('hi', 'morning'));
  L.at('dex', L.w('hi', 'dex'));
  L.at('night', L.w('hi', 'night'));
  L.say('scan', { gap: 0.6 });
  L.at('see', L.w('scan', 'see'));
  L.at('bin', L.w('scan', 'bin'));
  L.at('item', L.w('scan', 'item'));
  L.at('done', L.w('scan', 'done'));
  L.say('beep', { gap: 0.7 });
  L.at('wrong', L.w('beep', 'wrong'));
  L.at('beeps', L.w('beep', 'beeps'));
  L.at('loudly', L.w('beep', 'loudly'));
  L.say('go', { gap: 0.8 });
  L.at('anyway', L.w('go', 'anyway'));
  L.at('aisle', L.w('go', 'aisle'));
  L.at('itself', L.w('go', 'itself'));
  L.at('exit', L.T.go + L.spoken('go') + 0.35);
  L.pause(2.6);
  L.scene('end');
  L.pause(0.4);
}

export const review = c => [0.5, c.look + 0.5, c.morning + 0.3, c.dex + 0.2, c.night + 0.2, c.see + 0.3, c.bin + 0.3, c.item + 0.2,
  c.done + 0.3, c.wrong + 0.2, c.beeps + 0.2, c.loudly + 0.3, c.anyway + 0.2, c.aisle + 0.3, c.exit + 0.5, c.exit + 1.2];
