// The stage: a canvas with an HTML overlay above it, at the video's size. In render mode
// (?render=1) the renderer calls window.clap.frame(t) and screenshots the page; otherwise this is
// the preview player, in sync with build/mix.wav, reloading itself when the project changes.
import { loadFonts } from './assets.js';
import { FPS, H, TL, VIDEO, W, sceneAt } from './timeline.js';

const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search);
const RENDER = q.has('render');
const canvas = $('canvas'), overlay = $('overlay'), el = $('stage');

// With "hidpi": true in video.json the canvas has more pixels than the video (for 2x renders and
// sharp previews), and stage.reset() puts the scale back at the start of each frame.
const dpr = VIDEO.hidpi ? (RENDER ? parseFloat(q.get('scale') || '1') : Math.min(2, devicePixelRatio || 1)) : 1;
canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
for (const e of [el, canvas, overlay]) { e.style.width = W + 'px'; e.style.height = H + 'px'; }
document.body.style.background = RENDER ? VIDEO.background : '';
el.style.background = VIDEO.background;
if (RENDER) document.body.classList.add('render');

const ctx = canvas.getContext('2d');
export const stage = {
  W, H, dpr, canvas, ctx, overlay, video: VIDEO, TL,
  // Every frame starts from the background colour, so nothing from the last frame can show through.
  reset() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = VIDEO.background; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },
};

function banner(text, kind = 'error') {
  const b = $('banner');
  b.textContent = text; b.className = kind; b.hidden = !text;
}

// Motion blur: "motionBlur": { "samples": 8, "shutter": 0.5 } in video.json averages that many
// moments across half a frame's time, as a film camera's shutter does. A scene may export
// motionBlur(t) returning the samples for that frame (1 for none), so still shots stay cheap.
// Off in the preview unless the page is opened with ?blur=1.
const MB = { samples: 1, shutter: 0.5, ...(VIDEO.motionBlur || {}) };
let acc = null;

let render;
try {
  await loadFonts(VIDEO.fonts);
  const entry = q.get('entry') || VIDEO.entry;
  const mod = await import('/' + entry);
  if (!mod.render) throw new Error(`${entry} does not export render(stage, t)`);
  if (mod.setup) await mod.setup(stage);
  const once = async t => { stage.reset(); await mod.render(stage, t); };
  render = async t => {
    const n = RENDER || q.has('blur') ? Math.max(1, Math.round(mod.motionBlur ? mod.motionBlur(t) ?? MB.samples : MB.samples)) : 1;
    if (n === 1) return once(t);
    acc ??= Object.assign(document.createElement('canvas'), { width: canvas.width, height: canvas.height });
    const a = acc.getContext('2d');
    for (let s = 0; s < n; s++) {
      await once(t + ((s + 0.5) / n - 0.5) * (MB.shutter / FPS));
      a.globalAlpha = 1 / (s + 1);                 // a running average of the samples
      a.drawImage(canvas, 0, 0);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(acc, 0, 0);
  };
  window.clap = { ready: true, dur: TL.dur, fps: FPS, frame: render, capture };
} catch (e) {
  window.clap = { failed: String(e && e.stack || e) };
  banner(String(e && e.stack || e));
  throw e;
}

if (!RENDER) player();

// Canvas capture, for projects that draw only on the canvas: the page encodes frame i itself and
// posts the JPEG to the renderer, which is several times faster than a page screenshot. `size` is the
// output width and height in pixels.
let small = null;
async function capture(t, i, [w, h], quality = 0.93) {
  await render(t);
  let src = canvas;
  if (w !== canvas.width || h !== canvas.height) {
    small ??= Object.assign(document.createElement('canvas'), { width: w, height: h });
    const g = small.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(canvas, 0, 0, w, h);
    src = small;
  }
  const blob = await new Promise(r => src.toBlob(r, 'image/jpeg', quality));
  const res = await fetch(`/@frame?i=${i}`, { method: 'POST', body: blob });
  if (!res.ok) throw new Error(`the renderer did not take frame ${i}: HTTP ${res.status}`);
}

function player() {
  const audio = $('audio'), play = $('play'), seek = $('seek'), clock = $('clock'), scenes = $('scenes'), hud = $('hud');
  const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
  audio.src = '/build/mix.wav';
  seek.max = TL.dur;
  scenes.innerHTML = TL.scenes.map(s => `<option value="${s.start}">${s.id}  ${fmt(s.start)}</option>`).join('');

  let t = 0, drawn = -1, busy = false, dragging = false;
  try { t = parseFloat(sessionStorage.getItem('clap-t') || q.get('t') || '0') || 0; } catch { /* storage may be off */ }
  const go = x => { t = Math.max(0, Math.min(TL.dur, x)); audio.currentTime = t; };
  go(t);

  const fit = () => {
    const box = $('wrap').getBoundingClientRect();
    el.style.transform = `scale(${Math.min(box.width / W, box.height / H)})`;
  };
  addEventListener('resize', fit); fit();

  play.onclick = () => (audio.paused ? audio.play() : audio.pause());
  audio.onplay = () => (play.textContent = 'Pause');
  audio.onpause = () => (play.textContent = 'Play');
  seek.oninput = () => { dragging = true; go(+seek.value); };
  seek.onchange = () => (dragging = false);
  scenes.onchange = () => go(+scenes.value);
  $('rate').onchange = e => (audio.playbackRate = +e.target.value);
  $('debug').onchange = e => (hud.hidden = !e.target.checked);

  // Notes: N (or the Note button) writes a note on this frame. The preview keeps them in notes.json
  // in the project, and clap notes lists them for whoever works on the video next.
  const box = $('notebox'), text = $('notetext');
  let notes = [];
  const loadNotes = () => fetch('/@notes', { cache: 'no-store' }).then(r => (r.ok ? r.json() : [])).then(n => (notes = n)).catch(() => {});
  loadNotes();
  const openNote = () => {
    audio.pause();
    const s = sceneAt(t);
    Object.assign(box.dataset, { t, scene: s.id });
    $('notewhere').textContent = `${s.id} · ${fmt(t)} · frame ${Math.round(t * FPS)}`;
    box.hidden = false; text.value = ''; text.focus();
  };
  const closeNote = () => { box.hidden = true; text.blur(); };
  $('note').onclick = openNote;
  $('notecancel').onclick = closeNote;
  text.onkeydown = e => { if (e.key === 'Escape') { e.preventDefault(); closeNote(); } };
  box.onsubmit = async e => {
    e.preventDefault();
    const words = text.value.trim();
    if (!words) return;
    const at = Number(box.dataset.t);
    try {
      const r = await fetch('/@notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scene: box.dataset.scene, t: at, frame: Math.round(at * FPS), text: words }) });
      const saved = await r.json();
      if (!r.ok) throw new Error(saved.error || `HTTP ${r.status}`);
      closeNote();
      banner(`Note ${saved.id} saved at ${fmt(at)}: clap notes lists it`, 'info');
      setTimeout(() => banner(''), 2500);
      loadNotes();
    } catch (err) {
      banner(`The note wasn't saved: ${err.message}${/404/.test(err.message) ? ' (notes need clap preview)' : ''}`);
    }
  };

  addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    const step = { ArrowRight: e.shiftKey ? 1 : 5, ArrowLeft: e.shiftKey ? -1 : -5, '.': 1 / FPS, ',': -1 / FPS }[e.key];
    if (e.code === 'Space') { e.preventDefault(); play.click(); }
    else if (step) { e.preventDefault(); go(t + step); }
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(TL.dur - 0.01);
    else if (e.key === 'd' || e.key === 'D') { const d = $('debug'); d.checked = !d.checked; d.onchange({ target: d }); }
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openNote(); }
    else if (e.key === '[' || e.key === ']') {
      const i = TL.scenes.indexOf(sceneAt(t)) + (e.key === ']' ? 1 : -1);
      if (TL.scenes[i]) go(TL.scenes[i].start);
    }
  });

  const cueNames = Object.entries(TL.cue).sort((a, b) => a[1] - b[1]);
  const hudText = () => {
    const s = sceneAt(t), ln = TL.lines.find(l => t >= l.start - 0.15 && t < l.end + 0.5);
    const near = cueNames.filter(([, v]) => Math.abs(v - t) < 3).map(([k, v]) => `${v < t ? '  ' : '> '}${k.padEnd(14)} ${fmt(v)}  ${(v - t >= 0 ? '+' : '') + (v - t).toFixed(2)}`);
    const noted = notes.filter(n => n.status === 'open' && Math.abs(n.t - t) < 3).map(n => `  note ${n.id} at ${fmt(n.t)}: ${n.text.length > 44 ? n.text.slice(0, 43) + '…' : n.text}`);
    return `t ${t.toFixed(3)}   frame ${Math.round(t * FPS)}   scene ${s.id}\n${ln ? `line ${ln.id}: ${ln.text}\n` : ''}${[...near, ...noted].join('\n')}`;
  };

  const loop = async () => {
    if (!audio.paused) t = audio.currentTime;
    if (!dragging) seek.value = t;
    const s = sceneAt(t);
    if ($('loop').checked && !audio.paused && t >= s.end - 0.02) go(sceneAt(Math.max(0, s.end - 0.05)).start);
    if (t !== drawn && !busy) {
      busy = true;
      try { await render(t); drawn = t; } catch (e) { banner(String(e && e.stack || e)); audio.pause(); } finally { busy = false; }
    }
    clock.textContent = `${fmt(t)}  f ${Math.round(t * FPS)}`;
    if (document.activeElement !== scenes) scenes.value = String(s.start);    // the menu follows the playhead
    if (!hud.hidden) hud.textContent = hudText();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // Live reload: the preview server says when scenes, assets or the build change.
  const events = new EventSource('/@events');
  events.addEventListener('reload', () => { try { sessionStorage.setItem('clap-t', String(t)); } catch { /* ignore */ } location.reload(); });
  events.addEventListener('building', () => banner('rebuilding the timeline...', 'info'));
  events.addEventListener('failed', e => banner(JSON.parse(e.data).message));
}
