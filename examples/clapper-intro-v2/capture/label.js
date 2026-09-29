// The pick ticket (label/), as a picture for the 3D printer to print.
//   clap capture capture/label.js
export const url = 'label/index.html';
export const viewport = { width: 400, height: 600 };
export async function steps(s) {
  await s.shot('label');
}
