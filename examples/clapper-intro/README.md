# Clapper's intro

A 48-second video in which Pip explains how a Clapper video is made, with Bolt's help. It is here
to show what the kit does with characters and animation:

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

    clap voice        # cached: no credits unless a line changes
    clap build
    clap preview --open
    clap render       # out/video.mp4, about 11 s
    clap still 0 --entry scenes/lab.js         # Pip's character sheet
    clap still 0 --entry scenes/lab-turn.js    # her head turning
    clap still 0.3 --entry scenes/lab3d.js     # 3D Bolt beside the 2D one

`characters/` holds Pip and Bolt; `scenes/acting.js` is who does what when, and the camera;
`scenes/props.js` the things they talk about; `scenes/set.js` the studio; `scenes/physics.js` the
bouncing, shared with `timeline.js` for the sounds.
