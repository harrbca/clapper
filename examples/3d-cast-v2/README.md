# Tilly and Pip in 3D (shared style)

A copy of [`3d-cast`](../3d-cast) in the kit's shared style: `"style": {"ink": "#1D1A24", "line": 3.4, "line3d": 3}` in `video.json`, so the 2D and 3D kits draw one ink colour and matching line weights (see style.js in the README). The original keeps its own look. The voice cache is copied, so `clap voice` costs no credits.

A 14-second pantomime, all in three.js: Pip, rebuilt in 3D, admires her new hands; Tilly the
forklift robot drives in behind her beeping, carrying a crate up high, and brakes; the crate rocks,
Pip panics, it holds; they wave, cheer, and Pip gives us a thumbs up and a wink. No dialogue, just
sound effects on the beats.

- Cel shading and ink outlines (`toon3d.js`), so the 3D matches the 2D characters.
- Pip's rig: IK hands and feet, palms aimed where they should face, eyeballs under blinking lids,
  the 2D Pip's mouth and expressions painted onto her face, a ponytail on springs.
- Tilly: wheels that roll with the distance driven, a chassis that pitches as she brakes, a cab
  that turns to look, a screen face, a spinning beacon, and forks that carry the crate.
- The camera moves in 3D: a close-up, a pull back to reveal Tilly, and an orbit to finish.

    clap build && clap render
    clap still 0 --entry scenes/lab-tilly.js   # Tilly from four sides, in four moods
    clap still 0 --entry scenes/lab-pip.js     # Pip from four sides
    clap still 0 --entry scenes/lab-hands.js   # Pip close: hands and faces
