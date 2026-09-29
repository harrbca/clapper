# Clapper

Narrated, animated videos drawn in code. A clapperboard syncs sound to picture, and that is the
job here: the narration is generated first, with the time of every word, and the animation is keyed
to those words. Re-voice a line and everything that happens on it moves with it.

Each frame is a pure function of time, drawn in a browser canvas (with an optional HTML layer), so a
frame looks the same whether it plays live in the preview or renders offline, in any order, on any
number of Chrome processes at once.

## What it does

- **Voice:** ElevenLabs narration with word timings, cached by request so re-runs cost nothing.
  `say` lets a line be spoken differently from how it is captioned ("B X four two seven" / "BX-427").
  `--draft` estimates the timings from the text instead, to lay a video out before paying for it.
- **Timeline:** `timeline.js` places the lines and names moments ("cues") on their words.
- **Sound:** the narration, sound effects placed at cues, and a music bed that ducks under the voice,
  mixed and normalised to a loudness target. Seventeen synthesised effects come with the kit, printers
  (`print`, `tear`, `laser`) and a scanner's beep (`scan`) among them.
- **Preview:** a live player in sync with the mix. It reloads when a scene changes, and rebuilds
  when the timeline does.
- **Render:** MP4 with the soundtrack and chapter markers, plus SRT and VTT captions. The whole
  3-minute 1080p video renders in about 30 s on an i9.

## Setup

Needs Node 20+, ffmpeg and ffprobe on the PATH, and Chrome (or Edge). For narration, an ElevenLabs
key in `%USERPROFILE%\elevenlabs-key.txt` (or wherever `ELEVENLABS_KEY_FILE` points). For uploads to
YouTube, a Google OAuth client (see [YouTube](#youtube)).

    npm install
    node bin/clap.js doctor

`npm link` puts `clap` on the PATH; otherwise run `node <this folder>/bin/clap.js`.

Working with Claude Code: `CLAUDE.md` has the rules and habits it follows in this repo (the key,
credits, checking frames). Your own, such as your commit identity or where your private projects
live, go in `CLAUDE.local.md` next to it, which git ignores. Keep your own videos in their own
folders outside the kit, and point `clap` at them (`--project`, or run it from inside one).

## Making a video

    clap new my-video && cd my-video
    clap voice --draft          # estimated timings, no sound, no credits
    clap build
    clap preview --open
    clap voice                  # the real narration
    clap build
    clap render                 # out/video.mp4

`clap new my-video --template 3d` starts a 3D video instead: see [Making a 3D video](#making-a-3d-video).

| command | what it does |
|---|---|
| `clap new <folder> [--template 3d]` | a new project from a starter: 2D, or 3D (Pip, a desk and a label printer) |
| `clap voice [--voice NAME] [--audition] [--music] [--draft]` | narration (and a voice audition, and the music bed) from ElevenLabs |
| `clap build [--no-audio]` | `build/timeline.json`, `build/mix.wav`, `build/captions.srt` and `.vtt` |
| `clap preview [--port 4173] [--open]` | the live player. Space plays, arrows skip (Shift: 1 s), `,` `.` step a frame, `[` `]` jump scenes, D shows cues |
| `clap still <time>...` | full-size PNGs in `out/stills` |
| `clap sheet [name] [time...]` | 2x2 contact sheets; by default of the timeline's review list |
| `clap render [out.mp4] [--draft] [--scale 2] [--from s] [--to s] [--workers 8] [--encoder x264\|nvenc]` | the video. `--draft` is half size and fast; `--scale 2` is 4K when the project is `hidpi` |
| `clap capture <script.js> [--headed]` | drives a web page as the script says and keeps each state's screenshot, for `screen.js` (below) |
| `clap upload [file.mp4] [--privacy private\|unlisted\|public] [--title T] [--description D] [--login]` | the video to YouTube, private unless asked (below) |
| `clap doctor` | checks ffmpeg, Chrome, the ElevenLabs key and the YouTube sign-in |

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

`/@kit/toon3d.js` makes 3D look like the 2D toons: `toon(color)` is a cel-shaded material with three
flat tones, and `solid(geometry, material)` adds an ink outline that stays the same width on screen
at any distance. `roundBox`, `ball` and `limbGeometry` (a tapered limb with rounded ends) are parts
to build from, `joint(parent, at)` a pivot to hang them on, and `reach(upper, lower, a, b, target,
pole)` two-bone IK for arms and legs. Two 3D stock characters are made from it:

- `/@kit/characters/pip3d.js`: Pip in 3D, with a rig. Hands and feet are placed by IK (`handR.x/y/z`,
  in her own space), each palm faces a direction you give (`handR.px/py/pz`), and hands take the same
  forms as the 2D ones. Her eyeballs turn to look under lids that blink and squint, with lash lines;
  her brows move; her mouth is painted onto her face by the 2D Pip's code, so the lip-sync and
  `EXPR3` expressions are the same keys. She has a sculpted bob and a ponytail on springs.
  `pip3dPose(t, moves)` brings her to life as `toonPose` does in 2D.
- `/@kit/characters/tilly3d.js`: Tilly, a forklift robot, Bolt's cousin. A glowing screen face (moods,
  gaze, blinks, brows, a mouth for beeps) in a cab that turns and tilts like a head, a beacon that
  spins and flashes, a telescoping mast, and forks she can lift, tilt, spread and wave one at a time.
  `tillyPose(t, moves, { path })` rolls her wheels along a path and pitches her on her springs as
  she speeds up and brakes. `forkTop()` says where a load on her forks goes.

`examples/3d-cast` puts them both in a toon warehouse, all in 3D, with lab pages for each.

`/@kit/props3d.js` has props in the same style: `scanner3d` (a pistol-grip handheld whose screen shows a
texture you paint, with a trigger, an indicator light and a red scan beam, and `hold(hand, aim, face)`
to put it in a hand and point it), `label3d` (a bin label with decorative bars, old and yellowed or
new, whose backing peels off), `rack3d` (pallet racking with `slot()` for labels on its beams), and
`carton3d`, `pallet3d` and `palletLoad`. The bars are made up on purpose, so nothing can be scanned for
real. 3D Pip can wear a hi-vis vest (`pip3d(layer, { vest: true })`), grip a handle (hand form 5) or
pinch a label (6), and `pip.palm('R')` says where her palm is, to hang props on. `examples/3d-props`
shows them.

`/@kit/printers3d.js` has printers, to scale in millimetres, and what they print:

- `labelPrinter3d` is an industrial label printer after Zebra's ZT411, without the logos. It has a
  control column with five lights, a portrait touch screen and three keys. Its door (half the roof, the
  right side with its window, and a cap on the front) swings up and over to show the roll, the ribbon
  and the print head. Labels leave over a serrated tear bar. `update({ screen, led, door })` repaints
  the screen, sets the lights and opens the door.
- `printedLabel(picture)` is a label on its backing. The printer's `hang(label, mm)` feeds it out,
  printed as far as it has come out; `hung(label)` is where it hangs, to tear it off from.
  `label.at(u, v)` is a point on its printed face, by the picture's own coordinates: aim a scanner at
  one of its barcodes with it.
- `laserPrinter3d` is an office laser printer. `feed(sheet, k)` puts a `sheet3d(picture)` into its bin,
  face down, k of the way out.
- `desk3d` is a desk to stand them on. `loadPicture(url)` makes a texture of a page or label.

Things are carried about as poses `{ c, f, u }` (where the middle is, the way the face looks, the way
the top points). scene3d.js's `poseBetween(a, b, k, arc)` goes between two poses, and
`poseInFront(camera, d)` is square to the camera, to hold something up to it. `fitDistance(camera,
size, frac)` is how far away something fills that much of the frame. `label.place(...)` and
`sheet.place(...)` put them there.

### Walking, and working with props

`/@kit/walk3d.js` walks a character whose feet are placed by IK, such as 3D Pip, along a route.
`walk(t, { path, t0, t1, step, width, lift })` says where the body is and which way it faces. It also
says where each foot is: planted on the floor while the body passes over it, then swung forward, so
feet never slide. The walk speeds up from a stand and slows to one. `footLocal` turns a foot into the
character's own space, for its pose.

- **Fingertips:** `pip.tip(side)` is where her index fingertip is. Set her wrist, measure the tip,
  and correct the wrist, and the fingertip lands exactly on a screen or a key.
- **Scanner keys:** `scanner3d` has `keys` (twelve; the last is Enter) and `keyAt(i)`, where the top of
  key i is, to press it. It also has `screenAt(u, v)`, a point on its screen.

### Skinned characters: rig3d, hand3d and Ray

Pip and Tilly are stacks of rigid parts. `/@kit/rig3d.js` builds characters with a skin instead: a
skeleton of bones, and smooth meshes that bend with them at knuckles, wrists, elbows and hips.

- `skeleton(group, bones)` makes the bones. Each is `{ name, parent, at, rest }` and hangs down its
  -y, as in toon3d. `turn(bone, x, y, z)` turns a bone on top of its rest pose.
- A body part is modelled from shapes hung on bones: `cone` (a tapered capsule), `ell`, `box` and
  `ring`. They are joined with `smooth(k, ...)` (blended), `attach(k, base, ...)` (each part blended
  into the base but not into its neighbours, as fingers into a palm) and `carve`.
- `skinned(sk, shape, material, { cell })` meshes the shape once, at setup, and binds each vertex to
  the bones whose shapes are nearest it. The ink outline bends with the bones (`skinnedInk`). `key`
  shares a mesh between copies of a character, and `uvs` and `colors` paint it.

`/@kit/hand3d.js` is a human hand for these characters. Each finger has three joints and the thumb
can reach across the palm. The finger's end joint follows its middle one, as tendons make it, and
fingers pull their neighbours a little.

- **Shapes:** `HAND` has shapes to key with `choreo`: relaxed, open, flat, fist, point, thumbsUp,
  peace, claw, count(n), touch(f), ok, reach and grasp. Every shape sets every joint, so hands blend
  smoothly from one shape to the next.
- **Grasp:** `grasp` closes the fingers round what the hand holds (a handle or a ball of any size)
  until each segment meets it.
- **Touch:** `touch` brings the thumb's pad to a fingertip.
- **`handLife`:** the fingers move one after another, settle on springs, and trail the wrist.

`/@kit/characters/ray3d.js` is Ray, a grown-up warehouse lead built on both. He is modelled in
millimetres (1.76 m), with hands from hand3d and the 2D toon mouth painted onto his face (so
lip-sync and expressions work as for Pip).

- **Arms:** they reach by IK. The forearm turns along its length to face the palm where it is asked,
  and the shoulders lift and come forward with the arms.
- **Body:** the spine bends along its length, and his hips go back when he bends.
- **Keys:** `rayPose` works as `pip3dPose` does, with the same keys plus hand3d's.
- **Setup:** his meshes take about 5 s to make as the page loads.

`examples/hand-rig` puts one hand through its paces, and `examples/ray-rig` does the same for Ray,
with lab pages for both.

### Web captures

`clap capture capture/print.js` drives a web page in Chrome as its script says: pointing, clicking and
typing. It keeps a screenshot of each state it passes through (the hover, the result, each typed
character), at twice the page's size so the video can zoom in, and it records where the pointer went
and what shape it took over each thing (arrow, hand or text cursor). It warns when something invisible
on top would take a click.

```js
export const url = 'webapp/index.html';        // a page in the project, or any http(s) address
export const address = 'orders.example/list';   // what the address bar shows
export const viewport = { width: 1600, height: 816 };
export async function steps(s) {
  await s.shot('start');
  await s.click('#search', 'search');
  await s.type('4821', 'typed');
  await s.click('tr[data-id="4821"]', 'open', { wait: 400 });
}
```

`/@kit/screen.js` plays a capture back. `screen(ctx, t, cap, { at, x, y, w })` draws the page in a
browser window, with a pointer that glides to each thing and clicks it (a ripple), and typing a
character at a time. `at` gives each step its moment, usually cues on the narrator's words. A
1600 x 816 page in a 1920-wide window fills a 1080p frame. `target(cap, o, id)` says where a step
pointed, to aim the camera at it.

A handheld's screen works the same way:

- **Acts:** `s.act('scan("4821")', 'scanned')` keeps whatever happens to the page that isn't the
  pointer's doing, such as a barcode read or a message arriving.
- **Touch screens:** `screen(..., { bar: false, pointer: 'touch' })` draws the page with no browser
  bars and no cursor, just a fingertip's mark where each tap lands.
- **On a prop:** draw into a `paintedTexture` for a prop's screen, such as the scanner's, and show the
  same page large beside it.

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
with lip-sync, blinking, IK gestures and a spring-driven ponytail) and Bolt (a hovering robot). It
goes on to a web capture and a 3D tour: a label printed, walked to its bin and picked with a scanner,
onto Tilly.

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

### Cut-out characters: cutout.js and Dex

`/@kit/cutout.js` rigs characters the way TV cut-out animation does (the Toon Boom Harmony look of
adult animated sitcoms): flat colour and one even ink line, with drawings swapped rather than bent.
`/@kit/characters/dex.js` is Dex, a warehouse picker in a hi-vis vest, made from it.

- **Angles:** a character is drawn from set angles, `0` front, `1` 3/4, `2` profile, `3` 3/4 from
  behind and `4` back, negative to face left (the same drawings mirrored). `body.view` turns the body
  and `head.view` turns the head on from there, so the head can lead a turn. Both key like any number
  and the drawing swaps at each half step, passing through every angle in between. `byAngle` picks a
  drawing from a set; `turnRig` moves the shoulders and hips round and puts the far limbs behind.
- **Hands:** a library of drawn hands (`HAND.relaxed`, `open`, `spread`, `palm`, `point`, `fist`,
  `thumb`, `grip`, `ok`, `peace`), keyed as `'handR.shape'`. `'handR.flip': 1` shows the other side.
  Keys ending in `.shape` swap halfway through the move that keys them instead of blending.
- **Mouth chart:** one drawing per sound (lipsync.js's shapes, from `viseme(t)`) plus expression
  mouths (`smile`, `grin`, `frown`, `grimace`, `shout`, `smirk`, `gasp`), keyed as `'mouth.shape'`.
  While a character talks, the chart follows the words; between words it shows the expression's
  mouth. Wide-open mouths drop the jaw (`jawDrop`).
- **Faces:** big eyes with dot pupils and lids inside the outline, and brows, with the toon kit's
  face keys (`lids.drop`, `lids.slant`, `brows.in` ...). `EXPR` has 14 expressions.
- **Limbs:** `noodle` bends an arm or leg as one even tube; `sleeve` puts a short sleeve over it.
- **Contacts:** `plant(puppet, pose, 'L', [x, y])` puts a foot on a spot by IK and keeps it level,
  for crouches, kneels and landings; `mixKeys` eases a contact in and out. Run them on the finished
  pose.
- `cutoutPose` brings a character to life as `toonPose` does: on twos, springs on the arms, blinks,
  glances, breathing and the mouth chart. Dex's `HELD.L` / `HELD.R` draw a prop in his hand, under
  the fingers.

`examples/cutout-rig` has Dex's model sheet, face sheet and poses as lab pages, and a short acting
test in a warehouse: a scanner, a turn to the racking, and a walk off. `examples/cutout-jump` is a
stunt: off a table, a forward flip, and a superhero landing, built from key poses and contacts.

### Motion blur

`"motionBlur": { "samples": 8, "shutter": 0.5 }` in video.json averages 8 moments across half a
frame, as a film camera's shutter does. A scene can export `motionBlur(t)` returning the samples for
each frame, so only fast moves pay for it. It is off in the preview unless the page has `?blur=1`.
Don't use it on things animated on twos: blur across a change of drawing shows both drawings.

### Lab pages

`clap still 0 --entry scenes/lab.js` draws another page instead of the video: a character sheet, a
prop on its own. The page has the same stage and timeline.

## Making a 3D video

`clap new my-video --template 3d` starts one: Pip beside a desk with a label printer. When she says
"print", a label prints, and when she says "read", it comes up to the camera. It is about 100 lines of
scene to grow from. For a big one, `examples/clapper-intro` has a warehouse in `scenes/tour3d.js`:
Pip tears the label off, walks it to its bin and does the pick with a scanner, and Tilly takes the
load away. The rest of this section is what that took.

**Scale.** Work in millimetres, as the printers are. The characters and warehouse props were modelled
in units of their own, so scale them in:

| thing | scale | so that |
|---|---|---|
| 3D Pip | 1.8 | she is about 1.64 m tall (910 in her own units) |
| Tilly | 3.2 | she is about 1.05 m tall and her forks slide under a pallet |
| `rack3d`, `palletLoad`, `pallet3d`, `carton3d` | 1.8 | they stand with Pip |
| `scanner3d` | 0.9 × Pip's | it fits her hand |
| printers, labels, desk | 1 | they are already in millimetres |

Poses and hand positions are in the character's own units and space (origin between her feet, y up,
z forward); `pip.local(v)` turns a point in the world into them.

**Camera.** `layer3d(stage, { fov: 30 })` for rooms (the default of 18 suits matching a 2D camera).
Set `near` and `far` for millimetres (30 and 40000). At fov 30 a standing person fills the frame
from about 4 m; `fitDistance(camera, size, frac)` works it out. Key the camera's position and target
with `track(t, keys)`: keys glide, and two keys at the same time cut. What worked:

- Frame both the thing and the person acting on it. A push-in that leaves only a hand at the edge
  of the frame looks like a mistake.
- Never shoot along a rack's face: the uprights stack up and hide everything. Shoot over the
  shoulder from the aisle, about 4 m back, or square on.
- Cut rather than fly the camera through racks or walls.
- Move the lights with the shot (`L.lights.rig.position` to the camera's target) and widen the
  shadow camera for a room, so shadows stay sharp where you are looking.

**Moving Pip.** `pip3dPose(t, moves, { speaker })` works as `toonPose` does in 2D: each move eases
into its pose at its time and holds it. It adds breathing and blinks, and lip-syncs her to the lines
whose `speaker` matches. Hands are placed by IK (`handL.x/y/z`), with a form (0 open, 1 point,
2 fist, 3 thumbs up, 4 relaxed, 5 grip, 6 pinch) and a palm direction (`handL.px/py/pz`). `REST3`
is her rest pose. `yaw` turns her whole body; `head.turn` and `eyes.x` aim her look.

**Hands on things.** IK puts the wrist where you ask, not the fingers. To land a fingertip on a key
or a pinch on a label: set the wrist, `pip.update(pose, place)`, measure `pip.tip(side)` or
`pip.pinch(side)`, move the wrist by the difference, and repeat once. Two passes land it. For the
scanner: `scanner.hold(hand, aim, face)` places it; `scanner.handFrame(GRIP)` says where the
wrist goes round its handle (`GRIP` is in pip3d.js); and after the update,
`pip.orientHand('R', frame.quat)` turns the hand to fit. `scanner.keyAt(i)` and
`scanner.screenAt(u, v)` are points to press. `tour3d.js` does all of this in its `render`.

**Carrying things.** A carried thing is a pose `{ c, f, u }`. `poseBetween(a, b, k, arc)` goes from
one to another, lifting by `arc` on the way, so a label comes up out of the printer before it turns
instead of swinging through it. `printer.hang(label, mm)` feeds a label out and `printer.hung(label)`
is where it hangs; `poseInFront(camera, fitDistance(camera, label.pitch, 0.8))` holds it up to be
read. Anything in a hand follows `pip.pinch` or `pip.palm`, recomputed each frame from the pose.

**Walking.** `walk(t, { path, t0, t1 })` gives the body's `x`, `z` and `yaw` and both feet. Put the
feet into her pose with `footLocal(foot, body, scale)` (`footL.x/y/z`, plus 42 on y for the
ankle), lower her hips a little by `go`, and the feet stay planted. For footsteps, sample `walk` in
`timeline.js` and put an `L.sfx` where each foot touches down (the intro's timeline does).

**Timing.** Cue on words: `L.w('line', 'word')` with the bare word (no punctuation), `nth` for a
repeat. Lay the video out with `clap voice --draft`, then voice it and check again: real timings
move things. A line with `say` (spoken differently from its caption) can split into different
words in the draft and the real voice, so cue only on words that are in both. When one moment
depends on another (grab the label after it has printed), build it from both with `Math.max`, so
the order holds whatever the voice does. Everything is a function of `t`: no state carried from
one frame to the next, and springs simulated from 0.

**Checking.** Look at frames; don't assume them.

- `clap sheet` shows the timeline's review moments. `clap sheet mid print+0.3 read+0.5` shows any
  others: aim for the in-between moments, where things break.
- For contacts (feet on the floor, a hand round a handle, a label in a pinch, a pallet on its
  beams), make a lab page (`scenes/lab-*.js`, drawn with `clap still 0 --entry scenes/lab-grip.js`)
  with close-ups from two or three sides.
- After rendering, pull frames between the review moments from the video:
  `ffmpeg -ss 12.3 -i out/video.mp4 -frames:v 1 f.png`.
- When something is off, `console.warn` the positions: it prints in clap's output. That beats
  guessing.

## YouTube

`clap upload` puts `out/video.mp4` (or the file you name) on YouTube, to watch it there: private
unless `--privacy unlisted` or `public` says otherwise. The title is video.json's `title` (or
`--title`), and the description its `description` (or `--description`) followed by the video's
chapters as `0:00 Title` lines, which YouTube makes chapters of when there are three or more, the
first at 0:00, each at least 10 s long. A project keeps a list of its uploads in `out/youtube.json`.
The upload goes in 16 MB chunks, and carries on from where it got to after a dropped connection.

It signs in to Google as a desktop app. To set that up, in Google Cloud Console, signed in with the
Google account that owns the channel:

1. Make a project and enable the YouTube Data API v3 in it.
2. Google Auth Platform: get started, with an external audience. Branding needs only the app's name
   and two email addresses; leave the logo off, or Google wants to verify the app first. Leave the
   app in testing, and under Audience add yourself as a test user. A testing app's sign-in lasts 7
   days, and `clap upload` signs in again when it has run out. (Publishing the app to production
   ends that, but needs a home page, privacy policy and terms of service on a domain of your own.)
3. Clients: create a Desktop app client and download its JSON, which is only offered then, to
   `%USERPROFILE%\youtube-client.json` (or wherever `YOUTUBE_CLIENT_FILE` points).
4. `clap upload --login`. Google warns that it hasn't verified the app; it's your own, so choose
   Advanced and go on to it. The token is kept in `%USERPROFILE%\youtube-token.json` (`YOUTUBE_TOKEN_FILE`).

YouTube keeps videos uploaded by an API project it hasn't audited private, whatever privacy was
asked for. That's enough to watch your own videos, signed in, on any device. For unlisted or public
uploads the project needs YouTube's compliance audit: the
[audit and quota extension form](https://support.google.com/youtube/contact/yt_api_form).

## Tools

- `tools/make-sfx.mjs` remakes the kit's sound effects in `sfx/`.
- `tools/import-el-cache.mjs` imports an ElevenLabs cache from the older Python pipeline.
- `tools/profile-frames.mjs` times drawing and capture for one Chrome.
- `tools/pdf-png.ps1` renders PDF pages to PNGs with the PDF renderer built into Windows, to put a
  document in a video: `powershell -File tools\pdf-png.ps1 doc.pdf out -Dpi 300`.

## Notes

- Chrome can sit for two minutes on the way out after a long render, so the renderer gives it a few
  seconds and then ends it.
- Tabs in one Chrome capture one at a time, so frames are drawn by several Chrome processes, in
  turn, and one encoder receives them in order.
- x264 is the default encoder: on an i9 it keeps up with the frames, and its files are a third the
  size of NVENC's at the same quality. `--encoder nvenc` helps for 4K.

Roboto (in `web/fonts`) is by Google, under the Apache License 2.0; see `web/fonts/NOTICE.md`.
