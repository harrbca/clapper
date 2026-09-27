#!/usr/bin/env node
// clap: narrated, animated videos drawn in a browser. Run it inside a project folder (one with
// video.json in it), or pass --project <folder>.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { build } from '../lib/build.js';
import { chromePath } from '../lib/browser.js';
import { KIT, loadProject } from '../lib/project.js';
import { sheets, stills, video } from '../lib/render.js';
import { serve } from '../lib/server.js';
import { voice } from '../lib/voice.js';

const HELP = `clap <command> [options]

  new <folder>                 start a project from the starter template
  voice [--voice NAME]         narration from ElevenLabs, with word timings (cached in audio/)
        [--audition] [--music] also a voice audition (out/audition.mp3) and the music bed
        [--draft]              no ElevenLabs: timings estimated from the text, and no sound, to lay
                               a video out before paying for the voice
  build [--no-audio]           timeline, captions and the mix -> build/
  preview [--port 4173] [--open]
                               the live player; reloads when scenes or assets change, and
                               rebuilds when timeline.js does
  still <time>...              full-size PNGs -> out/stills. A time is seconds, a cue, a scene or
                               a line id, optionally with an offset: 12.5, title, intro+2, hello-0.1
  sheet [name] [time...]       2x2 contact sheets (default: the timeline's review list)
  render [out.mp4] [--workers 8] [--from s] [--to s] [--scale 0.5|2] [--draft] [--encoder nvenc|x264]
                               the video, with the mix and chapters. --draft: half size, fast.
                               x264 by default; --encoder nvenc uses an NVIDIA GPU
  doctor                       check ffmpeg, Chrome and the ElevenLabs key
`;

const FLAGS = new Set(['audition', 'music', 'open', 'draft', 'no-audio', 'help']);
const args = process.argv.slice(2), pos = [], opt = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!a.startsWith('--')) { pos.push(a); continue; }
  const [k, v] = a.slice(2).split('=');
  if (v !== undefined) opt[k] = v;
  else if (FLAGS.has(k)) opt[k] = true;
  else opt[k] = args[++i];
}
const cmd = pos.shift();
const project = () => loadProject(opt.project || process.cwd());
const num = (x, d) => (x === undefined ? d : Number(x));

const commands = {
  async new() {
    const dir = path.resolve(pos[0] || fail('clap new <folder>'));
    if (fs.existsSync(dir) && fs.readdirSync(dir).length) fail(`${dir} is not empty`);
    fs.cpSync(path.join(KIT, 'templates', 'starter'), dir, { recursive: true });
    console.log(`  made ${dir}\n  next: cd there, edit script.json, then clap voice, clap build, clap preview`);
  },
  voice: () => voice(project(), { voice: opt.voice, audition: opt.audition, music: opt.music, draft: opt.draft }),
  build: () => build(project(), { audio: !opt['no-audio'] }),
  still: () => stills(project(), pos.length ? pos : fail('clap still <time>...'), { scale: num(opt.scale, 1) }),
  sheet: () => sheets(project(), pos.shift() || 'review', pos),
  async render() {
    const P = project();
    const draft = opt.draft;
    const out = path.resolve(pos[0] || P.file('out', draft ? 'draft.mp4' : 'video.mp4'));
    await video(P, out, {
      workers: num(opt.workers, 8), from: num(opt.from, 0), to: opt.to === undefined ? undefined : Number(opt.to),
      scale: num(opt.scale, draft ? 0.5 : 1), draft, encoder: opt.encoder, crf: opt.crf === undefined ? undefined : Number(opt.crf),
    });
  },
  async preview() {
    const P = project();
    const server = await serve(P, { port: num(opt.port, 4173) });
    const url = `${server.url}/@kit/stage.html`;
    console.log(`  preview: ${url}\n  Space plays, arrows skip (Shift: 1 s), , and . step a frame, [ ] jump scenes, D shows cues. Ctrl+C stops.`);
    if (opt.open) spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    let timer = null, building = false, pending = new Set();
    const settle = async () => {
      const files = [...pending]; pending = new Set();
      if (files.some(f => f === P.config.timeline || f === 'video.json')) {
        if (building) return;
        building = true;
        server.notify('building');
        try { await build(P, { audio: true }); server.notify('reload'); }
        catch (e) { console.log('  build failed: ' + e.message); server.notify('failed', { message: 'clap build failed:\n' + e.message }); }
        finally { building = false; }
      } else if (files.some(f => f === P.config.script)) {
        console.log('  script.json changed: run clap voice, then the preview rebuilds');
      } else if (files.some(f => !f.startsWith('build/') || /^build\/(timeline\.json|mix\.wav)$/.test(f))) {
        if (!building) server.notify('reload');
      }
    };
    fs.watch(P.root, { recursive: true }, (_, name) => {
      if (!name) return;
      const f = name.replace(/\\/g, '/');
      if (/^(out|audio|node_modules|\.git)\//.test(f) || /^build\/(render|sheet)-tmp/.test(f)) return;
      pending.add(f);
      clearTimeout(timer);
      timer = setTimeout(settle, 250);
    });
    await new Promise(() => {});
  },
  doctor() {
    const check = (name, fn) => { try { console.log(`  ok    ${name}: ${fn()}`); } catch (e) { console.log(`  MISSING ${name}: ${e.message}`); } };
    check('node', () => process.version);
    check('ffmpeg', () => spawnSync('ffmpeg', ['-version']).stdout.toString().split('\n')[0]);
    check('ffprobe', () => spawnSync('ffprobe', ['-version']).stdout.toString().split('\n')[0]);
    check('Chrome', chromePath);
    const key = process.env.ELEVENLABS_KEY_FILE || path.join(process.env.USERPROFILE || process.env.HOME || '', 'elevenlabs-key.txt');
    check('ElevenLabs key', () => { if (!fs.existsSync(key)) throw new Error(`no ${key}`); return key; });
  },
};

function fail(msg) { console.error(msg); process.exit(1); }

if (!cmd || opt.help || !commands[cmd]) { console.log(HELP); process.exit(cmd && !commands[cmd] ? 1 : 0); }
try { await commands[cmd](); }
catch (e) { console.error('clap ' + cmd + ': ' + (e.stack || e.message)); process.exit(1); }
