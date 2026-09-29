# Dex: the warehouse tour, in cut-out

The 3D intro's warehouse tour (`../clapper-intro`, the dock, walk and pick scenes) made again with
Dex, cut-out style, in the same 3D set. A label prints at the dock, he tears it off and reads it, walks
it over to its bin, sticks it on the order and scans it, and Tilly takes the pallet away.

It's the proof for the kit's layout pass (`/@kit/layout.js`):

- **Shots with fixed cameras.** `shotCamera({ pos, at, fov })` for each: the dock, the walk and the
  bin. Within a shot the camera doesn't move in 3D, as in TV cut-out.
- **The set, baked once per shot.** `bakeLayers` draws the 3D set (`scenes/world.js`) from each shot's
  camera when the page loads, into a picture behind Dex and one in front of him (stock on the aisle
  floor, which he walks behind).
- **Dex, placed by `project()`.** He stands and walks in the set's millimetres; `worldStand` and
  `worldWalk` put him on screen at the size the set is there, facing the camera at the angle his
  heading gives (a cut-out view, 0 to 4). His lines are drawn 2.4 px wide at any size (`line: 2.4`),
  as heavy as the set's ink.
- **Feet that don't slide.** The walk is walk3d's: each planted foot is a fixed point in the set,
  projected to the screen, and walkPose plants his leg there. `scenes/lab-feet.js` measures it: a
  planted foot moves at most 0.17 px between drawings.
- **What moves is drawn live.** The order and Tilly are drawn in 3D each frame by `liveLayer`, with
  the baked set holding them out (it hides what's behind it without drawing itself), so the racking
  hides Tilly's forks as they go into the bin. Everything is drawn in order of depth, so Tilly passes
  in front of Dex.

The set is the intro's, with the printer moved to the end of the desk so Dex can face the camera as he
works it. The voice is Callum (Dex's). Every name, label and number is made up.
