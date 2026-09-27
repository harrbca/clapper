// The project's settings (video.json) and the laid-out timeline (build/timeline.json), for the page.
// Modules that import this wait until both have loaded.
const get = async url => {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}${url.includes('build/') ? ' (run clap build)' : ''}`);
  return r.json();
};

export const VIDEO = {
  fps: 30, width: 1920, height: 1080, background: '#000000', entry: 'scenes/index.js', fonts: [], hidpi: false,
  ...(await get('/video.json')),
};
export const TL = await get('/build/timeline.json');
export const cue = TL.cue;
export const W = VIDEO.width, H = VIDEO.height, FPS = VIDEO.fps;

export const line = id => TL.lines.find(l => l.id === id);
export const scene = id => TL.scenes.find(s => s.id === id);
export const sceneAt = t => TL.scenes.find(s => t >= s.start && t < s.end) || TL.scenes[TL.scenes.length - 1];
