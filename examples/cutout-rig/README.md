# Dex: cut-out rig test

A 23-second test of the kit's cut-out rig (`/@kit/cutout.js`) on Dex, a warehouse picker
(`/@kit/characters/dex.js`), drawn the way TV cut-out shows are: flat colour, one even ink line,
and drawings swapped, not bent.

- He notices us: the head turns first (a new drawing), then the body comes round under it.
- The mouth chart follows every word, and his expression's mouth comes back between words.
- Hands swap from the library: a wave, a hand on his chest, a thumbs up flipped to face us, a point.
- He turns to the racking to scan a bin, then walks off in profile: `walk2d` plants each foot while
  his body passes over it, so his feet never slide.

Dex is voiced by Callum (ElevenLabs); the lines are cached in `audio/`.

    clap voice && clap build && clap render
    clap still 0 --entry scenes/lab.js         # the turnaround and the hand library
    clap still 0 --entry scenes/lab-face.js    # the mouth chart at three angles, and expressions
    clap still 0 --entry scenes/lab-poses.js   # poses from the front and at 3/4
    clap still 0 --entry scenes/lab-clips.js   # the kit's clips, each as a strip
    clap still 0 --entry scenes/lab-shots.js   # the named shots
    clap list dex                              # everything Dex understands
