// SVG drawings as pieces: an SVG file read once into drawing steps, then replayed onto the canvas
// every frame, in the piece's own space (the SVG's coordinates are the piece's; its viewBox is only
// for looking at it in an editor). Replayed as canvas calls rather than drawn as a picture, so lines
// stay vector-sharp at any zoom and the pixels match the kit's own drawings.
//
// What it reads (anything else in the SVG's namespace is an error, so a drawing never quietly loses
// a part; editors' own elements and attributes are ignored):
//   <path d fill stroke stroke-width stroke-linecap stroke-linejoin>   filled first, then stroked
//   <rect x y width height fill>                                       a filled box
//   <polyline points stroke stroke-width>, <line x1 y1 x2 y2 ...>      a stroked line
//   <circle cx cy r>, <ellipse cx cy rx ry>                            as paths
//   <g transform clip-path>        translate, scale, rotate (degrees) and matrix; clip-path="url(#id)"
//   <clipPath id>                  its shapes, together, clip what refers to it
//   <g data-feature="eye" data-side="-1" data-look="0.35" transform="...">
//                                  a place for a kit feature (an eye, a brow, a mouth), drawn by the
//                                  kit with the pose; its data- attributes are the feature's options
//   <path data-morph="jaw" data-morph-at="30" data-morph-d="...">
//                                  a shape key: the path's numbers move towards data-morph-d as the
//                                  value named (here the jaw drop, in px) goes from 0 to data-morph-at.
//                                  Both d strings need the same commands.
// Strokes are round-capped and round-joined unless the SVG says otherwise, as the kit's ink is.

const SVGNS = 'http://www.w3.org/2000/svg';
const IGNORE = new Set(['defs', 'title', 'desc', 'metadata', 'style']);

// A d string as tokens: command letters and numbers.
const tokens = d => d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) || [];

function transformOps(s, where) {
  const ops = [];
  for (const m of (s || '').matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const n = m[2].split(/[\s,]+/).filter(Boolean).map(Number);
    const kind = m[1];
    if (kind === 'translate') ops.push(['translate', n[0], n[1] ?? 0]);
    else if (kind === 'scale') ops.push(['scale', n[0], n[1] ?? n[0]]);
    else if (kind === 'rotate') ops.push(n.length === 3 ? ['rotateAbout', (n[0] * Math.PI) / 180, n[1], n[2]] : ['rotate', (n[0] * Math.PI) / 180]);
    else if (kind === 'matrix') ops.push(['transform', ...n]);
    else throw new Error(`${where}: the transform ${kind}() isn't supported (translate, scale, rotate and matrix are)`);
  }
  return ops;
}

function paint(el, kind) {
  const attr = (a, d) => el.getAttribute(a) ?? d;
  const fill = attr('fill', kind === 'path' || kind === 'rect' ? '#000000' : 'none');
  const stroke = attr('stroke', 'none');
  return {
    fill: fill === 'none' ? null : fill,
    stroke: stroke === 'none' ? null : stroke,
    width: Number(attr('stroke-width', 1)),
    cap: attr('stroke-linecap', 'round'),
    join: attr('stroke-linejoin', 'round'),
  };
}

function shapePath(el, where) {
  const n = a => Number(el.getAttribute(a) || 0);
  const p = new Path2D();
  switch (el.localName) {
    case 'circle': p.ellipse(n('cx'), n('cy'), n('r'), n('r'), 0, 0, Math.PI * 2); return p;
    case 'ellipse': p.ellipse(n('cx'), n('cy'), n('rx'), n('ry'), 0, 0, Math.PI * 2); return p;
    case 'rect': p.rect(n('x'), n('y'), n('width'), n('height')); return p;
    case 'path': return new Path2D(el.getAttribute('d') || '');
    default: throw new Error(`${where}: <${el.localName}> can't be a clip path`);
  }
}

function readNode(el, clips, where) {
  const kind = el.localName, at = `${where} <${kind}${el.id ? ` id="${el.id}"` : ''}>`;
  if (el.namespaceURI !== SVGNS || IGNORE.has(kind)) return null;
  if (kind === 'clipPath') {
    const shapes = [...el.children].filter(c => c.namespaceURI === SVGNS).map(c => shapePath(c, at));
    const p = new Path2D();
    for (const s of shapes) p.addPath(s);
    clips[el.id] = p;
    return null;
  }
  if (kind === 'g' || kind === 'svg') {
    const data = {};
    for (const a of el.attributes) if (a.name.startsWith('data-')) data[a.name.slice(5)] = a.value;
    const clip = /url\(#([^)]+)\)/.exec(el.getAttribute('clip-path') || '')?.[1];
    return { kind: 'g', ops: kind === 'g' ? transformOps(el.getAttribute('transform'), at) : [], clip, feature: data.feature, data, children: readChildren(el, clips, where) };
  }
  if (kind === 'path') {
    const d = el.getAttribute('d') || '', node = { kind, ...paint(el, kind), path: new Path2D(d) };
    const key = el.getAttribute('data-morph');
    if (key) {
      const a = tokens(d), b = tokens(el.getAttribute('data-morph-d') || ''), span = Number(el.getAttribute('data-morph-at') || 1);
      if (a.length !== b.length || a.some((t, i) => isNaN(t) !== isNaN(b[i]) || (isNaN(t) && t !== b[i]))) throw new Error(`${at}: data-morph-d must have the same commands and number count as d`);
      // each number's rate of change per unit of the value, so that shape = start + rate * value
      node.morph = { key, parts: a.map((t, i) => (isNaN(t) ? t : [Number(t), (Number(b[i]) - Number(t)) / span])) };
    }
    return node;
  }
  if (kind === 'rect') {
    const n = a => Number(el.getAttribute(a) || 0), p = paint(el, kind);
    if (p.stroke) return { kind: 'path', ...p, path: shapePath(el, at) };
    return { kind, fill: p.fill, x: n('x'), y: n('y'), w: n('width'), h: n('height') };
  }
  if (kind === 'polyline' || kind === 'line') {
    const pts = kind === 'line' ? [[+el.getAttribute('x1'), +el.getAttribute('y1')], [+el.getAttribute('x2'), +el.getAttribute('y2')]]
      : (el.getAttribute('points') || '').trim().split(/\s+/).map(pr => pr.split(',').map(Number));
    const path = new Path2D();
    pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
    return { kind: 'path', ...paint(el, kind), path };
  }
  if (kind === 'circle' || kind === 'ellipse') return { kind: 'path', ...paint(el, 'path'), path: shapePath(el, at) };
  throw new Error(`${at} isn't something the kit draws yet (it draws path, rect, polyline, line, circle, ellipse, g and clipPath)`);
}

function readChildren(el, clips, where) {
  return [...el.children].map(c => readNode(c, clips, where)).filter(Boolean);
}

// Reads an SVG's text into a drawing. `where` names it (a file), for errors.
export function readSVG(text, where = 'an SVG') {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const bad = doc.querySelector('parsererror');
  if (bad) throw new Error(`${where} isn't valid SVG: ${bad.textContent.split('\n')[0]}`);
  const root = doc.documentElement;
  if (root.localName !== 'svg') throw new Error(`${where} isn't an SVG (its root is <${root.localName}>)`);
  const clips = {};
  // clip paths first, wherever they are, so a group can refer to one defined after it
  for (const c of root.getElementsByTagNameNS(SVGNS, 'clipPath')) readNode(c, clips, where);
  const children = readChildren(root, clips, where);
  const missing = [];
  const walk = ns => ns.forEach(n => { if (n.clip && !clips[n.clip]) missing.push(n.clip); if (n.children) walk(n.children); });
  walk(children);
  if (missing.length) throw new Error(`${where} refers to clip path${missing.length > 1 ? 's' : ''} ${missing.join(', ')}, which ${missing.length > 1 ? "aren't" : "isn't"} there`);
  return { where, children, clips, features: new Set(featureNames(children)) };
}

function featureNames(ns) { return ns.flatMap(n => [...(n.feature ? [n.feature] : []), ...(n.children ? featureNames(n.children) : [])]); }

const morphed = (m, value) => new Path2D(m.parts.map(p => (typeof p === 'string' ? p : String(p[0] + p[1] * value))).join(' '));

function run(ctx, nodes, drawing, env) {
  for (const n of nodes) {
    if (n.kind === 'g') {
      ctx.save();
      for (const [op, ...a] of n.ops) {
        if (op === 'rotateAbout') { ctx.translate(a[1], a[2]); ctx.rotate(a[0]); ctx.translate(-a[1], -a[2]); } else ctx[op](...a);
      }
      if (n.clip) ctx.clip(drawing.clips[n.clip]);
      if (n.feature) {
        const f = env.features?.[n.feature];
        if (!f) throw new Error(`${drawing.where} has a place for a ${n.feature}, which nothing draws`);
        f(ctx, env, n.data);
      }
      run(ctx, n.children, drawing, env);
      ctx.restore();
    } else if (n.kind === 'rect') {
      if (n.fill) { ctx.fillStyle = n.fill; ctx.fillRect(n.x, n.y, n.w, n.h); }
    } else {
      const path = n.morph ? morphed(n.morph, env.vars?.[n.morph.key] ?? 0) : n.path;
      if (n.fill) { ctx.fillStyle = n.fill; ctx.fill(path); }
      if (n.stroke) { ctx.lineWidth = n.width; ctx.strokeStyle = n.stroke; ctx.lineJoin = n.join; ctx.lineCap = n.cap; ctx.stroke(path); }
    }
  }
}

// Draws a drawing (from readSVG) in the current space. env: { pose, vars (values shape keys read,
// like the jaw), features ({ eye: (ctx, env, data) => ... }) }.
export function drawSVG(ctx, drawing, env = {}) { run(ctx, drawing.children, drawing, env); }
