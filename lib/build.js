// clap build: lays the video out from timeline.js and the narration, then mixes the soundtrack.
// Writes build/timeline.json (for the page), build/mix.wav and build/captions.srt / .vtt.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readRGB } from './ffmpeg.js';
import { Lay, round3 } from './lay.js';
import { mix } from './mix.js';
import { writeJSON } from './project.js';
import { writeSubtitles } from './subtitles.js';

export async function layout(P) {
  const narration = P.narration();
  const mod = await import(pathToFileURL(P.file(P.config.timeline)).href + '?at=' + Date.now());
  const L = new Lay(narration);
  mod.layout(L);
  const dur = L.close();
  const T = L.T, c = L.cue;
  const unsaid = narration.filter(l => !(l.id in T)).map(l => l.id);
  if (unsaid.length) console.log(`  not said anywhere in timeline.js, so left out: ${unsaid.join(', ')}`);
  const said = narration.filter(l => l.id in T);
  const lines = said.map(l => ({
    id: l.id, text: l.text, ...(l.speaker ? { speaker: l.speaker } : {}), start: round3(T[l.id]), end: round3(T[l.id] + L.spoken(l.id)),
    words: l.words.map(w => ({ w: w.w, s: round3(T[l.id] + w.start), e: round3(T[l.id] + w.end) })),
  }));
  const extras = mod.extras ? await mod.extras({ P, cue: c, T, readRGB }) : {};
  const events = [...(mod.sfx ? mod.sfx(c, L) : []), ...L.events];
  const review = (mod.review ? mod.review(c, L) : []).map(x => Number(x.toFixed(2)));
  const tl = { dur, fps: P.config.fps, scenes: L.scenes, lines, cue: c, ...extras, review };
  return { tl, T, events, narration: said };
}

export async function build(P, { audio = true } = {}) {
  const { tl, T, events, narration } = await layout(P);
  writeJSON(P.file('build', 'timeline.json'), tl);
  writeSubtitles(P, tl);
  let musicPath = null;
  const mj = P.file('build', 'music.json');
  if (fs.existsSync(mj)) musicPath = P.file(JSON.parse(fs.readFileSync(mj, 'utf8')).mp3);
  if (audio) mix(P, { narration, T, events, dur: tl.dur, musicPath });
  for (const s of tl.scenes) console.log(`  ${s.id.padEnd(10)} ${s.start.toFixed(1).padStart(6)} - ${s.end.toFixed(1).padStart(6)}`);
  console.log(`  duration ${tl.dur.toFixed(1)} s (${Math.floor(tl.dur / 60)}:${String(Math.floor(tl.dur % 60)).padStart(2, '0')}), ` +
    `${tl.lines.length} lines, ${Object.keys(tl.cue).length} cues, ${events.length} sounds, music: ${musicPath ? 'yes' : 'none'}` +
    (audio ? '' : ' (mix skipped)'));
  return tl;
}
