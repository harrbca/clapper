# Clapper's intro

A 48-second video in which Pip explains how a Clapper video is made, with Bolt's help. It is here
to show what the kit does with characters and animation:

- Pip is a rigged puppet: IK arms placed by where the hand should go, blinking, breathing, glances,
  lip-sync from the narration (mouth shapes opened by the real loudness of the voice), and a
  ponytail on a spring that swings behind every head shake and hop.
- Bolt flies along a path: it tilts into its speed, its thruster burns harder as it rushes, and its
  antenna whips behind it on a spring.
- Every beat lands on a word: the bubble pops on "pops", Bolt zooms on "zoom", the balls land first
  on "bounce" (and a tap sounds on every landing after), the clapperboard snaps shut on "Clapper".
- The camera pushes, pans and swoops, with three layers of parallax, and fast moves get motion blur.

    clap voice        # cached: no credits unless a line changes
    clap build
    clap preview --open
    clap render       # out/video.mp4, about 11 s
    clap still 0 --entry scenes/lab.js    # Pip's character sheet

`characters/` holds Pip and Bolt; `scenes/acting.js` is who does what when, and the camera;
`scenes/props.js` the things they talk about; `scenes/set.js` the studio; `scenes/physics.js` the
bouncing, shared with `timeline.js` for the sounds.
