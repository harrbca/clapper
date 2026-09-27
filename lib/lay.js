// The timeline: a cursor through the video. Lines are said one after another, and cues land on
// words, so re-voicing a line moves every beat keyed to it. A project's timeline.js drives this.

const bare = w => w.toLowerCase().replace(/^[.,!?;:"']+|[.,!?;:"']+$/g, '');
export const round3 = x => Number(x.toFixed(3));

export class Lay {
  constructor(narration) {
    this.N = Object.fromEntries(narration.map(l => [l.id, l]));
    this.t = 0;
    this.T = {};          // when each line starts
    this.cue = {};        // named moments
    this.scenes = [];
    this.events = [];     // sound effects: [name, time, gain]
  }

  line(id) {
    const l = this.N[id];
    if (!l) throw new Error(`no line called ${id} in the narration (run clap voice?)`);
    return l;
  }

  // How long a line takes to say.
  spoken(id) { return this.line(id).words.at(-1).end; }

  // When a word starts (or ends) within its line, in seconds from the line's start. The word is
  // matched without its punctuation ('pip' for "Pip."); `nth` picks which one when it comes up more
  // than once (1 is the first, -1 the last).
  word(id, needle, edge = 'start', nth = 1) {
    const hits = this.line(id).words.filter(x => bare(x.w) === needle.toLowerCase());
    const w = nth > 0 ? hits[nth - 1] : hits[hits.length + nth];
    if (!w) throw new Error(`${JSON.stringify(needle)}${nth !== 1 ? ` (${nth})` : ''} is not a word in line ${id}: ${this.line(id).words.map(x => x.w).join(' ')}`);
    return w[edge];
  }

  scene(id) {
    if (this.scenes.length) this.scenes.at(-1).end = round3(this.t);
    this.scenes.push({ id, start: round3(this.t) });
  }

  // Say a line `gap` seconds after the last thing ended, or exactly `at`.
  say(id, { gap = 0.35, at } = {}) {
    const start = at === undefined ? this.t + gap : at;
    this.T[id] = start;
    this.t = Math.max(this.t, start + this.spoken(id));
    return start;
  }

  // The time a word is said, in the video.
  w(id, needle, edge = 'start', nth = 1) {
    if (!(id in this.T)) throw new Error(`line ${id} has not been said yet`);
    return this.T[id] + this.word(id, needle, edge, nth);
  }

  at(name, time) {
    this.cue[name] = round3(time);
    this.t = Math.max(this.t, time);
    return time;
  }

  pause(d) { this.t += d; }

  sfx(name, time, gain = 1) { this.events.push([name, time, gain]); }

  close() {
    this.scenes.at(-1).end = round3(this.t);
    return Number(this.t.toFixed(2));
  }
}
