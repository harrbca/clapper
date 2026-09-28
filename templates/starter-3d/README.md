# New 3D video

Made with [Clapper](https://github.com/harrbca/clapper). Pip stands by a desk with a label printer.
When she says "print", a label prints, and when she says "read", it comes up to the camera.

    clap voice --draft     # lay it out with estimated timings, no ElevenLabs
    clap build
    clap preview --open    # edit scenes/index.js and timeline.js; the preview follows
    clap sheet             # contact sheets of the review moments -> out/stills
    clap voice             # the real narration, once the script is settled
    clap build
    clap render            # out/video.mp4

- `script.json`: what is said, and by which voice
- `timeline.js`: when things happen, keyed to the words (`print`, `feed`, `fed`, `read`)
- `scenes/index.js`: the set, the camera, Pip's moves and the label, at any moment
- `audio/`: the ElevenLabs cache. It cost credits; keep it.

The scene works in millimetres. 3D Pip stands at scale 1.8, the camera has a 30° field of view, and a
full-body shot is about 4 m back. The kit's README has a "Making a 3D video" section on scale,
cameras, hands and props, walking, and checking frames. `examples/clapper-intro` in the kit
(`scenes/tour3d.js`) is a bigger 3D scene to borrow from: a warehouse, walking, a scanner in Pip's
hand, and Tilly the forklift.
