// clap list [character]: a character's vocabulary, from its bones, tags and chains to its pose keys,
// poses, expressions and clips, with the kit's named shots and easings. The character is loaded in
// the stage page as a scene loads it (web/list.js), so the list is what scenes get. Without a name,
// the kit's characters, and which of them are declared (defineCharacter) and so can be listed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, openStage, shutdown } from './browser.js';
import { serve } from './server.js';

const CHARACTERS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web', 'characters');

export async function list(P, name) {
  if (!name) return listKit();
  const server = await serve(P), browser = await launch();
  try {
    const page = await openStage(browser, server, P, { entry: `@kit/list.js?character=${encodeURIComponent(name)}` });
    const out = await page.evaluate(() => window.clapList);
    if (out.error) throw new Error(`couldn't load ${out.src}: ${out.error}`);
    if (!out.characters.length) throw new Error(`${out.src} has no declared character (made with defineCharacter or defineCutout) to list`);
    for (const c of out.characters) printCharacter(c, out.src);
    printKit(out);
  } finally {
    await shutdown(browser);
    server.close();
  }
}

function listKit() {
  console.log('  The kit\'s characters (clap list <name> for one of the declared ones):');
  for (const f of fs.readdirSync(CHARACTERS).filter(f => f.endsWith('.js')).sort()) {
    const src = fs.readFileSync(path.join(CHARACTERS, f), 'utf8'), folder = f.replace(/\.js$/, '');
    const data = fs.existsSync(path.join(CHARACTERS, folder, 'character.json'));
    const declared = /\bdefine(Cutout|Character)\(/.test(src);
    const kind = data ? `declared, as data (characters/${folder}/)` : declared ? 'declared' : /three|toon3d|rig3d/.test(src) ? '3D, not declared' : 'toon Puppet, not declared';
    console.log(`    ${f.replace(/\.js$/, '').padEnd(10)} ${kind}`);
  }
}

// Prints `items` after a label, wrapped to the terminal's width.
function row(label, items, sep = ', ') {
  const width = Math.max(60, (process.stdout.columns || 100) - 2), pad = ' '.repeat(16);
  let line = `  ${label.padEnd(14)}`, out = [];
  items.forEach((s, i) => {
    const piece = s + (i < items.length - 1 ? sep : '');
    if (line.length + piece.length > width && line.trim()) { out.push(line.trimEnd()); line = pad; }
    line += piece;
  });
  out.push(line.trimEnd());
  console.log(out.join('\n'));
}

function printCharacter(c, src) {
  console.log(`\n  ${c.name} (${c.id}, version ${c.version}${c.height ? `, ${c.height} px tall` : ''}), from ${src}\n`);
  row('tags', Object.entries(c.tags).map(([t, b]) => `${t} ${b}`));
  row('chains', Object.entries(c.chains).map(([n, ch]) => `${n}: ${ch.bones.join(' > ')}${[ch.side, ch.kind, ch.bend && `bends ${ch.bend}`].filter(Boolean).length ? ` (${[ch.side, ch.kind, ch.bend && `bends ${ch.bend}`].filter(Boolean).join(', ')})` : ''}`), '; ');
  row('bones', c.bones.map(b => `${b.name}${b.parent ? ` < ${b.parent}` : ' (root)'}${b.piece ? ` [${b.piece}]` : ''}`));
  // "angle 4 (back)" as "4 back", so a piece's drawings wrap as a list
  const short = v => v.replace(/^\w+ (\d+) \((.+)\)$/, '$1 $2');
  Object.entries(c.pieces).forEach(([n, p], i) => {
    const head = `${n}: ${p.kind}${p.on ? ` on ${p.on}` : ''}${p.variants.length ? ':' : ''}`;
    const stand = p.fallback ? [`(${Object.entries(p.fallback).map(([a, b]) => `${b} stands in for ${a}`).join(', ')})`] : [];
    row(i ? '' : 'pieces', [head, ...p.variants.map(short), ...stand], ' ');
  });
  row('keys', Object.entries(c.keys).map(([k, s]) => (s.shape ? `${k} (${s.shape.length} drawings)` : s.range ? `${k} ${s.range[0]} to ${s.range[1]}` : k)));
  row('bone keys', ['<bone>.r (radians)', '.x', '.y', '.s', '.sx', '.sy', '.z (draw order)']);
  if (Object.keys(c.limits || {}).length) row('limits', Object.entries(c.limits).map(([b, [lo, hi]]) => `${b} ${lo} to ${hi}`));
  row('poses', c.poses);
  row('expressions', c.expressions);
  row('clips', Object.entries(c.clips).map(([n, k]) => (k.params ? `${n}(${k.params.join(', ')})` : `${n} (${k.dur} s)`)));
}

function printKit(out) {
  console.log('');
  row('shots', Object.entries(out.shots).map(([k, note]) => `${k} (${note})`), '; ');
  row('easings', out.easings.map(e => `E.${e}`));
}
