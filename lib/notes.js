// Review notes: a note typed on a frame in the preview (press N), kept in notes.json in the project
// for whoever works on the video next. clap notes lists the open ones; clap notes done <id> [reply]
// closes one, saying what changed. Each note is { id, scene, t, frame, text, status ('open' or
// 'done'), at (when it was written), reply and doneAt (when it was closed), edited (when its words
// or its frame last changed) }. The preview's notes list changes, moves and deletes them too. Ids
// aren't used twice: the file keeps the last one given (lastId), so a note deleted can't come back
// as a different note under its number.
import fs from 'node:fs';

export const notesFile = P => P.file('notes.json');

function readFile(P) {
  const f = notesFile(P);
  if (!fs.existsSync(f)) return { notes: [], lastId: 0 };
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const notes = Array.isArray(j) ? j : j.notes || [];
  return { notes, lastId: Math.max(j.lastId || 0, ...notes.map(n => n.id)) };
}

export const readNotes = P => readFile(P).notes;

function writeNotes(P, notes, lastId) {
  const f = notesFile(P), tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ notes, lastId }, null, 2) + '\n');
  fs.renameSync(tmp, f);
}

function find(notes, id) {
  const note = notes.find(n => n.id === Number(id));
  if (!note) throw new Error(`there's no note ${id}${notes.length ? ` (the notes are ${notes.map(n => n.id).join(', ')})` : ' (there are none yet)'}`);
  return note;
}

const words = text => {
  if (typeof text !== 'string' || !text.trim()) throw new Error('a note needs some text');
  return text.trim().slice(0, 2000);
};

export function addNote(P, { scene, t, frame, text }) {
  const said = words(text);
  if (!Number.isFinite(t)) throw new Error('a note needs the time it is about');
  const { notes, lastId } = readFile(P), id = lastId + 1;
  const note = {
    id, scene: String(scene ?? ''), t: Math.round(t * 1000) / 1000, frame: Math.round(Number.isFinite(frame) ? frame : t * P.config.fps),
    text: said, status: 'open', at: new Date().toISOString(),
  };
  writeNotes(P, [...notes, note], id);
  return note;
}

export function setNote(P, id, status, reply) {
  if (status !== 'open' && status !== 'done') throw new Error(`a note is 'open' or 'done', not ${status}`);
  const { notes, lastId } = readFile(P), note = find(notes, id);
  note.status = status;
  if (status === 'done') { note.doneAt = new Date().toISOString(); if (reply) note.reply = reply; }
  else { delete note.doneAt; delete note.reply; }
  writeNotes(P, notes, lastId);
  return note;
}

// A note's words changed, or the note moved to another frame (t, with its frame and scene).
export function editNote(P, id, { text, t, frame, scene } = {}) {
  const { notes, lastId } = readFile(P), note = find(notes, id);
  if (text !== undefined) note.text = words(text);
  if (t !== undefined) {
    if (!Number.isFinite(t)) throw new Error('a note needs the time it is about');
    note.t = Math.round(t * 1000) / 1000;
    note.frame = Math.round(Number.isFinite(frame) ? frame : t * P.config.fps);
    if (scene !== undefined) note.scene = String(scene);
  }
  note.edited = new Date().toISOString();
  writeNotes(P, notes, lastId);
  return note;
}

export function removeNote(P, id) {
  const { notes, lastId } = readFile(P), note = find(notes, id);
  writeNotes(P, notes.filter(n => n !== note), lastId);
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
    console.log(`  ${String(n.id).padStart(3)}  ${n.scene.padEnd(10)} ${n.t.toFixed(2).padStart(7)} s  frame ${String(n.frame).padStart(5)}  ${n.status === 'done' ? '(done) ' : ''}${n.edited ? '(edited) ' : ''}${n.text}`);
    if (n.reply) console.log(`       ${''.padEnd(10)} reply: ${n.reply}`);
  }
}
