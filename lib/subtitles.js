// Caption files from the narration, timed as the on-screen captions are: each line from when it is
// said until 0.9 s after, or until the next line starts.
import fs from 'node:fs';

const stamp = (t, sep) => {
  const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`;
};

// At most two rows of about 42 characters, split where the rows come out most even.
function rows(text, max = 42) {
  if (text.length <= max) return text;
  const words = text.split(' ');
  let best = text, score = Infinity;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
    const s = Math.max(a.length, b.length);
    if (s < score) { score = s; best = `${a}\n${b}`; }
  }
  return best;
}

export function cues(tl) {
  return tl.lines.map((l, i) => {
    const next = tl.lines[i + 1];
    return { start: l.start, end: Math.min(next ? next.start - 0.1 : Infinity, l.end + 0.9, tl.dur), text: rows(l.text) };
  });
}

export function writeSubtitles(P, tl) {
  const c = cues(tl);
  fs.writeFileSync(P.file('build', 'captions.srt'),
    c.map((x, i) => `${i + 1}\n${stamp(x.start, ',')} --> ${stamp(x.end, ',')}\n${x.text}\n`).join('\n'));
  fs.writeFileSync(P.file('build', 'captions.vtt'),
    'WEBVTT\n\n' + c.map(x => `${stamp(x.start, '.')} --> ${stamp(x.end, '.')}\n${x.text}\n`).join('\n'));
}
