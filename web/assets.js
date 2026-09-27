// Images and fonts, loaded before the first frame so every frame can draw synchronously.

export const IMG = {};

// { key: 'assets/screens/home.png', ... }, paths relative to the project folder.
export function loadImages(map) {
  return Promise.all(Object.entries(map).map(([key, src]) => new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => { IMG[key] = im; resolve(im); };
    im.onerror = () => reject(new Error(`could not load image ${src}`));
    im.src = src.startsWith('/') || /^[a-z]+:/.test(src) ? src : '/' + src;
  })));
}

// video.json's fonts: [{ family, weight, style, src }]. Without a src, an installed font is waited for.
export async function loadFonts(list = []) {
  for (const f of list) {
    const weight = String(f.weight ?? 400), style = f.style ?? 'normal';
    if (f.src) {
      const face = new FontFace(f.family, `url("/${f.src}")`, { weight, style });
      document.fonts.add(await face.load());
    } else {
      await document.fonts.load(`${style} ${weight} 40px "${f.family}"`);
    }
  }
}
