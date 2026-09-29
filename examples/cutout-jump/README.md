# Dex: the jump

A 9-second stress test of the cut-out rig: Dex jumps off a work table, does a forward flip, and
lands like a superhero. Then his knee.

- **Key poses first** (`scenes/keys.js`, shown by `lab-keys.js`): stand, crouch, take-off, tuck,
  open, impact, the hero landing and the look up. The in-betweens are `choreo` eases between them.
- **Contacts by IK:** feet stay planted through the crouch (`plant` from cutout.js), the hands grab
  the shins in the tuck, and the landing's knee, front foot and fist are placed on the floor. Each
  contact eases in and out (`mixKeys`).
- **The flight:** his feet follow an arc from the table to the floor, and the flip turns the whole
  puppet round his hips (`hips.r`), fastest in the middle of the tuck.
- **A swap of angle on impact:** profile in the air, 3/4 on the landing frame, as a cut-out show
  cuts drawings.
- **On twos throughout,** his place and contacts too, so he touches down on the frame his landing
  pose does, and the flash, dust, cracks and camera shake start on that frame.
- Squash and stretch on take-off and landing, speed lines, a swoosh round the flip, a table that
  rocks after he leaves it.

Dex is voiced by Callum (ElevenLabs); the lines are cached in `audio/`.

    clap voice && clap build && clap render
    clap still 0 --entry scenes/lab-keys.js    # the key poses and their contacts
