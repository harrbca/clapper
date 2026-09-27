// How long drawing and capturing take per frame, for one Chrome: node tools/profile-frames.mjs [frames] [start s]
import { capture, drawFrame, launch, openStage } from '../lib/browser.js';
import { loadProject } from '../lib/project.js';
import { serve } from '../lib/server.js';

const [n = 60, from = 60] = process.argv.slice(2).map(Number);
const P = loadProject(process.cwd()), server = await serve(P), browser = await launch();
const page = await openStage(browser, server, P);
const t = { draw: 0, jpeg: 0, png: 0, cdp: 0 };
const cdp = await page.createCDPSession();
for (let i = 0; i < n; i++) {
  const s = from + i / P.config.fps;
  let a = performance.now(); await drawFrame(page, s); t.draw += performance.now() - a;
  a = performance.now(); await capture(page); t.jpeg += performance.now() - a;
  a = performance.now(); await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, optimizeForSpeed: true }); t.cdp += performance.now() - a;
}
for (const k of Object.keys(t)) if (t[k]) console.log(`  ${k.padEnd(5)} ${(t[k] / n).toFixed(1)} ms per frame`);
await browser.close(); server.close();
