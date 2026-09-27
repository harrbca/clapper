# Working on Clapper

Clapper is Brad's kit for narrated, animated videos: frames drawn in headless Chrome (canvas and
three.js), narration from ElevenLabs, one ffmpeg encode. The README is the manual; read it first.
Generic features go into the kit (`web/`, `lib/`, `bin/`), per-video art and scripts into the video's
own project. `examples/` holds projects that show the kit off.

## Rules

- **The ElevenLabs key** is read from `%USERPROFILE%\elevenlabs-key.txt` (or `ELEVENLABS_KEY_FILE`).
  Never print, log, copy or commit it, or pass it anywhere but the ElevenLabs API.
- **Credits.** Voiced lines are cached by their text and settings, so only new or changed lines cost
  anything. Tell Brad before spending credits beyond narration he asked for. `clap voice --draft` lays
  out timings with no sound and no credits. Don't run `clap voice --music` unless asked. Listing voices
  (`GET /v1/voices`) is free.
- **YouTube.** `clap upload` publishes to Brad's channel: ask before each upload, naming the file and
  the privacy. The OAuth client and token (`%USERPROFILE%\youtube-client.json`, `youtube-token.json`)
  are handled like the ElevenLabs key: never printed, copied or committed.
- **This repo is public.** Videos made for work, and anything from work (app screenshots, scripts,
  internal names), live in their own project folders outside this repo and never come into it. Those
  projects use the kit from this checkout by its path, `C:\Projects\clapper`: don't move or rename it.
- **Git.** Commit as `Brad Harrison <harrbca@gmail.com>` (set in this repo's local config; the
  machine's global identity is a work address). Commit and push when Brad asks. Leave the uncommitted
  `package.json` / `package-lock.json` changes alone (see Paused, below).
- **Downloads** (packages, models, asset packs): ask first, with the name, source, size and licence.
  Large assets stay out of the repo, in `C:\Projects\clapper-assets`. Keep `node_modules` out of
  OneDrive.

## Checking work

Look at frames, don't assume them. Brad notices glitches, so find them first.

- `clap still <t> --entry scenes/lab-*.js` renders lab pages (turnarounds, expression charts, prop
  close-ups); `clap sheet` makes contact sheets of the timeline's review moments.
- Also check in-between frames from the rendered video (`ffmpeg -ss <t> -i out/video.mp4 -frames:v 1`):
  transitions are where things break.
- 3D geometry: render close-ups of every contact (feet on the floor, a hand round a handle, a pallet
  on its beams, a label on a beam), from more than one side. When something is off, log positions
  (`console.warn` shows up in clap's output) instead of guessing.
- 2D characters: after changing a rig, check the drawing order (arms in front of the head, near and
  far limbs when turned) and transitions between poses (hands mustn't sweep through the face).
- Animation on twos and motion blur don't mix (blur shows both drawings).

## Gotchas

- Tabs in one Chrome capture one at a time; rendering uses several Chrome processes for speed.
- Timeline word cues match bare words (`L.w('line', 'hi')`, not `'hi!'`); `nth` picks a repeat.
- WebGL in headless Chrome runs on the GPU; frames stay deterministic across processes. Keep them
  so: everything is a function of `t`, and springs are simulated from 0.
- ffmpeg filters that draw text need an explicit `fontfile` (use the kit's Roboto in `web/fonts`).

## Paused

- A trial of ready-made 3D characters (VRM avatars, Quaternius rigged characters and animations):
  `@pixiv/three-vrm` is installed but not committed, and a sample VRM and the Quaternius animation
  library are in `C:\Projects\clapper-assets`. Brad paused it; ask before picking it up.
- Web apps' screens into scenes: started, as `clap capture` and `web/screen.js` (see the README).
  Bringing in screen recordings is planned but not started.
