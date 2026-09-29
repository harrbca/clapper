// Headless Chrome, driving the stage page one frame at a time.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROMES = [
  process.env.CLAP_CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);

export function chromePath() {
  const found = CHROMES.find(p => fs.existsSync(p));
  if (!found) throw new Error('no Chrome or Edge found; set CLAP_CHROME to its path');
  return found;
}

// WebGL (3D layers) uses the graphics card in headless Chrome as it is: tools/gpu-check.mjs shows which.
// The graphics card can draw a few edge pixels differently from one run to the next, which is fine for
// a video but not for comparing renders. `software` (or CLAP_SOFTWARE=1) draws everything on the CPU
// instead, the 2D canvas with Skia and WebGL with SwiftShader: slower, and the same on every run.
export const SOFTWARE = ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
export const launch = ({ headless = true, software = !!process.env.CLAP_SOFTWARE } = {}) => puppeteer.launch({
  executablePath: chromePath(),
  headless,
  args: ['--mute-audio', '--hide-scrollbars', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    ...(software ? SOFTWARE : []),
    ...(process.env.CLAP_CHROME_ARGS ? process.env.CLAP_CHROME_ARGS.split(' ') : [])],
});

// Close Chrome, but don't wait on it: after a long render it can sit for two minutes on the way out.
// It gets a few seconds to close properly, then it is ended.
export async function shutdown(browser, grace = 4000) {
  const proc = browser.process();
  const closed = await Promise.race([
    browser.close().then(() => true, () => false),
    new Promise(r => setTimeout(() => r(false), grace)),
  ]);
  if (!closed && proc && proc.exitCode === null) {
    if (process.env.CLAP_DEBUG) console.log('\n  (Chrome did not close in time; ending it)');
    try { proc.kill('SIGKILL'); } catch { /* already gone */ }
  }
}

// The stage at the video's size. `scale` renders drafts (0.5) or sharper masters (2). onConsole(m),
// when given, gets the page's console messages instead of their being printed.
export async function openStage(browser, server, P, { scale = 1, entry, onConsole } = {}) {
  // the page needs the laid-out timeline: without it, it would wait out the timeout below
  if (!fs.existsSync(path.join(P.root, 'build', 'timeline.json'))) throw new Error(`${P.root} isn't built yet: run clap build first (after clap voice, or clap voice --draft)`);
  const page = await browser.newPage();
  const { width, height } = P.config;
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  const problems = [];
  page.on('console', m => { if (onConsole) onConsole(m); else if (['error', 'warn', 'warning'].includes(m.type())) console.log('  [page]', m.text()); });
  page.on('pageerror', e => { problems.push(e); console.log('  [page error]', e.message); });
  await page.goto(`${server.url}/@kit/stage.html?render=1&scale=${scale}${entry ? `&entry=${encodeURIComponent(entry)}` : ''}`, { waitUntil: 'load' });
  await page.waitForFunction('window.clap && (window.clap.ready || window.clap.failed)', { timeout: 120000 });
  const failed = await page.evaluate(() => window.clap.failed);
  if (failed || problems.length) throw new Error('the stage did not load: ' + (failed || problems[0].message));
  return page;
}

export const drawFrame = (page, t) => page.evaluate(t => window.clap.frame(t), t);

export const capture = (page, type = 'jpeg', quality = 93) =>
  page.screenshot({ type, ...(type === 'jpeg' ? { quality } : {}), optimizeForSpeed: true });
