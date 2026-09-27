// Which WebGL renderer headless Chrome gets (the GPU, or its software fallback): node tools/gpu-check.mjs
import { launch } from '../lib/browser.js';

const b = await launch(), p = await b.newPage();
console.log('  ' + await p.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return 'no WebGL2';
  const d = gl.getExtension('WEBGL_debug_renderer_info');
  return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
}));
await b.close();
