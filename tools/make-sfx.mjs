// The kit's sound effects, synthesised, so every project has them without licensing anything:
//   node tools/make-sfx.mjs   -> sfx/*.wav
// A project's own assets/sfx/<name>.wav takes precedence over these.
import path from 'node:path';
import { KIT } from '../lib/project.js';
import { SR, writeWav } from '../lib/ffmpeg.js';

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const len = ms => Math.round((SR * ms) / 1000);
const buf = ms => new Float32Array(len(ms));

// One-pole filters, run twice for a steeper slope.
function lowpass(x, hz) {
  const a = Math.exp((-2 * Math.PI * hz) / SR), y = new Float32Array(x.length);
  for (let pass = 0, src = x; pass < 2; pass++, src = y.slice()) {
    let p = 0;
    for (let i = 0; i < x.length; i++) y[i] = p = (1 - a) * src[i] + a * p;
  }
  return y;
}
const highpass = (x, hz) => { const l = lowpass(x, hz); return x.map((v, i) => v - l[i]); };
const band = (x, lo, hi) => lowpass(highpass(x, lo), hi);
const noise = ms => buf(ms).map(rand);
const decay = (x, rate) => x.map((v, i) => v * Math.exp((-i / SR) * rate));
const ramp = (x, ms = 3) => { const n = Math.min(len(ms), x.length >> 1); return x.map((v, i) => v * Math.min(1, i / n, (x.length - 1 - i) / n)); };
const gain = (x, g) => x.map(v => v * g);
const mixIn = (a, b, at = 0) => { const o = a.slice(); b.forEach((v, i) => { if (i + at < o.length) o[i + at] += v; }); return o; };
const normalize = (x, peak = 0.7) => { const m = x.reduce((s, v) => Math.max(s, Math.abs(v)), 0) || 1; return x.map(v => (v / m) * peak); };

// A sine whose frequency glides from f0 to f1.
function glide(ms, f0, f1, curve = 1) {
  const x = buf(ms);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const k = Math.pow(i / x.length, curve);
    ph += (2 * Math.PI * (f0 + (f1 - f0) * k)) / SR;
    x[i] = Math.sin(ph);
  }
  return x;
}
const tone = (ms, f) => glide(ms, f, f);

const S = {
  // a bubble pop: a quick falling sine with a click on top
  pop: () => normalize(ramp(mixIn(decay(glide(110, 880, 260, 0.6), 38), gain(decay(band(noise(10), 2000, 7000), 400), 0.3))), 0.6),
  // a UI click: a very short bright tick
  click: () => normalize(ramp(decay(band(noise(16), 2500, 7000), 380), 1), 0.55),
  // a softer tap on glass
  tap: () => normalize(ramp(decay(band(noise(30), 700, 3500), 230), 1), 0.45),
  // a keyboard key: a click and a small thump
  key: () => normalize(ramp(mixIn(decay(band(noise(22), 1200, 5000), 260), gain(decay(tone(40, 140), 90), 0.5))), 0.5),
  // air moving past: band noise swelling and falling
  whoosh: () => {
    const x = band(noise(520), 250, 2600);
    return normalize(ramp(x.map((v, i) => v * Math.pow(Math.sin((Math.PI * i) / x.length), 2.2)), 10), 0.5);
  },
  // a rising whoosh for things flying in
  swoosh: () => {
    const x = noise(380), y = new Float32Array(x.length);
    let p = 0;
    for (let i = 0; i < x.length; i++) {
      const hz = 300 + 3500 * Math.pow(i / x.length, 1.4), a = Math.exp((-2 * Math.PI * hz) / SR);
      y[i] = p = (1 - a) * x[i] + a * p;
    }
    return normalize(ramp(highpass(y, 200).map((v, i) => v * Math.sin((Math.PI * i) / y.length)), 8), 0.5);
  },
  // a soft two-note chime, for success
  chime: () => {
    const a = decay(mixIn(tone(900, 1046.5), gain(tone(900, 2093), 0.25)), 5);
    const b = decay(mixIn(tone(800, 1568), gain(tone(800, 3136), 0.2)), 5.5);
    return normalize(ramp(mixIn(mixIn(buf(1000), a), b, len(110)), 4), 0.45);
  },
  // a low, soft thud, for something landing
  thud: () => normalize(ramp(mixIn(decay(glide(180, 120, 55), 22), gain(decay(band(noise(60), 80, 900), 70), 0.4)), 2), 0.7),
  // a small high tick, for counters and steps
  tick: () => normalize(ramp(decay(tone(40, 3200), 120), 2), 0.35),
  // a small robot's chirp: two quick rising notes, a little square-ish
  bleep: () => {
    const note = (ms, f0, f1) => ramp(glide(ms, f0, f1).map(v => Math.tanh(v * 2.2)), 4);
    return normalize(mixIn(mixIn(buf(260), decay(note(90, 900, 1400), 6)), decay(note(110, 1300, 2100), 6), len(120)), 0.4);
  },
  // and its downward reply
  boop: () => normalize(ramp(decay(glide(200, 700, 380).map(v => Math.tanh(v * 2)), 7), 5), 0.4),
  // a clapperboard: the wooden sticks snapping shut, bright crack over a short knock
  clap: () => {
    const crack = decay(band(noise(90), 1500, 7000), 70);
    const body = mixIn(gain(decay(tone(120, 920), 45), 0.5), gain(decay(tone(90, 2250), 60), 0.25));
    const knock = gain(decay(glide(80, 190, 110), 40), 0.6);
    return normalize(ramp(mixIn(mixIn(crack, body), knock), 1), 0.8);
  },
  // a wrong-answer buzz
  buzz: () => normalize(ramp(decay(mixIn(mixIn(tone(420, 220), tone(420, 233)), gain(tone(420, 110), 0.6)), 3), 10), 0.4),
};

for (const [name, make] of Object.entries(S)) {
  const x = make(), file = path.join(KIT, 'sfx', `${name}.wav`);
  writeWav(file, x);
  console.log(`  sfx/${name}.wav  ${Math.round((x.length / SR) * 1000)} ms`);
}
