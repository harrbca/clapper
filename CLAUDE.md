# Working on Clapper

Clapper is a kit for narrated, animated videos: frames drawn in headless Chrome (canvas and
three.js), narration from ElevenLabs, one ffmpeg encode. The README is the manual; read it first
(for 3D, its "Making a 3D video"). Generic features go into the kit (`web/`, `lib/`, `bin/`),
per-video art and scripts into the video's own project. `examples/` holds projects that show the kit
off; `templates/` holds the starters `clap new` copies. Stock characters are in `web/characters/`: the
cut-out ones are data (a folder with `character.json` and SVG drawings, loaded by `loadCutout`; see
the README's "Characters as data"), `tools/make_people.py` makes the cast of people, and
`tools/make_pip.py` draws cut-out Pip.

These rules are for everyone. The user's own (their commit identity, where their projects and assets
live, work they have paused) are in `CLAUDE.local.md` next to this file, if there is one. Git ignores
it; offer to start one when a user states a preference that belongs there.

## Rules

- **The ElevenLabs key** is read from `%USERPROFILE%\elevenlabs-key.txt` (or `ELEVENLABS_KEY_FILE`).
  Never print, log, copy or commit it, or pass it anywhere but the ElevenLabs API.
- **Credits.** Voiced lines are cached by their text and settings, so only new or changed lines cost
  anything. Tell the user before spending credits beyond narration they asked for. `clap voice
  --draft` lays out timings with no sound and no credits. Don't run `clap voice --music` unless asked.
  Listing voices (`GET /v1/voices`) is free.
- **YouTube.** `clap upload` publishes to the user's channel: ask before each upload, naming the file
  and the privacy. The OAuth client and token (`%USERPROFILE%\youtube-client.json`,
  `youtube-token.json`) are handled like the ElevenLabs key: never printed, copied or committed.
- **This repo is public.** A user's videos live in their own project folders outside this repo and
  use the kit by its path (`clap --project <folder>`, or run from inside the folder). Nothing private
  comes into the repo: work screenshots and documents, scripts, internal names, real order or
  customer data. Examples and templates use made-up data.
- **Git.** Commit and push only when the user asks, and only your own changes: another session may
  have uncommitted work in the same checkout. Check who git commits as before the first commit.
- **Downloads** (packages, models, asset packs): ask first, with the name, source, size and licence.
  Large assets stay out of the repo.

## Checking work

Look at frames, don't assume them. The user will notice glitches, so find them first.

- Start from the director's notes: `clap notes` lists what they wrote on frames in the preview. When
  one is dealt with, close it with a reply saying what changed (`clap notes done <id> "..."`).
- `clap check` draws every drawing and runs the declared characters' checks on all of them. Run it
  before rendering, and treat its warnings as glitches to fix, or make the contact `quiet` when a
  scene lets go of it on purpose.
- `clap still <t> --entry scenes/lab-*.js` renders lab pages (turnarounds, expression charts, prop
  close-ups); `clap sheet` makes contact sheets of the timeline's review moments, and `clap sheet
  <name> <time>...` of any others.
- Also check in-between frames: `clap frames <from> <to>` renders each drawing between two times with
  a labelled strip (`--crop` to look closely). Transitions are where things break.
- 3D geometry: render close-ups of every contact (feet on the floor, a hand round a handle, a pallet
  on its beams, a label on a beam), from more than one side. When something is off, log positions
  (`console.warn` shows up in clap's output) instead of guessing.
- 3D cameras: frame the person acting as well as the thing acted on (a hand alone at the frame's edge
  looks like a mistake), and never shoot along a rack's face.
- 2D characters: after changing a rig, check the drawing order (arms in front of the head, near and
  far limbs when turned) and transitions between poses (hands mustn't sweep through the face).
- Animation on twos and motion blur don't mix (blur shows both drawings).
- After changing a stock character (its JSON, SVGs or the kit code it uses), run `clap check
  --affected <id>` and look at the diffs before committing; approve only what was meant. Bump its
  `version` for changes that break scenes, and update the scenes' `requires`.

## Gotchas

- Tabs in one Chrome capture one at a time; rendering uses several Chrome processes for speed.
- Timeline word cues match bare words (`L.w('line', 'hi')`, not `'hi!'`); `nth` picks a repeat.
- A line with `say` can split into different words in the draft voice and the real one: cue only on
  words in both, and check the cues' order again after voicing.
- WebGL in headless Chrome runs on the GPU; frames stay deterministic across processes. Keep them
  so: everything is a function of `t`, and springs are simulated from 0.
- ffmpeg filters that draw text need an explicit `fontfile` (use the kit's Roboto in `web/fonts`).
- Committed files have CRLF line endings in a Windows checkout (autocrlf). Scripted multi-line
  replacements must normalise `\r\n` first and restore it after.
- A draft voice has no `build/voice.json`, so the page logs one 404 for it. That is harmless.

## Not done yet

- Web apps' screens into scenes: started, as `clap capture` and `web/screen.js` (see the README).
  Bringing in screen recordings is planned but not started.
