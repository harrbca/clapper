// ffmpeg and audio buffers. Audio is float32 at 48 kHz; stereo is interleaved L, R, L, R.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const SR = 48000;

export function run(cmd, args, { quiet = false } = {}) {
  const r = spawnSync(cmd, args, { stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit', maxBuffer: 1 << 30 });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} exited ${r.status}${quiet ? ': ' + r.stderr.toString().slice(-600) : ''}`);
  return r;
}

export const ffmpeg = (...args) => run('ffmpeg', ['-y', '-v', 'error', ...args]);

// Any file ffmpeg can read, as float32 samples.
export function decode(file, { sr = SR, channels = 1 } = {}) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', String(channels), '-ar', String(sr), '-'],
    { maxBuffer: 2 ** 33 });
  if (r.status !== 0) throw new Error(`could not decode ${file}: ${r.stderr}`);
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

// 16-bit PCM WAV. Samples are clipped to [-1, 1] and truncated, as numpy's astype does.
export function writeWav(file, data, { sr = SR, channels = 1 } = {}) {
  const n = data.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * channels * 2, 28); buf.writeUInt16LE(channels * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = data[i] > 1 ? 1 : data[i] < -1 ? -1 : data[i];
    buf.writeInt16LE(Math.trunc(Math.fround(v * 32767)), 44 + i * 2);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}

export function duration(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { quiet: true });
  return parseFloat(r.stdout.toString());
}

// An image as 8-bit RGB: { width, height, data } with data[(y * width + x) * 3 + channel].
export function readRGB(file) {
  const probe = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { quiet: true });
  const [width, height] = probe.stdout.toString().trim().split(',').map(Number);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`could not read ${file}: ${r.stderr}`);
  return { width, height, data: r.stdout };
}

// An ffmpeg process that takes a stream of images on stdin. Returns { write(buffer), end() }.
export function imagePipe(args) {
  const p = spawn('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
  return {
    async write(b) { if (!p.stdin.write(b)) await new Promise(r => p.stdin.once('drain', r)); },
    async end() { p.stdin.end(); await done; },
  };
}
