// clap bake <module#export>: a 3D prop drawn from set angles into PNG sprites with transparent
// backgrounds, with sprite.json beside them (what sprite.js's loadSprite reads). The drawing happens
// in the stage page (web/bake.js), so the prop is lit and inked as it is in the 3D scenes.
import fs from 'node:fs';
import path from 'node:path';
import { launch, openStage, shutdown } from './browser.js';
import { serve } from './server.js';

export async function bake(P, prop, { angles = '0,45,90', scale = 1, res = 2, line, elevation = 8, shadow = true, args = '{}', name, out } = {}) {
  if (!prop || !prop.includes('#')) throw new Error('clap bake <module#export>: the module and the function in it that makes the prop, like @kit/printers3d.js#labelPrinter3d');
  try { JSON.parse(args); } catch { throw new Error(`--args must be JSON, like '{"bays":2}' (got ${args})`); }
  name ??= prop.split('#')[1].replace(/3d$/i, '');
  const dir = path.resolve(P.root, out ?? path.join('assets', 'baked', name));
  const q = new URLSearchParams({ prop, angles: String(angles), scale, res, elevation, shadow: shadow ? '1' : '0', args });
  if (line !== undefined) q.set('line', line);
  const server = await serve(P), browser = await launch();
  try {
    const page = await openStage(browser, server, P, { entry: `@kit/bake.js?${q}` });
    const baked = await page.evaluate(() => window.clapBake);
    if (!baked || baked.error) throw new Error(baked?.error || 'the bake page left nothing');
    fs.mkdirSync(dir, { recursive: true });
    const meta = { name, ...baked, angles: {} };
    for (const [a, s] of Object.entries(baked.angles)) {
      const file = `${a}.png`;
      fs.writeFileSync(path.join(dir, file), Buffer.from(s.png.split(',')[1], 'base64'));
      meta.angles[a] = { file, w: s.w, h: s.h, anchor: s.anchor };
    }
    fs.writeFileSync(path.join(dir, 'sprite.json'), JSON.stringify(meta, null, 2) + '\n');
    const views = Object.entries(meta.angles).map(([a, s]) => `${a}° ${s.w}x${s.h}`).join(', ');
    console.log(`  ${name}: ${views} -> ${path.relative(P.root, dir) || '.'}\n  ${meta.scale} px per unit at 1x, drawn at ${meta.res}x, ink ${meta.line} px at 1x`);
  } finally {
    await shutdown(browser);
    server.close();
  }
}
