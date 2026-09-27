// clap still / sheet / render. Frames come from headless Chrome, either as page screenshots (canvas and
// HTML layers) or posted by the page from its canvas ("capture": "canvas"; several times faster).
// Several Chrome processes draw in turn, because tabs in one Chrome capture one frame at a time.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { capture, drawFrame, launch, openStage, shutdown } from './browser.js';
import { ffmpeg, imagePipe } from './ffmpeg.js';
import { serve } from './server.js';

// A time given on the command line: seconds, a cue name, a scene id, or either with an offset
// ("title+0.5", "intro-0.2").
export function resolveTime(tl, spec) {
  if (typeof spec === 'number') return spec;
  const m = /^(.*?)([+-]\d*\.?\d+)?$/.exec(String(spec));
  const [name, off] = [m[1], m[2] ? parseFloat(m[2]) : 0];
  if (name !== '' && !isNaN(Number(name))) return Number(name) + off;
  if (name in tl.cue) return tl.cue[name] + off;
  const scene = tl.scenes.find(s => s.id === name);
  if (scene) return scene.start + off;
  const line = tl.lines.find(l => l.id === name);
  if (line) return line.start + off;
  throw new Error(`${spec} is not a time, cue, scene or line`);
}

async function withStage(P, fn, opts) {
  const server = await serve(P);
  const browser = await launch();
  try { return await fn(await openStage(browser, server, P, opts)); }
  finally { await shutdown(browser); server.close(); }
}

export async function stills(P, specs, { scale = 1, entry } = {}) {
  const tl = P.timeline(), dir = P.file('out', 'stills');
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  await withStage(P, async page => {
    for (const spec of specs) {
      const t = resolveTime(tl, spec), file = path.join(dir, `${String(spec).replace(/[^\w.+-]/g, '_')}.png`);
      await drawFrame(page, t);
      fs.writeFileSync(file, await capture(page, 'png'));
      files.push(file);
      console.log(`  ${path.relative(P.root, file)}  (t = ${t.toFixed(3)})`);
    }
  }, { scale, entry });
  return files;
}

// 2x2 contact sheets, each frame labelled with its time.
export async function sheets(P, name, specs, { entry } = {}) {
  const tl = P.timeline();
  const times = (specs.length ? specs : tl.review || []).map(s => resolveTime(tl, s));
  if (!times.length) throw new Error('no times given, and the timeline has no review list');
  const dir = P.file('out', 'stills'), tmp = P.file('build', 'sheet-tmp');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(tmp, { recursive: true });
  await withStage(P, async page => {
    for (let i = 0; i < times.length; i += 4) {
      const group = times.slice(i, i + 4), inputs = [];
      for (const [j, t] of group.entries()) {
        await drawFrame(page, t);
        const f = path.join(tmp, `${j}.png`);
        fs.writeFileSync(f, await capture(page, 'png'));
        inputs.push(f);
      }
      while (inputs.length < 4) inputs.push(inputs[inputs.length - 1]);
      const label = t => `drawtext=text='${t.toFixed(2)}':x=10:y=8:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=6`;
      const W = Math.round(P.config.width / 2), H = Math.round(P.config.height / 2);
      const parts = inputs.map((_, j) => `[${j}:v]scale=${W}:${H},${label(group[Math.min(j, group.length - 1)])}[v${j}]`);
      const file = path.join(dir, `${name}_${i / 4}.png`);
      ffmpeg(...inputs.flatMap(f => ['-i', f]), '-filter_complex',
        `${parts.join(';')};[v0][v1]hstack[top];[v2][v3]hstack[bottom];[top][bottom]vstack`, file);
      console.log(`  ${path.relative(P.root, file)}`);
    }
  }, { entry });
  fs.rmSync(tmp, { recursive: true, force: true });
}

function chaptersFile(P, tl, from, to, file) {
  const titles = P.config.chapters || {};
  const scenes = tl.scenes.filter(s => s.end > from && s.start < to && titles[s.id] !== null);
  const rows = scenes.map(s => {
    const a = Math.max(0, Math.round((s.start - from) * 1000)), b = Math.round((Math.min(s.end, to) - from) * 1000);
    return `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${a}\nEND=${b}\ntitle=${(titles[s.id] || s.id).replace(/[=;#\\\n]/g, ' ')}\n`;
  });
  fs.writeFileSync(file, `;FFMETADATA1\ntitle=${P.config.title}\n\n${rows.join('\n')}`);
}

// NVENC, the NVIDIA GPU's hardware encoder, when ffmpeg has it and it works; otherwise x264 on the CPU.
let nvenc = null;
export function hasNvenc() {
  if (nvenc === null) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=black:s=256x256:d=0.1', '-c:v', 'h264_nvenc', '-f', 'null', '-']);
    nvenc = r.status === 0;
  }
  return nvenc;
}

function encoderArgs(encoder, { crf, draft }) {
  if (encoder === 'nvenc') {
    return ['-c:v', 'h264_nvenc', '-preset', draft ? 'p4' : 'p7', '-tune', 'hq', '-rc', 'vbr', '-cq', String(crf),
      '-b:v', '0', '-spatial-aq', '1', '-profile:v', 'high', '-pix_fmt', 'yuv420p'];
  }
  return ['-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'medium', '-tune', 'animation', '-crf', String(crf), '-pix_fmt', 'yuv420p'];
}

// Several Chrome processes take turns at the frames (worker w draws w, w + k, w + 2k, ...), and one
// encoder receives them in order and writes the finished file, sound and chapters included.
export async function video(P, out, { workers = 8, from = 0, to, scale = 1, crf, draft = false, encoder } = {}) {
  const tl = P.timeline(), fps = P.config.fps;
  to = Math.min(to ?? tl.dur, tl.dur);
  const f0 = Math.round(from * fps), f1 = Math.round(to * fps), n = f1 - f0;
  const k = Math.max(1, Math.min(workers, Math.ceil(n / 10)));
  encoder ??= 'x264';
  if (encoder === 'nvenc' && !hasNvenc()) throw new Error('this ffmpeg or GPU has no NVENC; use --encoder x264');
  crf ??= encoder === 'nvenc' ? (draft ? 28 : 19) : (draft ? 26 : 20);
  const tmp = P.file('build', 'render-tmp');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const meta = path.join(tmp, 'chapters.txt');
  chaptersFile(P, tl, from, to, meta);
  const mixWav = P.file('build', 'mix.wav'), audio = fs.existsSync(mixWav);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const enc = imagePipe(['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    ...(audio ? ['-ss', String(f0 / fps), '-t', String(n / fps), '-i', mixWav] : []), '-i', meta,
    '-map', '0:v', ...(audio ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '192k'] : []),
    '-map_metadata', audio ? '2' : '1', '-map_chapters', audio ? '2' : '1',
    ...encoderArgs(encoder, { crf, draft }), '-r', String(fps), '-shortest', '-movflags', '+faststart', out]);

  console.log(`  ${n} frames (${(n / fps).toFixed(1)} s), ${k} Chrome workers, ${encoder}${scale !== 1 ? `, at ${scale}x` : ''}`);
  const started = Date.now(), ready = new Map();
  let next = f0, chain = Promise.resolve(), shown = 0;
  const flush = async () => {
    while (ready.has(next)) {
      const b = ready.get(next);
      ready.delete(next++);
      await enc.write(b);
    }
    const done = next - f0;
    if (done - shown >= n / 40 || done === n) {
      shown = done;
      const secs = (Date.now() - started) / 1000;
      process.stdout.write(`\r  ${done}/${n} frames, ${(done / secs).toFixed(1)} frames/s   `);
    }
  };
  // "capture": "canvas" in video.json: the page encodes its canvas and posts it (fast; canvas only).
  // Otherwise each frame is a page screenshot, which includes HTML layers.
  const canvasOnly = P.config.capture === 'canvas';
  const size = [Math.round(P.config.width * scale), Math.round(P.config.height * scale)];
  const take = (i, jpeg) => { ready.set(i, jpeg); chain = chain.then(flush); };
  const server = await serve(P, { onFrame: take });
  const phase = name => process.env.CLAP_DEBUG && console.log(`\n  [${((Date.now() - started) / 1000).toFixed(1)} s] ${name}`);
  try {
    await Promise.all(Array.from({ length: k }, async (_, w) => {
      const browser = await launch();
      try {
        const page = await openStage(browser, server, P, { scale });
        for (let i = f0 + w; i < f1; i += k) {
          while (i - next > 6 * k) await new Promise(r => setTimeout(r, 5));      // don't run far ahead of the encoder
          if (canvasOnly) await page.evaluate((t, i, size) => window.clap.capture(t, i, size), i / fps, i, size);
          else { await drawFrame(page, i / fps); take(i, await capture(page)); }
        }
        phase(`worker ${w} drew its last frame`);
      } finally { await shutdown(browser); phase(`worker ${w} closed Chrome`); }
    }));
    await chain;
    phase('every frame handed to the encoder');
    await enc.end();
    phase('encoder finished');
  } finally { server.close(); }
  fs.rmSync(tmp, { recursive: true, force: true });
  const secs = (Date.now() - started) / 1000;
  console.log(`\n  wrote ${path.relative(process.cwd(), out)}: ${n} frames in ${secs.toFixed(0)} s (${(n / secs).toFixed(1)} frames/s)`);
}
