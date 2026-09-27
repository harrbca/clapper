# New video

Made with [Clapper](https://github.com/harrbca/clapper).

    clap voice --draft     # lay it out with estimated timings, no ElevenLabs
    clap build
    clap preview --open    # edit scenes/index.js and timeline.js; the preview follows
    clap voice             # the real narration, once the script is settled
    clap build
    clap render            # out/video.mp4

- `script.json`: what is said, and by which voice
- `timeline.js`: when things happen, keyed to the words
- `scenes/index.js`: what it looks like at any moment
- `audio/`: the ElevenLabs cache. It cost credits; keep it.
