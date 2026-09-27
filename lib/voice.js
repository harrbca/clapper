// clap voice: the narration, a voice audition and the music bed, from ElevenLabs.
import fs from 'node:fs';
import path from 'node:path';
import { layout } from './build.js';
import * as el from './eleven.js';
import { decode, SR, writeWav, ffmpeg } from './ffmpeg.js';
import { writeJSON } from './project.js';

const lines = script => script.scenes.flatMap(s => s.lines);
// What ElevenLabs is asked to say. A line may give `say` for the words as spoken ("M M S zero zero
// one") when they differ from `text`, which is what the captions show ("MMS001").
const spokenText = line => line.say ?? line.text;

function pickVoice(script, name) {
  if (!name) return script.voice;
  const v = (script.audition?.voices ?? []).find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!v) throw new Error(`no auditioned voice called ${name}`);
  return v;
}

export async function narration(P, { voice: name } = {}) {
  const S = P.script(), all = lines(S), voice = pickVoice(S, name);
  console.log(`  narrator: ${voice.name}, speed ${S.settings?.speed ?? 1}`);
  const out = [];
  let fresh = 0;
  for (let i = 0; i < all.length; i++) {
    const line = all[i];
    const prev = all.slice(Math.max(0, i - 2), i).map(spokenText).join(' ') || null;
    const next = all[i + 1] ? spokenText(all[i + 1]) : null;
    const request = el.speechRequest({ text: spokenText(line), voice: voice.id, model: S.model, settings: S.settings, previousText: prev, nextText: next });
    const r = await el.speech(P.audio, line.id, request);
    if (r.fresh) { fresh++; console.log(`    new: ${path.basename(r.mp3)} (${request.text.length} characters)`); }
    out.push({ id: line.id, text: line.text, mp3: path.relative(P.root, r.mp3).replace(/\\/g, '/'), words: r.words });
  }
  writeJSON(P.file('build', 'narration.json'), out);
  const speech = out.reduce((s, o) => s + o.words.at(-1).end, 0);
  console.log(`  ${out.length} lines, ${fresh} new, ${speech.toFixed(1)} s of speech`);
  return fresh;
}

export async function audition(P) {
  const S = P.script(), a = S.audition, parts = [];
  const gap = new Float32Array(Math.round(SR * 0.9));
  let fresh = 0;
  for (const v of a.voices) {
    const r = await el.speech(P.audio, 'audition_' + v.name.toLowerCase(), el.speechRequest({ text: a.text, voice: v.id, model: S.model, settings: S.settings }));
    fresh += r.fresh;
    parts.push(decode(r.mp3), gap);
  }
  const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  parts.reduce((o, p) => (all.set(p, o), o + p.length), 0);
  const wav = P.file('build', 'audition.wav');
  writeWav(wav, all);
  ffmpeg('-i', wav, '-c:a', 'libmp3lame', '-b:a', '160k', P.file('out', 'audition.mp3'));
  fs.rmSync(wav);
  console.log('  out/audition.mp3, in order: ' + a.voices.map(v => v.name).join(', '));
  return fresh;
}

// Long enough for the whole video, rounded up to 10 s so small edits reuse the cached track.
export async function music(P) {
  const m = P.script().music;
  if (!m) return 0;
  // The length comes from laying out the narration just said, never from a stale or missing build.
  const { tl } = await layout(P);
  const length = Math.min(300000, Math.ceil((tl.dur + 4) / 10) * 10000);
  const r = await el.music(P.audio, m.prompt, length);
  writeJSON(P.file('build', 'music.json'), { mp3: path.relative(P.root, r.mp3).replace(/\\/g, '/') });
  console.log(`  music: ${path.basename(r.mp3)} (${length / 1000} s)${r.fresh ? ', new' : ''}`);
  return r.fresh ? 1 : 0;
}

// Word timings estimated from the text, as a narrator at the script's speed might say it, with no
// audio. Enough to lay out and animate a whole video before paying for the voice.
export function draftNarration(P) {
  const S = P.script(), speed = S.settings?.speed ?? 1, out = [];
  for (const line of lines(S)) {
    let t = 0;
    const words = spokenText(line).split(/\s+/).filter(Boolean).map(w => {
      const d = (0.12 + 0.062 * w.replace(/[^\w]/g, '').length) / speed, start = t;
      t += d + (/[.!?]$/.test(w) ? 0.34 : /[,;:]$/.test(w) ? 0.18 : 0.04) / speed;
      return { w, start: Number(start.toFixed(3)), end: Number((start + d).toFixed(3)) };
    });
    // Captions show `text`; when `say` differs, spread its words over the same time.
    const shown = line.text.split(/\s+/).filter(Boolean), end = words.at(-1).end;
    const timed = line.say ? shown.map((w, i) => ({ w, start: Number((end * i / shown.length).toFixed(3)), end: Number((end * (i + 1) / shown.length).toFixed(3)) })) : words;
    out.push({ id: line.id, text: line.text, mp3: null, draft: true, words: timed });
  }
  writeJSON(P.file('build', 'narration.json'), out);
  console.log(`  draft narration: ${out.length} lines, ${out.reduce((s, o) => s + o.words.at(-1).end, 0).toFixed(1)} s, estimated from the text (no sound)`);
}

export async function voice(P, opts) {
  if (opts.draft) return draftNarration(P);
  let fresh = await narration(P, opts);
  if (opts.audition) fresh += await audition(P);
  if (opts.music) fresh += await music(P);
  if (fresh) {
    try {
      const u = await el.usage();
      console.log(`  ElevenLabs this period: ${u.used.toLocaleString()} of ${u.limit.toLocaleString()} characters (the counter can lag)`);
    } catch (e) { console.log('  (could not read ElevenLabs usage: ' + e.message + ')'); }
  } else console.log('  everything was cached: no ElevenLabs credits used');
}
