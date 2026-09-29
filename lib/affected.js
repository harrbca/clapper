// clap check --affected <character> [folder...] [--approve]: what a change to a character does to the
// videos that use it. The projects that use it are found from their scenes' imports: the kit's
// examples, the project here, and any folders named (a project, or a folder of projects). Each one's
// review frames (the timeline's review list) and the lab pages that use the character are drawn in
// software, so a scene gives the same pixels on every run, and compared with the approved ones in the
// project's out/check/approved/. A pixel has changed when a colour channel moves by more than 24 (of
// 255), and a frame when more than 30 pixels have: tiny enough to catch a redrawn hand, loose enough
// to shrug off rounding. A changed frame gets a picture in out/check/diff/, the new frame faded with
// what changed in red. --approve keeps the frames just drawn as the approved ones.
import fs from 'node:fs';
import path from 'node:path';
import { capture, drawFrame, launch, openStage, shutdown } from './browser.js';
import { KIT, loadProject } from './project.js';
import { resolveTime } from './render.js';
import { serve } from './server.js';

const SKIP = new Set(['out', 'build', 'audio', 'assets', 'node_modules', '.git']);
const TOLERANCE = 24, ALLOWED = 30;

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    if (d.isDirectory()) return SKIP.has(d.name) ? [] : jsFiles(path.join(dir, d.name));
    return d.name.endsWith('.js') ? [path.join(dir, d.name)] : [];
  });
}
// a project folder, or the project folders in a folder
function projectsIn(dir) {
  if (!fs.existsSync(dir)) throw new Error(`there's no folder ${dir}`);
  if (fs.existsSync(path.join(dir, 'video.json'))) return [dir];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'video.json'))).map(d => path.join(dir, d.name));
}

// Compares two PNGs in the page: how many pixels changed, where, and a picture of it.
async function compare(page, a, b) {
  const url = f => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
  return page.evaluate(async (a, b, tolerance) => {
    const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('bad image')); i.src = src; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    if (A.width !== B.width || A.height !== B.height) return { size: `${A.width}x${A.height} then ${B.width}x${B.height}` };
    const W = A.width, H = A.height, c = Object.assign(document.createElement('canvas'), { width: W, height: H });
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(A, 0, 0); const pa = g.getImageData(0, 0, W, H).data;
    g.clearRect(0, 0, W, H); g.drawImage(B, 0, 0); const pb = g.getImageData(0, 0, W, H).data;
    const out = g.createImageData(W, H), po = out.data;
    let n = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let i = 0; i < pa.length; i += 4) {
      const d = Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2]));
      if (d > tolerance) {
        n++; po[i] = 255; po[i + 1] = 45; po[i + 2] = 85; po[i + 3] = 255;
        const x = (i / 4) % W, y = Math.floor(i / 4 / W);
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      } else {
        for (let k = 0; k < 3; k++) po[i + k] = 170 + pb[i + k] / 3;
        po[i + 3] = 255;
      }
    }
    if (!n) return { n };
    g.putImageData(out, 0, 0);
    g.strokeStyle = '#FF2D55'; g.lineWidth = 3; g.strokeRect(x0 - 8, y0 - 8, x1 - x0 + 16, y1 - y0 + 16);
    return { n, box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], diff: c.toDataURL('image/png') };
  }, url(a), url(b), TOLERANCE);
}

export async function affected(id, folders = [], { approve = false, here = null } = {}) {
  const uses = new RegExp(`characters/${id.replace(/[^\w-]/g, '')}(\\.js|/)`);
  const roots = [...new Set([path.join(KIT, 'examples'), ...(here ? [here.root] : []), ...folders.map(f => path.resolve(f))].flatMap(projectsIn))];
  const found = [];
  for (const root of roots) {
    const files = jsFiles(root).filter(f => uses.test(fs.readFileSync(f, 'utf8')));
    if (!files.length) continue;
    const lab = f => /^lab/.test(path.basename(f));
    found.push({ root, video: files.some(f => !lab(f)), labs: files.filter(lab).map(f => path.relative(root, f).split(path.sep).join('/')).sort() });
  }
  const rel = r => path.relative(process.cwd(), r) || '.';
  if (!found.length) throw new Error(`nothing uses ${id}: no scene imports characters/${id}.js in ${roots.map(rel).join(', ')}`);
  console.log(`  ${found.length} project${found.length > 1 ? 's use' : ' uses'} ${id}: ${found.map(f => rel(f.root)).join(', ')} (drawn in software, the same every run)`);

  const totals = { same: 0, changed: 0, fresh: 0 };
  const browser = await launch({ software: true });
  try {
    const blank = await browser.newPage();
    for (const { root, video, labs } of found) {
      const P = loadProject(root), tl = P.timeline();
      const dir = n => P.file('out', 'check', n);
      fs.rmSync(dir('current'), { recursive: true, force: true });
      fs.rmSync(dir('diff'), { recursive: true, force: true });
      for (const n of ['current', 'approved', 'diff']) fs.mkdirSync(dir(n), { recursive: true });
      const shots = [];                                      // [file name, what it is]
      const server = await serve(P);
      try {
        if (video) {
          const times = tl.review?.length ? tl.review.map(t => resolveTime(tl, t)) : tl.scenes.map(s => (s.start + s.end) / 2);
          const page = await openStage(browser, server, P);
          for (const t of times) {
            const name = `review-${t.toFixed(2)}.png`;
            await drawFrame(page, t);
            fs.writeFileSync(path.join(dir('current'), name), await capture(page, 'png'));
            shots.push([name, `review ${t.toFixed(2)} s`]);
          }
          await page.close();
        }
        for (const lab of labs) {
          const page = await openStage(browser, server, P, { entry: lab }), name = `${path.basename(lab, '.js')}.png`;
          await drawFrame(page, 0);
          fs.writeFileSync(path.join(dir('current'), name), await capture(page, 'png'));
          shots.push([name, lab]);
          await page.close();
        }
      } finally { server.close(); }

      console.log(`\n  ${rel(root)}: ${shots.length} frame${shots.length > 1 ? 's' : ''}`);
      for (const [name, what] of shots) {
        const now = path.join(dir('current'), name), before = path.join(dir('approved'), name);
        if (!fs.existsSync(before)) { totals.fresh++; console.log(`    new       ${what} (nothing approved yet)`); continue; }
        const r = await compare(blank, before, now);
        if (r.size) { totals.changed++; console.log(`    CHANGED   ${what}: its size changed, ${r.size}`); continue; }
        if (r.n <= ALLOWED) { totals.same++; continue; }
        totals.changed++;
        const diff = path.join(dir('diff'), name);
        fs.writeFileSync(diff, Buffer.from(r.diff.split(',')[1], 'base64'));
        console.log(`    CHANGED   ${what}: ${r.n} px, in ${r.box[2]}x${r.box[3]} at (${r.box[0]}, ${r.box[1]})   ${path.relative(process.cwd(), diff)}`);
      }
      if (approve) for (const [name] of shots) fs.copyFileSync(path.join(dir('current'), name), path.join(dir('approved'), name));
    }
  } finally { await shutdown(browser); }
  const { same, changed, fresh } = totals;
  console.log(`\n  ${changed} changed, ${same} the same, ${fresh} new.${approve ? ' Approved: these are now the look to compare with.' : changed || fresh ? ` clap check --affected ${id} --approve keeps the new look.` : ''}`);
}
