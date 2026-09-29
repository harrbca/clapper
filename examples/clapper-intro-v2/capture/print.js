// The Parts Desk (webapp/): find order 4821, open it, print its label.
//   clap capture capture/print.js   (after capture/label.js: the page shows the label's picture)
export const url = 'webapp/index.html';
export const address = 'parts-desk/orders';
export const viewport = { width: 1600, height: 816 };
export async function steps(s) {
  await s.shot('start');
  await s.click('#search', 'search', { offset: [0.3, 0.5] });
  await s.type('4821', 'typed', { wait: 150 });
  await s.click('tr[data-id="4821"] td.num', 'open', { wait: 400 });
  await s.click('#print', 'print', { wait: 600 });
}
