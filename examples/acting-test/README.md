# Pip: acting test

An 18-second acting test, the way animators prove a rig: Pip, the kit's stock toon character
(`/@kit/characters/pip.js`), reacts across four lines, from surprise through skepticism and
reluctant delight to smug, with an eye roll and a wink.

- Animated on twos, as TV animation is: each drawing is held for two frames. (So no motion blur:
  blur across a change of drawing shows both drawings at once.)
- Every beat is keyed to a word in the narration: the take on "Wait", a finger tapping on "every",
  "single" and "frame", a shrug on "Nothing?", jazz hands on "amazing", the eye roll on "Obviously".
- Moves wind up before they go (`anticipate`), land fast (`E.snap`), and settle on springs, the
  shoulder leading and the hand trailing.
- The face is `EXPR` expressions keyed like any pose: surprised, skeptical, shocked, deadpan,
  delighted, smug. Each brow and lid moves on its own, pupils shrink, the jaw drops and stretches
  the face, and the mouth has teeth, gums and a tongue.

    clap voice && clap build && clap render
    clap still 0 --entry scenes/lab.js     # Pip's poses, expressions and mouth chart
    clap still 0 --entry scenes/lab-turn.js  # her turnaround, and arms crossing the face
