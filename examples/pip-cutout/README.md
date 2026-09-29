# Pip, cut out: acting test

The toon acting test (`examples/acting-test`) performed by the cut-out Pip
(`/@kit/characters/pip-cutout.js`): the same four lines in the same voice, so the same audio (the
cached lines are copied here, and `clap voice` spends nothing), staged for the cut-out rig. She's
full length in a flat living room, on twos, from surprise through skepticism and reluctant delight to
smug.

- Every beat is keyed to a word, as in the toon version: the kit's `take` clip on "Wait", a finger
  tapping on "every", "single" and "frame", a shrug on "Nothing?", jazz hands and a hop on "amazing",
  a turn away with her arms crossed on "Not that I needed the help", an eye roll and a toss of the
  head on "Obviously", then her head comes back round for a wink.
- Her ponytail swings on its own: its chain trails (`trail` in her tags), so the pose function swings
  it through the take, the hop, the turns and the toss without the scene doing anything.

    clap voice && clap build && clap render
    clap still 0 --entry scenes/lab-turn.js    # her turnaround, and her head from each drawing
    clap still 0 --entry scenes/lab-face.js    # expressions, eyes and lids, the mouth chart
    clap still 0 --entry scenes/lab-poses.js   # her poses, from the front and 3/4 either way
    clap frames 0 3.2 --entry scenes/lab-tail.js   # the ponytail: a nod, a hop, a turn, a take, a dash
