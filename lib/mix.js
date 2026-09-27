// The soundtrack: narration and sound effects placed on the timeline, the music bed ducked under the
// voice, then the whole mix normalised to the project's loudness, in float32.
import fs from 'node:fs';
import { decode, ffmpeg, SR, writeWav } from './ffmpeg.js';

const f32 = Math.fround;

function place(track, clip, t0, gain = 1, channels = 1) {
  const s = Math.round(t0 * SR) * channels;
  if (s >= track.length) return;
  const e = Math.min(track.length, s + clip.length), g = f32(gain);
  for (let i = Math.max(0, s); i < e; i++) track[i] = f32(track[i] + f32(clip[i - s] * g));
}

// Music gain: 1 in silence, sinking by `depth` while the narrator speaks (40 ms attack, 450 ms release).
export function duck(voice, depth = 0.6) {
  const hop = Math.trunc(0.01 * SR), frames = Math.trunc(voice.length / hop) + 1;
  const level = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) { const v = i < voice.length ? voice[i] : 0; sum += v * v; }
    level[f] = Math.min(1, Math.max(0, Math.sqrt(sum / hop) / 0.03));
  }
  const up = 1 - Math.exp(-1 / 4), down = 1 - Math.exp(-1 / 45);
  const smooth = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    const prev = i ? smooth[i - 1] : 0, x = level[i];
    smooth[i] = prev + (x - prev) * (x > prev ? up : down);
  }
  const gain = new Float32Array(voice.length);
  for (let i = 0; i < voice.length; i++) {
    const f = Math.min(frames - 1, Math.floor(i / hop)), k = (i - f * hop) / hop;
    const a = 1 - depth * smooth[f], b = 1 - depth * smooth[Math.min(frames - 1, f + 1)];
    gain[i] = f + 1 < frames ? a + (b - a) * k : a;
  }
  return gain;
}

// Stereo music trimmed to n frames, or looped with a 2 s crossfade if it is too short.
function fitMusic(m, n) {
  const xf = 2 * SR;
  let out = m;
  while (out.length / 2 < n) {
    const next = new Float32Array(out.length + m.length - xf * 2);
    next.set(out);
    const o = out.length - xf * 2;
    for (let i = 0; i < xf; i++) {
      const k = i / (xf - 1);
      for (let c = 0; c < 2; c++) next[o + i * 2 + c] = out[o + i * 2 + c] * (1 - k) + m[i * 2 + c] * k;
    }
    next.set(m.subarray(xf * 2), out.length);
    out = next;
  }
  return out.subarray(0, n * 2);
}

export function mix(P, { narration, T, events, dur, musicPath }) {
  const n = Math.trunc(dur * SR);
  const voice = new Float32Array(n);
  for (const line of narration) if (line.mp3) place(voice, decode(P.file(line.mp3)), T[line.id]);   // draft lines have no sound
  const fx = new Float32Array(n), clips = {};
  for (const [name, t0, gain] of events) place(fx, (clips[name] ??= decode(P.sfx(name))), t0, gain);
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) out[i * 2] = out[i * 2 + 1] = f32(voice[i] + fx[i]);
  if (musicPath) {
    const m = fitMusic(decode(musicPath, { channels: 2 }), n);
    let sum = 0;
    for (let i = 0; i < m.length; i++) sum += m[i] * m[i];
    const norm = 0.05 / (Math.sqrt(sum / m.length) + 1e-9);         // about -26 dBFS RMS before ducking
    const env = duck(voice), fi = Math.trunc(1.5 * SR), fo = Math.trunc(3.0 * SR);
    for (let i = 0; i < n; i++) {
      const e = i >= n - fo ? 1 - (i - (n - fo)) / (fo - 1) : i < fi ? i / (fi - 1) : 1;
      const g = e * env[i] * norm;
      out[i * 2] = f32(out[i * 2] + m[i * 2] * g);
      out[i * 2 + 1] = f32(out[i * 2 + 1] + m[i * 2 + 1] * g);
    }
  }
  const raw = P.file('build', 'mix_raw.wav');
  writeWav(raw, out, { channels: 2 });
  const L = P.config.loudness;
  ffmpeg('-i', raw, '-af', `loudnorm=I=${L}:TP=-1.5:LRA=11`, '-ar', String(SR), '-ac', '2', P.file('build', 'mix.wav'));
  fs.rmSync(raw);
}
