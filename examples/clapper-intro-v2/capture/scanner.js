// The handheld's picking app (scanapp/): scan the order, tap the pick, scan the bin and Tilly, Done.
//   clap capture capture/scanner.js
export const url = 'scanapp/index.html';
export const viewport = { width: 360, height: 518 };
export async function steps(s) {
  await s.shot('home');
  await s.act('scan("4821")', 'scanOrder');
  await s.click('#pick', 'tapPick');
  await s.act('scan("A-01-03")', 'scanBin');
  await s.act('scan("TL-01")', 'scanTo');
  await s.click('#done', 'tapDone');
}
