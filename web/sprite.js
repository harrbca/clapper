// Baked sprites: a 3D prop drawn from set angles as pictures (clap bake), for 2D scenes.
//   const printer = await loadSprite('assets/baked/printer/');
//   printer.draw(ctx, 45, { x: 700, y: 900 });
// (x, y) is where the prop's origin goes (for the kit's props, the middle of its footprint on the
// floor). scale 1 draws it at the size it was baked for (sprite.json's scale: pixels per unit at 1x),
// whatever resolution it was baked at, so it can be baked at 2x and stay sharp when the camera
// zooms in. The angle, in degrees (0 its front, 90 facing the screen's right), picks the nearest
// baked one; a negative angle with no drawing of its own shows the positive one mirrored.
export async function loadSprite(base) {
  const url = f => new URL(f, new URL(base, location.href)).href;
  const r = await fetch(url('sprite.json'), { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url('sprite.json')}: ${r.status === 404 ? 'not found (clap bake makes it)' : `HTTP ${r.status}`}`);
  const meta = await r.json();
  const views = await Promise.all(Object.entries(meta.angles).map(async ([a, s]) => {
    const img = new Image();
    img.src = url(s.file);
    try { await img.decode(); } catch { throw new Error(`${url(s.file)}: couldn't load it (clap bake makes it)`); }
    return { angle: Number(a), img, ...s };
  }));
  // the drawing for an angle, and whether it's mirrored
  const pick = angle => {
    const a = 180 - ((((180 - angle) % 360) + 360) % 360);      // -180 (not included) to 180
    const mirror = a < 0 && !views.some(s => s.angle < 0), want = mirror ? -a : a;
    return [views.reduce((best, s) => (Math.abs(s.angle - want) < Math.abs(best.angle - want) ? s : best)), mirror];
  };
  return {
    ...meta,
    views,
    // the size of the drawing for an angle at a scale, and where its origin is in it
    measure(angle = 0, scale = 1) {
      const [s] = pick(angle), k = scale / meta.res;
      return { w: s.w * k, h: s.h * k, anchor: [s.anchor[0] * k, s.anchor[1] * k] };
    },
    draw(ctx, angle = 0, { x = 0, y = 0, scale = 1, alpha = 1 } = {}) {
      const [s, mirror] = pick(angle), k = scale / meta.res;
      ctx.save();
      ctx.translate(x, y);
      if (mirror) ctx.scale(-1, 1);
      ctx.globalAlpha *= alpha;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(s.img, -s.anchor[0] * k, -s.anchor[1] * k, s.w * k, s.h * k);
      ctx.restore();
    },
  };
}
