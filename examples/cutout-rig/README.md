# Dex: cut-out rig test

A 23-second test of the kit's cut-out rig (`/@kit/cutout.js`) on Dex, a warehouse picker
(`/@kit/characters/dex.js`), drawn the way TV cut-out shows are: flat colour, one even ink line,
and drawings swapped, not bent.

- He notices us: the head turns first (a new drawing), then the body comes round under it.
- The mouth chart follows every word, and his expression's mouth comes back between words.
- Hands swap from the library: a wave, a hand on his chest, a thumbs up flipped to face us, a point.
- He turns to the racking to scan a bin, then walks off in profile.

The narration is a draft (timings from the text, no sound) until it is voiced.

    clap voice --draft && clap build && clap render --draft
    clap still 0 --entry scenes/lab.js         # the turnaround and the hand library
    clap still 0 --entry scenes/lab-face.js    # the mouth chart at three angles, and expressions
    clap still 0 --entry scenes/lab-poses.js   # poses from the front and at 3/4
