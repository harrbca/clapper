# Biscuit and Miso: cut-out pets

A 20-second meeting between two stock pets made from the cut-out kit (`/@kit/cutout.js`): Biscuit,
a golden puppy (`/@kit/characters/dog.js`), and Miso, a grey tabby (`/@kit/characters/cat.js`). A
narrator introduces them. Biscuit says hello with a paw and asks Miso to play with a bow. She turns
her nose up, then gives him a slow blink, which in cat means yes. A third pet, Clover, a rabbit
(`/@kit/characters/rabbit.js`), is on the lab pages.

Like Dex, each is data: a folder in `web/characters/` with `character.json` and SVG drawings (bodies,
heads and paws from every angle, the heads with places for the kit's eyes, brows and mouth), so they
blink, emote with the kit's 14 expressions, and could lip-sync to their own lines (`speaker`).

- **Four legs.** Four chains of kind `leg` (legFL, legFR, legBL, legBR: upper, lower, paw) on a root
  in the middle of the body. The legs are the kit's noodles and the paws small angle sets. As the body
  turns, the character's `turn.offsets` bring the front legs forward under the chest and the back legs
  back under the rump, and each chain's `layers` put the far legs behind the body. The near front leg
  goes in front of the body, under a `shoulders` layer (the body drawing clipped to the leg's top), so
  a raised paw passes in front of the chest. The legs hang from the root, not the body: when a pose
  tips the body (`body.r`), their spread from side to side stays level, and the pose moves their tops
  (`legFL.x`, `.y` ...) to where they are on the tipped body, so all four paws stay on the floor at 3/4.
- **Tails.** A chain of kind `tail` hung from a fixed base, drawn as one ribbon that stays as wide
  side on (`edge: 1`), and swung by trailChain about the pose it's in (`posed: true`): a sway from side
  to side is a wag, three times a second for Biscuit, slower for Miso. From behind, the tail comes in
  front of the body.
- **Poses, side on.** stand, sit, lie, pawUp, bow and wag for both, and beg for Biscuit. They're keyed
  facing right, with the paws (and a sitting rump) exactly on the floor, and played mirrored
  (`play(..., { mirror: true })`) to face left. A pose that tips the body forward or back only reads
  side on (bones turn in the picture plane), so they're for the 3/4 and profile views. From the front
  and back the pets stand, and in the scene they turn their heads to look at us.
- **Clover** has stand, crouch, sit (up tall), lie, hop and wag, long hind feet (a paw piece of their
  own), and a powder-puff tail: a ribbon pointed at both ends, drawn on her rump side on.
- **Between poses** the paws can dip, as poses blend turn by turn: `grounded` (in `scenes/pets.js`)
  plants any paw a move pushes below the floor back on it.

The narration is laid out with the draft voice (`clap voice --draft`), so it renders silent with
captions. `clap voice` would voice it with Bella (that costs ElevenLabs credits).

    clap voice --draft && clap build && clap render
    clap still 0 --entry scenes/lab.js           # each pet turned all the way round, every angle
    clap still 0 --entry scenes/lab-poses.js     # Biscuit's and Miso's poses at 3/4 and side on, and a wag
    clap still 0 --entry scenes/lab-face.js      # their mouth chart at three angles, and the expressions
    clap still 0 --entry scenes/lab-rabbit.js    # Clover's poses and expressions
    clap frames 0 2.4 --entry scenes/lab-turn.js      # turning all the way round, standing
    clap frames 2.4 4.4 --entry scenes/lab-turn.js    # turning while sitting, through the side views
    clap frames 0.2 1.5 --entry scenes/lab-wag.js     # tails wagging from several angles
    clap list dog                                # everything Biscuit understands (clap list cat, rabbit)
