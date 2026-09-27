// clap capture: drives a web page in Chrome as a person would (pointing, clicking, typing) and keeps a
// screenshot of every state it passes through, with where the pointer was and what it pointed at.
// web/screen.js plays a capture back in a video: the screenshots in a browser window, and a drawn
// pointer that moves and clicks on the timeline's cues. A capture script is a module in the project:
//
//   export const url = 'webapp/index.html';        // a page in the project, or any http(s) address
//   export const address = 'orders.example/list';   // what the address bar shows (default: url)
//   export const viewport = { width: 1600, height: 816 };
//   export async function steps(s) {
//     await s.shot('start');                      // the page as it is
//     await s.click('#search', 'search');         // point at it, then click
//     await s.type('4821', 'typed');              // a screenshot after every character
//     await s.click('tr[data-id="4821"]', 'open', { wait: 600 });
//     await s.act('scan("A-01-03")', 'located');   // anything else that happens to the page
//   }
//
// `clap capture capture/print.js` writes capture/print/capture.json and the PNGs beside it. Pages are
// captured at twice their size, so the video can zoom in on them.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, shutdown } from './browser.js';
import { writeJSON } from './project.js';
import { serve } from './server.js';

const SCALE = 2;

export async function capture(P, script, { headed = false } = {}) {
  const file = path.resolve(P.root, script);
  const mod = await import(pathToFileURL(file).href + '?at=' + Date.now());
  if (!mod.url || !mod.steps) throw new Error(`${script} must export url and steps(s)`);
  const name = path.basename(file, path.extname(file)), dir = path.join(path.dirname(file), name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const viewport = { width: 1600, height: 816, ...mod.viewport };
  const server = /^https?:/.test(mod.url) ? null : await serve(P);
  const browser = await launch({ headless: !headed });
  const out = { viewport, scale: SCALE, address: mod.address ?? mod.url, steps: [] };
  try {
    const page = await browser.newPage();
    await page.setViewport({ ...viewport, deviceScaleFactor: SCALE });
    page.on('pageerror', e => console.log('  [page error]', e.message));
    await page.goto(server ? `${server.url}/${mod.url}` : mod.url, { waitUntil: 'networkidle0' });
    // no blinking caret: a screenshot would catch it on or off at random
    await page.addStyleTag({ content: '*, *::before, *::after { caret-color: transparent !important; }' });
    let n = 0, pointer = out.pointer = [Math.round(viewport.width * 0.62), Math.round(viewport.height * 0.78)];   // where it starts
    const settle = async (ms = 350) => {
      await page.waitForNetworkIdle({ idleTime: 100, timeout: 4000 }).catch(() => {});
      await new Promise(r => setTimeout(r, ms));
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    };
    const shoot = async tag => {
      const img = `${String(n++).padStart(2, '0')}-${tag}.png`;
      await page.screenshot({ path: path.join(dir, img) });
      return img;
    };
    const target = async (sel, offset = [0.5, 0.5]) => {
      const el = await page.waitForSelector(sel, { visible: true, timeout: 8000 });
      await el.scrollIntoView();
      const b = await el.boundingBox();
      if (!b) throw new Error(`${sel} has no box on the page`);
      const at = [b.x + b.width * offset[0], b.y + b.height * offset[1]];
      // something else on top (an invisible overlay, say) would take the click instead
      const over = await page.evaluate((el, x, y) => {
        const e = document.elementFromPoint(x, y);
        return !e || el === e || el.contains(e) ? '' : e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).trim().split(/\s+/).join('.') : '');
      }, el, ...at);
      if (over) console.log(`  warning: ${over} is on top of ${sel} where the pointer goes, and would take the click`);
      return { at, box: [b.x, b.y, b.width, b.height] };
    };
    const cursorAt = ([x, y]) => page.evaluate((x, y) => {
      const el = document.elementFromPoint(x, y);
      const c = el ? getComputedStyle(el).cursor : 'default';
      return c === 'pointer' || c === 'text' ? c : 'default';
    }, x, y);
    const step = (s, extra) => { const rec = { ...s, ...extra }; out.steps.push(rec); console.log(`  ${rec.kind.padEnd(5)} ${rec.id}`); return rec; };
    const ids = new Set();
    const id = x => { if (!x || ids.has(x)) throw new Error(`every step needs its own id (${x})`); ids.add(x); return x; };

    const s = {
      page,
      async shot(name, { wait = 0 } = {}) {
        await settle(wait);
        return step({ id: id(name), kind: 'shot', img: await shoot(name), title: await page.title() });
      },
      // Point at a selector (offset: where in its box, 0..1), then click it. Keeps the hover and the result.
      async click(sel, name, { wait = 350, offset } = {}) {
        id(name);
        const { at, box } = await target(sel, offset);
        await page.mouse.move(...at, { steps: 4 });
        await settle(120);
        const cursor = await cursorAt(at), hover = await shoot(`${name}-hover`);
        await page.mouse.down(); await new Promise(r => setTimeout(r, 60)); await page.mouse.up();
        await settle(wait);
        pointer = at;
        return step({ id: name, kind: 'click', at, box, cursor, hover, img: await shoot(name), title: await page.title() });
      },
      // Point at something without clicking it.
      async hover(sel, name, { offset } = {}) {
        id(name);
        const { at, box } = await target(sel, offset);
        await page.mouse.move(...at, { steps: 4 });
        await settle(150);
        pointer = at;
        return step({ id: name, kind: 'hover', at, box, cursor: await cursorAt(at), img: await shoot(name), title: await page.title() });
      },
      // Type into whatever has the focus, a screenshot after each character.
      async type(text, name, { wait = 0 } = {}) {
        id(name);
        const imgs = [], chars = [...text];
        for (const [i, ch] of chars.entries()) {
          await page.keyboard.type(ch);
          await settle(i === chars.length - 1 ? Math.max(40, wait) : 40);     // the last one waits for the page to answer
          imgs.push(await shoot(`${name}-${i + 1}`));
        }
        return step({ id: name, kind: 'type', text, at: pointer, imgs, title: await page.title() });
      },
      // Something that happens to the page but isn't the pointer's doing (a barcode scanned, a message
      // arriving): run code in it and keep the result, as s.act('scan("4821")', 'scanned').
      async act(code, name, { wait = 350 } = {}) {
        id(name);
        await page.evaluate(code);
        await settle(wait);
        return step({ id: name, kind: 'act', at: pointer, img: await shoot(name), title: await page.title() });
      },
      // Press a key (Enter, Tab, ...) and keep the result.
      async key(key, name, { wait = 350 } = {}) {
        id(name);
        await page.keyboard.press(key);
        await settle(wait);
        return step({ id: name, kind: 'key', key, at: pointer, img: await shoot(name), title: await page.title() });
      },
    };
    await mod.steps(s);
  } finally {
    await shutdown(browser);
    server?.close();
  }
  writeJSON(path.join(dir, 'capture.json'), out);
  console.log(`  wrote ${path.relative(P.root, dir)}: ${out.steps.length} steps, ${fs.readdirSync(dir).length - 1} screenshots`);
  return out;
}
