# Clapper's intro

A 90-second video in which Pip explains how a Clapper video is made, with Bolt's help, then shows what
else the kit does. It is here to show what the kit does with characters and animation. In the studio:

- Pip is a rigged puppet: IK arms placed by where the hand should go, blinking, breathing, glances,
  lip-sync from the narration (mouth shapes opened by the real loudness of the voice), and a
  ponytail on a spring that swings behind every head shake and hop.
- Pip's joints follow the choreography on springs (the shoulder leads, the elbow and hand lag and
  settle), her arms are never quite still, and her head turns in 2.5D to follow her eyes.
- Bolt is 3D (`characters/bolt3d.js`): a clear-coated shell, a glass face with its eyes painted live,
  a glowing antenna on a spring, a thruster that burns harder as he rushes, and a shadow on the 2D
  floor. He turns to face where he flies. `characters/bolt.js` is the 2D Bolt he replaced.
- The clapperboard is 3D too (`scenes/props3d.js`), with extruded letters, a hinged stick and 500
  pieces of 3D confetti.
- The far layers of the set fall out of focus as the camera pushes in, and the frame is graded.
- Every beat lands on a word: the bubble pops on "pops", Bolt zooms on "zoom", the balls land first
  on "bounce" (and a tap sounds on every landing after), the clapperboard snaps shut on "Clapper".
- The camera pushes, pans and swoops, with three layers of parallax, and fast moves get motion blur.

Then what else the kit does. Every name and number in it is made up:

- **A web page:** a card of an order desk (`webapp/`) grows out of the studio to fill the frame. It
  was driven by `clap capture` (`capture/print.js`), and `screen.js` plays it back. The pointer
  clicks the search box on "click", types the order number on "keystroke", opens it on "cue" and
  clicks Print label on "print".
- **In 3D** (`scenes/tour3d.js`, the set in `scenes/world3d.js`), the label prints on the label
  printer:
  - The label is `label/`, captured to a picture by `capture/label.js`.
  - 3D Pip tears it off and reads it. An inset shows the label, with its bin lit up on "read".
  - She walks it to its bin (walk3d), sticks it on the order, and picks it with the handheld
    scanner. Its screen plays `capture/scanner.js` (the app is `scanapp/`), on the scanner and
    large beside her. She scans the order, taps the pick, and scans the bin.
  - Tilly pulls up, and Pip scans her label and taps Done. Tilly lifts the pallet and backs out
    with it.
- **Sharing:** back in the studio, `clap upload` is typed into a terminal on "command", and the
  video appears, private, on "YouTube".

    clap capture capture/label.js      # the pictures and screens, if capture/ is missing
    clap capture capture/print.js
    clap capture capture/scanner.js
    clap voice        # cached: no credits unless a line changes
    clap build
    clap preview --open
    clap render       # out/video.mp4, about 30 s
    clap still 0 --entry scenes/lab.js         # Pip's character sheet
    clap still 0 --entry scenes/lab-turn.js    # her head turning
    clap still 0.3 --entry scenes/lab3d.js     # 3D Bolt beside the 2D one

`characters/` holds Pip and Bolt; `scenes/acting.js` is who does what when, and the camera;
`scenes/props.js` the things they talk about; `scenes/set.js` the studio; `scenes/physics.js` the
bouncing, shared with `timeline.js` for the sounds.
