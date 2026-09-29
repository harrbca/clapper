# Pip and Gus: dialogue (shared style)

A copy of [`dialogue`](../dialogue) in the kit's shared style: `"style": {"ink": "#1D1A24", "line": 3.4, "line3d": 3}` in `video.json`, so the 2D and 3D kits draw one ink colour and matching line weights (see style.js in the README). The original keeps its own look. The voice cache is copied, so `clap voice` costs no credits.

A 21-second two-hander: Gus, an old-school animator, and Pip, who thinks Clapper has made that
obsolete. Five lines, each character voiced by their own ElevenLabs voice (`cast` in script.json),
and each lip-synced to their own lines only (`speaker`).

- Cut like a sitcom: a two-shot, then hard cuts to a single on whoever is speaking, the other one's
  shoulder and head at the edge of frame, each shot creeping in as it runs (`camera` in acting.js).
- Both stand turned 3/4 towards each other (`body.turn`), and their eyes and heads find each other.
  Pip looks at us on "mostly"; Gus turns his back on "Hmph" and side-eyes her at the end.
- Listening is acting too: Pip nods along, lights up before she speaks, and her smile falters on
  "Oh yeah?"; Gus sours on "draws", slides his glasses down to peer over them, and points at her.
- A breakdown pose on the way up to the head-scratch, so her hand arcs up by her shoulder instead of
  swinging out wide.

    clap voice && clap build && clap render
    clap still 0 --entry scenes/lab.js     # Gus turning round, face to face with Pip, his expressions
