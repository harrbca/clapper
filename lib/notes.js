// Review notes: a note typed on a frame in the preview (press N), kept in notes.json in the project
// for whoever works on the video next. clap notes lists the open ones; clap notes done <id> [reply]
// closes one, saying what changed. Each note is { id, scene, t, frame, text, status ('open' or
// 'done'), at (when it was written), reply and doneAt (when it was closed) }.
import fs from 'node:fs';

export const notesFile = P => P.file('notes.json');

export function readNotes(P) {
  const f = notesFile(P);
  if (!fs.existsSync(f)) return [];
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  return Array.isArray(j) ? j : j.notes || [];
}

function writeNotes(P, notes) {
  const f = notesFile(P), tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ notes }, null, 2) + '\n');
  fs.renameSync(tmp, f);
}

export function addNote(P, { scene, t, frame, text }) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('a note needs some text');
  if (!Number.isFinite(t)) throw new Error('a note needs the time it is about');
  const notes = readNotes(P), id = notes.reduce((m, n) => Math.max(m, n.id), 0) + 1;
  const note = {
    id, scene: String(scene ?? ''), t: Math.round(t * 1000) / 1000, frame: Math.round(Number.isFinite(frame) ? frame : t * P.config.fps),
    text: text.trim().slice(0, 2000), status: 'open', at: new Date().toISOString(),
  };
  writeNotes(P, [...notes, note]);
  return note;
}

export function setNote(P, id, status, reply) {
  const notes = readNotes(P), note = notes.find(n => n.id === Number(id));
  if (!note) throw new Error(`there's no note ${id}${notes.length ? ` (they go from 1 to ${notes.at(-1).id})` : ' (there are none yet)'}`);
  note.status = status;
  if (status === 'done') { note.doneAt = new Date().toISOString(); if (reply) note.reply = reply; }
  else { delete note.doneAt; delete note.reply; }
  writeNotes(P, notes);
  return note;
}

// clap notes [all | done <id> [reply...] | reopen <id>]
export function notesCommand(P, [what, id, ...reply]) {
  if (what === 'done' || what === 'reopen') {
    const note = setNote(P, id, what === 'done' ? 'done' : 'open', reply.join(' ').trim());
    console.log(`  note ${note.id} ${what === 'done' ? `done${note.reply ? `: ${note.reply}` : ''}` : 'open again'}`);
    return;
  }
  if (what && what !== 'all') throw new Error(`clap notes [all | done <id> [reply] | reopen <id>], not ${what}`);
  const notes = readNotes(P).filter(n => what === 'all' || n.status === 'open');
  if (!notes.length) return console.log(`  no ${what === 'all' ? '' : 'open '}notes${fs.existsSync(notesFile(P)) ? '' : ' (press N in clap preview to write one)'}`);
  for (const n of notes) {
    console.log(`  ${String(n.id).padStart(3)}  ${n.scene.padEnd(10)} ${n.t.toFixed(2).padStart(7)} s  frame ${String(n.frame).padStart(5)}  ${n.status === 'done' ? '(done) ' : ''}${n.text}`);
    if (n.reply) console.log(`       ${''.padEnd(10)} reply: ${n.reply}`);
  }
}
