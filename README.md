# Clapper

Narrated, animated videos drawn in code. A clapperboard syncs sound to picture, and that is the
job here: the narration is generated first, with the time of every word, and the animation is keyed
to those words. Re-voice a line and everything that happens on it moves with it.

Each frame is a pure function of time, drawn in a browser canvas (with an optional HTML layer), so a
frame looks the same whether it plays live in the preview or renders offline, in any order, on any
number of Chrome processes at once.

## What it does

- **Voice:** ElevenLabs narration with word timings, cached by request so re-runs cost nothing.
  `say` lets a line be spoken differently from how it is captioned ("M M S zero zero one" / "MMS001").
  `--draft` estimates the timings from the text instead, to lay a video out before paying for it.
- **Timeline:** `timeline.js` places the lines and names moments ("cues") on their words.
- **Sound:** the narration, sound effects placed at cues, and a music bed that ducks under the voice,
  mixed and normalised to a loudness target. Ten synthesised effects come with the kit.
- **Preview:** a live player in sync with the mix. It reloads when a scene changes, and rebuilds
  when the timeline does.
- **Render:** MP4 with the soundtrack and chapter markers, plus SRT and VTT captions. The whole
  3-minute 1080p video renders in about 30 s on an i9.

## Setup

Needs Node 20+, ffmpeg and ffprobe on the PATH, and Chrome (or Edge). For narration, an ElevenLabs
key in `%USERPROFILE%\elevenlabs-key.txt` (or wherever `ELEVENLABS_KEY_FILE` points).

    npm install
    node bin/clap.js doctor

`npm link` puts `clap` on the PATH; otherwise run `node <this folder>/bin/clap.js`.

## Making a video

    clap new my-video && cd my-video
    clap voice --draft          # estimated timings, no sound, no credits
    clap build
    clap preview --open
    clap voice                  # the real narration
    clap build
    clap render                 # out/video.mp4

| command | what it does |
|---|---|
| `clap voice [--voice NAME] [--audition] [--music] [--draft]` | narration (and a voice audition, and the music bed) from ElevenLabs |
| `clap build [--no-audio]` | `build/timeline.json`, `build/mix.wav`, `build/captions.srt` and `.vtt` |
| `clap preview [--port 4173] [--open]` | the live player. Space plays, arrows skip (Shift: 1 s), `,` `.` step a frame, `[` `]` jump scenes, D shows cues |
| `clap still <time>...` | full-size PNGs in `out/stills` |
| `clap sheet [name] [time...]` | 2x2 contact sheets; by default of the timeline's review list |
| `clap render [out.mp4] [--draft] [--scale 2] [--from s] [--to s] [--workers 8] [--encoder x264\|nvenc]` | the video. `--draft` is half size and fast; `--scale 2` is 4K when the project is `hidpi` |
| `clap doctor` | checks ffmpeg, Chrome and the ElevenLabs key |

A time is seconds, a cue, a scene or a line id, with an optional offset: `12.5`, `title`, `intro+2`, `hello-0.1`.

## A project

    video.json        size, frame rate, fonts, entry point, chapters, capture mode
    script.json       the voice and its settings, and the lines, scene by scene
    timeline.js       when things happen
    scenes/index.js   what it looks like
    assets/           images, sounds (assets/sfx/<name>.wav), fonts
    audio/            the ElevenLabs cache: it cost credits, keep it
    build/, out/      made by clap

### video.json

```json
{
  "title": "New video", "fps": 30, "width": 1920, "height": 1080, "background": "#0E151D",
  "entry": "scenes/index.js",
  "capture": "canvas",
  "hidpi": true,
  "fonts": [{ "family": "Roboto", "weight": 700, "src": "@kit/fonts/Roboto-Bold.ttf" }],
  "chapters": { "intro": "Introduction", "end": null },
  "loudness": -16
}
```

- `capture`: `"canvas"` if the scenes draw only on the canvas. The page encodes each frame itself,
  which is several times faster. Leave it out if the scenes use the HTML overlay; each frame is then
  a page screenshot.
- `hidpi`: the canvas has as many pixels as the output (2x for `--scale 2`), and each frame starts
  scaled, so scenes always draw in video pixels. Scenes must not reset the transform themselves.
- `chapters`: titles for the scenes; `null` leaves one out.

### timeline.js

```js
export function layout(L) {
  L.scene('intro');
  L.say('hello', { at: 0.8 });                 // a line, at a time or { gap } after the last thing
  L.at('title', L.w('hello', 'clapper'));      // a cue on a word (or L.w(id, word, 'end'))
  L.sfx('pop', L.cue.title);                   // a sound at a cue
  L.pause(1.2);
}
export const review = c => [c.title + 0.5];    // moments for clap sheet
export function sfx(c) { return [];  }         // optional: [sound, time, gain] from the cues
export function extras({ P, readRGB }) {}      // optional: more data for the page, in the timeline
```

### scenes/index.js

```js
import { on, pop } from '/@kit/core.js';
import { text, T } from '/@kit/draw.js';
import { caption } from '/@kit/captions.js';
import { cue, W, H } from '/@kit/timeline.js';

export async function setup(stage) {}          // optional: load images first
export function render({ ctx }, t) {           // draw frame t, from t alone
  T(ctx, W / 2, H / 2, pop(t, cue.title), 0, 1, () => text(ctx, 'Hello', 0, 0, { size: 90 }));
  caption(ctx, t);
}
```

The page modules, all under `/@kit/`:

- `core.js`: `on`, `inOut`, `pop`, easings `E`, keyframes `track`, `lerp`, `clamp`, `shake`, `hash`, two-bone `ik`
- `draw.js`: text, rounded boxes, shapes, arrows, speech bubbles, confetti, puffs, speed lines,
  gradients, vignette, grain; `THEME` for the default font and colours
- `captions.js`: word-lit captions from the narration
- `assets.js`: `loadImages`, `IMG`
- `timeline.js`: `TL`, `cue`, `line(id)`, `scene(id)`, `W`, `H`, `FPS`

## Tools

- `tools/make-sfx.mjs` remakes the kit's sound effects in `sfx/`.
- `tools/import-el-cache.mjs` imports an ElevenLabs cache from the older Python pipeline.
- `tools/profile-frames.mjs` times drawing and capture for one Chrome.

## Notes

- Chrome can sit for two minutes on the way out after a long render, so the renderer gives it a few
  seconds and then ends it.
- Tabs in one Chrome capture one at a time, so frames are drawn by several Chrome processes, in
  turn, and one encoder receives them in order.
- x264 is the default encoder: on an i9 it keeps up with the frames, and its files are a third the
  size of NVENC's at the same quality. `--encoder nvenc` helps for 4K.

Roboto (in `web/fonts`) is by Google, under the Apache License 2.0; see `web/fonts/NOTICE.md`.
