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

- `core.js`: `on`, `inOut`, `pop`, easings `E`, keyframes `track`, `lerp`, `clamp`, `shake`,
  `wiggle` (waves, head shakes), `hash`, two-bone `ik`
- `draw.js`: text, rounded boxes, shapes, arrows, speech bubbles, confetti, puffs, speed lines,
  gradients, vignette, grain; `THEME` for the default font and colours
- `text.js`: text typed on, words that land as they are said, highlighter swipes, counters, tags
- `captions.js`: word-lit captions from the narration
- `camera.js`: a camera with pan, zoom and roll (`shot` for keyframed moves), and parallax: `view(ctx, cam, depth, fn)`
- `puppet.js`: rigged characters (below)
- `lipsync.js`: `mouth(t, { speaker })`, mouth shapes from the narration's words, opened by how loud the voice is
- `life.js`: `blink`, `breath`, `glance`, `sway`: what makes a character look alive standing still
- `spring.js`: `spring`, `spring2`, `springs` (a set of joints, each with its own feel) and `lag`: overshoot,
  wobble and follow-through, deterministic in any frame order
- `scene3d.js`: 3D layers with three.js (below)
- `finish.js`: `grade` (contrast, saturation, warmth, vignette) and `focus` (depth of field by layer depth)
- `assets.js`: `loadImages`, `IMG`
- `timeline.js`: `TL`, `cue`, `line(id)`, `scene(id)`, `W`, `H`, `FPS`

### 3D

`layer3d(stage)` makes a three.js scene that renders on the GPU and is drawn into the frame wherever
the scene draws it, so 2D and 3D share one shot. Its units are the 2D scene's pixels: `layer.match(cam)`
lines its camera up with the 2D camera, so a 3D object at `[x, -y, 0]` sits on the 2D point `[x, y]`
through every pan, zoom and roll, with real perspective in depth. `studioLights()` lights it to sit
with flat art (and casts shadows straight down); `shadowFloor(y)` lets those shadows fall on the 2D
floor; `paintedTexture` makes canvas textures, for faces and labels that animate. Scenes import three
as `import * as THREE from 'three'` and its add-ons from `'three/addons/...'`; text can be extruded
from the kit's Roboto with `TTFLoader`. Frames stay deterministic: the same t gives the same pixels
in every Chrome process.

### Characters

A `Puppet` is a tree of parts, each drawn around its own pivot. A pose is a flat object of numbers
(`'head.r'` in radians, `'armL.x'`, `'torso.sy'`, `'mouth.open'`, `'eyes.blink'` ...), so poses blend,
add, key and spring simply, and each part's drawing reads whatever keys it needs.

```js
const pip = new Puppet([
  { name: 'hips', at: [0, -346] },
  { name: 'torso', parent: 'hips', z: 2, draw: drawTorso },
  { name: 'armR', parent: 'torso', at: [90, -212], len: 134, z: 3, draw: sleeve },
  // ...
]);
const p = choreo(t, REST, moves);                 // eases each move's keys from wherever they were
const reach = pip.reach(p, 'armR', 'foreR', [290, -590]);   // IK: put the hand there
pip.draw(ctx, { ...reach, ...mouthKeys }, { x: 760, y: 880, scale: 0.8 });
```

Lines in `script.json` can name a `speaker`, and `voice` picks someone from a `cast` with their own
ElevenLabs voice. `clap build` writes `build/voice.json`, how loud the narration is 100 times a
second, which the lip-sync uses. `examples/clapper-intro` has two full characters: Pip (a presenter
with lip-sync, blinking, IK gestures and a spring-driven ponytail) and Bolt (a hovering robot).

### Stock characters: Pip and Gus

`/@kit/characters/pip.js` (Pip, a young presenter) and `/@kit/characters/gus.js` (Gus, an old-school
animator with glasses, a mustache and a cardigan) are toon characters to cast in any video: ink
outlines, cel shading, bendy limbs, four-fingered hands, and faces built for acting. Both are made
from `/@kit/toon.js`, the toon kit, which a new character can be built from too.

`pose(t, moves, { speaker, extra })` gives a character's pose at t: on twos by default, with springs
on the joints, breathing, blinks, glances, and lip-sync to their own lines (`speaker`). `EXPR` holds
expressions (happy, laugh, surprised, shocked, skeptical, smug, angry, sad, worried, disgusted,
delighted, deadpan, grumpy, horrified) and `POSES` body poses, both partial poses to key with `choreo`.

- `body.turn` (-1..1) turns the body towards 3/4: the torso narrows, what's on its front slides round,
  the shoulders and hips come in, and the shoes turn. `head.turn` does the same for the head, and the
  eyes lead the head (`eyes.x`) and the body leads both, so a character facing someone looks at them.
- Drawing order follows the pose. Facing us, arms are drawn in front of the head, so a hand at the
  chin or over the face stays whole. Turned, the near arm and leg come in front and the far ones go
  behind the body. `arms.front: 1` keeps both arms in front whichever way they turn (arms folded),
  and any part can be moved in the order with `'<part>.z'`.
- Pip's ponytail and Gus's two wisps of hair swing on springs; Gus's `glasses.y` slides his glasses
  down his nose, to peer over them.

`examples/acting-test` is Pip alone, `examples/dialogue` is Pip and Gus in a conversation cut between
a two-shot and singles.

In `choreo`, a move can `anticipate` (wind back before it goes), and `E.snap` lands fast and settles.
`onTwos(t)` holds time in steps of two frames, for anything else that should move like drawn animation.

### Motion blur

`"motionBlur": { "samples": 8, "shutter": 0.5 }` in video.json averages 8 moments across half a
frame, as a film camera's shutter does. A scene can export `motionBlur(t)` returning the samples for
each frame, so only fast moves pay for it. It is off in the preview unless the page has `?blur=1`.
Don't use it on things animated on twos: blur across a change of drawing shows both drawings.

### Lab pages

`clap still 0 --entry scenes/lab.js` draws another page instead of the video: a character sheet, a
prop on its own. The page has the same stage and timeline.

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
