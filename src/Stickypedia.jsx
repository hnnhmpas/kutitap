// STICKY-PEDIA: floating 8-bit sticky notes.
//   NotesListModal    the list window (starts at the Claw Machine window size; resizable and draggable)
//   StickyNoteWindow  one floating note (50% of the list window; resizable 50% - 150%; mouse handles + pinch)
//   NoteColorPicker   the 5 theme colors
//   DeleteConfirmModal  "Delete this note permanently?"
// All note data lives in the `notes` array saved in Firebase (see stickyNotes.js for the schema), so open/closed,
// position, size, color and text survive tab changes, reloads and other devices.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './Stickypedia.css';
import notesIcon from './assets/ui/notes-icon.png';
import {
  MAX_NOTES, MAX_CHARS, LIST_W, LIST_H, NOTE_W, NOTE_H, NOTE_MIN, NOTE_MAX, COLORS, colorOf, clamp, stamp,
  cleanRich, editorHtml, snippet, cleanNotes, newNote,
} from './stickyNotes';

const HANDLES = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] };

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

// ---------------------------------------------------------------- NoteColorPicker
export function NoteColorPicker({ value, onPick }) {
  return (
    <span className="sp-colors" role="radiogroup" aria-label="Note color">
      {COLORS.map((c) => (
        <button
          type="button"
          key={c.id}
          role="radio"
          aria-checked={c.id === value}
          className={`sp-sw${c.id === value ? ' on' : ''}`}
          style={{ background: c.head }}
          title={c.name}
          aria-label={c.name}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onPick(c.id)}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- DeleteConfirmModal
export function DeleteConfirmModal({ onYes, onNo }) {
  const no = useRef(null);
  useEffect(() => {
    if (no.current) no.current.focus();
    const onKey = (e) => { if (e.key === 'Escape') onNo(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNo]);
  return (
    <div className="sp-root sp-modal-back" onClick={onNo}>
      <div className="sp-modal" role="alertdialog" aria-modal="true" aria-label="Delete this note permanently?" onClick={(e) => e.stopPropagation()}>
        <span className="sp-modal-bang" aria-hidden="true">!</span>
        <p>Delete this note permanently?</p>
        <div className="sp-modal-btns">
          <button type="button" className="sp-btn danger" onClick={onYes}>[ YES ]</button>
          <button type="button" className="sp-btn" ref={no} onClick={onNo}>[ NO ]</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- editor + toolbar of one note
function NoteEditor({ note, autoFocus, onText }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const good = useRef({ html: '', text: '' }); // last valid content (used if something slips past the limit)
  const latest = useRef(note);
  latest.current = note;
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const [count, setCount] = useState(0);
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strikeThrough: false });

  const caretToEnd = () => {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel) return;
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    sel.removeAllRanges();
    sel.addRange(r);
  };

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const el = ref.current;
    if (!el) return;
    const { html, text } = cleanRich(el.innerHTML);
    if (html !== (latest.current.formatting || '') || text !== (latest.current.content || '')) onTextRef.current(text, html);
  }, []);

  // load the note into the editor when it opens, and when it changed somewhere else (other device)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mine = cleanRich(el.innerHTML).html;
    const theirs = cleanRich(editorHtml(note)).html;
    if (mine === theirs && el.dataset.ready) return;
    if (document.activeElement === el && el.dataset.ready) return; // never overwrite what is being typed
    el.innerHTML = editorHtml(note);
    el.dataset.ready = '1';
    const c = cleanRich(el.innerHTML);
    good.current = c;
    setCount(c.text.length);
  }, [note.id, note.formatting, note.content]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoFocus && ref.current) { ref.current.focus(); caretToEnd(); }
  }, [autoFocus]);

  // save pending text when the note window goes away
  useEffect(() => {
    const el = ref.current;
    return () => {
      clearTimeout(timer.current);
      if (!el) return;
      const { html, text } = cleanRich(el.innerHTML);
      if (html !== (latest.current.formatting || '')) onTextRef.current(text, html);
    };
  }, []);

  const afterChange = () => {
    const el = ref.current;
    const c = cleanRich(el.innerHTML);
    if (c.text.length > MAX_CHARS) { // hard limit: put back the last valid text
      el.innerHTML = editorHtml({ formatting: good.current.html });
      caretToEnd();
      return;
    }
    good.current = c;
    setCount(c.text.length);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 400);
  };

  // block typing / pasting beyond 159 characters
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onBefore = (e) => {
      const cur = cleanRich(el.innerHTML).text.length;
      const sel = window.getSelection();
      const selLen = sel && sel.rangeCount && el.contains(sel.anchorNode) ? sel.toString().length : 0;
      const t = e.inputType || '';
      if (t === 'insertFromPaste' || t === 'insertFromDrop' || t === 'insertReplacementText') {
        e.preventDefault();
        const txt = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || '';
        const room = MAX_CHARS - (cur - selLen);
        if (txt && room > 0) document.execCommand('insertText', false, txt.slice(0, room));
        return;
      }
      if (t === 'insertText' && e.data && cur - selLen + e.data.length > MAX_CHARS) e.preventDefault();
    };
    el.addEventListener('beforeinput', onBefore);
    return () => el.removeEventListener('beforeinput', onBefore);
  }, []);

  // toolbar state follows the caret
  useEffect(() => {
    const onSel = () => {
      const el = ref.current;
      const sel = window.getSelection();
      if (!el || !sel || !sel.rangeCount || !el.contains(sel.anchorNode)) return;
      setFmt({
        bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'), strikeThrough: document.queryCommandState('strikeThrough'),
      });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  const exec = (cmd) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand('styleWithCSS', false, false);
    document.execCommand(cmd, false, null);
    setFmt((f) => ({ ...f, [cmd]: document.queryCommandState(cmd) }));
    afterChange();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = window.getSelection();
      const selLen = sel && sel.rangeCount ? sel.toString().length : 0;
      if (cleanRich(ref.current.innerHTML).text.length - selLen + 1 <= MAX_CHARS) document.execCommand('insertLineBreak');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      const map = { b: 'bold', i: 'italic', u: 'underline' };
      if (map[k]) { e.preventDefault(); exec(map[k]); }
    }
  };

  const tools = [
    ['bold', 'B', 'Bold (Ctrl+B)'], ['italic', 'I', 'Italic (Ctrl+I)'], ['underline', 'U', 'Underline (Ctrl+U)'], ['strikeThrough', 'S', 'Strikethrough'],
  ];
  return (
    <>
      <div
        ref={ref}
        className={`sp-editor${count === 0 ? ' is-empty' : ''}`}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        role="textbox"
        aria-multiline="true"
        aria-label="Note text"
        data-ph="Write a note..."
        onInput={afterChange}
        onKeyDown={onKeyDown}
        onBlur={flush}
      />
      <div className="sp-foot">
        <span className="sp-tools" role="toolbar" aria-label="Text formatting">
          {tools.map(([cmd, label, title]) => (
            <button
              type="button"
              key={cmd}
              className={`sp-tool t-${cmd}${fmt[cmd] ? ' on' : ''}`}
              title={title}
              aria-label={title}
              aria-pressed={fmt[cmd]}
              onMouseDown={(e) => e.preventDefault()} // keep the text selection
              onClick={() => exec(cmd)}
            >{label}</button>
          ))}
        </span>
        <span className={`sp-count${count >= MAX_CHARS ? ' full' : ''}`} aria-live="polite">{count}/{MAX_CHARS}</span>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- StickyNoteWindow
export function StickyNoteWindow({ note, z, autoFocus, onFront, onPatch, onText, onClose, onDelete }) {
  const vp = useViewport();
  const c = colorOf(note.color);
  const minW = NOTE_W * NOTE_MIN;
  const maxW = NOTE_W * NOTE_MAX;
  const minH = NOTE_H * NOTE_MIN;
  const maxH = NOTE_H * NOTE_MAX;
  const fromNote = () => ({
    x: (note.position && note.position.x) || 40,
    y: (note.position && note.position.y) || 40,
    w: clamp((note.size && note.size.w) || NOTE_W, minW, maxW),
    h: clamp((note.size && note.size.h) || NOTE_H, minH, maxH),
  });
  const [geo, setGeo] = useState(fromNote);
  const [picking, setPicking] = useState(false);
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const setG = (g) => { geoRef.current = g; setGeo(g); }; // keep the ref current even before React re-renders
  const act = useRef(null);
  const pointers = useRef(new Map());

  useEffect(() => { if (!act.current) setGeo(fromNote()); }, [note.position && note.position.x, note.position && note.position.y, note.size && note.size.w, note.size && note.size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  // always keep the window on screen (also on a smaller screen than the one it was saved on)
  const w = Math.min(geo.w, Math.max(80, vp.w - 8));
  const h = Math.min(geo.h, Math.max(80, vp.h - 8));
  const x = clamp(geo.x, 0, Math.max(0, vp.w - w));
  const y = clamp(geo.y, 0, Math.max(0, vp.h - h));

  const commit = () => {
    const g = geoRef.current;
    const was = fromNote();
    if (Math.round(g.x) === Math.round(was.x) && Math.round(g.y) === Math.round(was.y) && Math.round(g.w) === Math.round(was.w) && Math.round(g.h) === Math.round(was.h)) return;
    onPatch({ position: { x: Math.round(g.x), y: Math.round(g.y) }, size: { w: Math.round(g.w), h: Math.round(g.h) } });
  };
  const finish = () => { if (act.current) { act.current = null; commit(); } };

  // drag by the header
  const startDrag = (e) => {
    onFront();
    act.current = { type: 'drag', dx: e.clientX - x, dy: e.clientY - y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e) => {
    const a = act.current;
    if (!a || a.type !== 'drag') return;
    setG({ ...geoRef.current, x: clamp(e.clientX - a.dx, 0, Math.max(0, vp.w - w)), y: clamp(e.clientY - a.dy, 0, Math.max(0, vp.h - h)) });
  };

  // resize with the 8 handles (mouse or touch drag)
  const startResize = (dir) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFront();
    act.current = { type: 'resize', dir, px: e.clientX, py: e.clientY, g: { x, y, w, h } };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveResize = (e) => {
    const a = act.current;
    if (!a || a.type !== 'resize') return;
    const [sx, sy] = HANDLES[a.dir];
    const nw = sx ? clamp(a.g.w + sx * (e.clientX - a.px), minW, Math.min(maxW, vp.w - 8)) : a.g.w;
    const nh = sy ? clamp(a.g.h + sy * (e.clientY - a.py), minH, Math.min(maxH, vp.h - 8)) : a.g.h;
    setG({ w: nw, h: nh, x: sx < 0 ? a.g.x + (a.g.w - nw) : a.g.x, y: sy < 0 ? a.g.y + (a.g.h - nh) : a.g.y });
  };

  // two-finger pinch anywhere on the note
  const onRootDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [p, q] = [...pointers.current.values()];
      act.current = { type: 'pinch', d0: Math.hypot(p.x - q.x, p.y - q.y) || 1, g: { x, y, w, h } };
    }
  };
  const onRootMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const a = act.current;
    if (a && a.type === 'pinch' && pointers.current.size === 2) {
      const [p, q] = [...pointers.current.values()];
      const f = Math.hypot(p.x - q.x, p.y - q.y) / a.d0;
      const nw = clamp(a.g.w * f, minW, Math.min(maxW, vp.w - 8));
      const nh = clamp(a.g.h * f, minH, Math.min(maxH, vp.h - 8));
      setG({ w: nw, h: nh, x: a.g.x - (nw - a.g.w) / 2, y: a.g.y - (nh - a.g.h) / 2 });
    }
  };
  const onRootUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (act.current && act.current.type === 'pinch' && pointers.current.size < 2) finish();
  };

  return (
    <div
      className="sp-root sp-note"
      style={{ left: x, top: y, width: w, height: h, zIndex: z, '--c-body': c.body, '--c-head': c.head }}
      role="dialog"
      aria-label="Sticky note"
      onPointerDownCapture={onFront}
      onPointerDown={onRootDown}
      onPointerMove={onRootMove}
      onPointerUp={onRootUp}
      onPointerCancel={onRootUp}
    >
      <div className="sp-note-in">
        <div className="sp-note-head" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finish} onPointerCancel={finish} title="Drag to move">
          {picking ? (
            <NoteColorPicker value={note.color} onPick={(id) => { onPatch({ color: id }, true); setPicking(false); }} />
          ) : (
            <>
              <span className="sp-grip" aria-hidden="true" />
              <span className="sp-head-btns" onPointerDown={(e) => e.stopPropagation()}>
                <button type="button" className="sp-ibtn" title="Change color" aria-label="Change color" onClick={() => setPicking(true)}><i className="sp-sw-ico" /></button>
                <button type="button" className="sp-ibtn" title="Delete note" aria-label="Delete note" onClick={onDelete}><i className="sp-trash" /></button>
                <button type="button" className="sp-ibtn" title="Close (the note stays in Sticky-pedia)" aria-label="Close note" onClick={onClose}><i className="sp-x" /></button>
              </span>
            </>
          )}
        </div>
        <NoteEditor note={note} autoFocus={autoFocus} onText={onText} />
      </div>
      {Object.keys(HANDLES).map((dir) => (
        <i key={dir} className={`sp-h ${dir}`} onPointerDown={startResize(dir)} onPointerMove={moveResize} onPointerUp={finish} onPointerCancel={finish} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- list card
function NoteCard({ note, onOpen, onColor, onAskDelete }) {
  const [picking, setPicking] = useState(false);
  const c = colorOf(note.color);
  return (
    <li className="sp-card" style={{ '--c-body': c.body, '--c-head': c.head }}>
      <button type="button" className="sp-card-main" onClick={() => onOpen(note.id)} title="Open this note">
        <span className="sp-card-text">{snippet(note)}</span>
        <span className="sp-card-meta">{stamp(note.lastUpdated)}{note.isOpen ? ' · open' : ''}</span>
      </button>
      <div className="sp-card-actions">
        <button type="button" className="sp-btn sm" onClick={() => onOpen(note.id)}>Open</button>
        <button type="button" className="sp-btn sm" onClick={() => setPicking((v) => !v)} aria-expanded={picking}><i className="sp-sw-ico" /> Color</button>
        <button type="button" className="sp-btn sm danger" onClick={() => onAskDelete(note.id)}><i className="sp-trash" /> Delete</button>
      </div>
      {picking && <div className="sp-card-colors"><NoteColorPicker value={note.color} onPick={(id) => { onColor(note.id, id); setPicking(false); }} /></div>}
    </li>
  );
}

// ---------------------------------------------------------------- NotesListModal
// Starts at the Claw Machine window size (420 x 829). Resizable: 300 x 340 up to 150% of the start size (never bigger than the screen).
const LIST_MIN_W = 300;
const LIST_MIN_H = 340;
export const defaultListGeo = () => ({ x: Math.max(8, window.innerWidth - LIST_W - 90), y: 8, w: LIST_W, h: LIST_H });

export function NotesListModal({ notes, geo: saved, z, onFront, onGeo, onNew, onOpen, onColor, onAskDelete, onClose }) {
  const vp = useViewport();
  const maxW = LIST_W * NOTE_MAX;
  const maxH = LIST_H * NOTE_MAX;
  const [geo, setGeo] = useState(saved);
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const setG = (g) => { geoRef.current = g; setGeo(g); }; // keep the ref current even before React re-renders
  const act = useRef(null);
  const pointers = useRef(new Map());
  const [maxTip, setMaxTip] = useState(false);

  // keep the window inside the screen (also on a smaller screen than the one it was saved on)
  const w = Math.max(Math.min(LIST_MIN_W, vp.w - 16), Math.min(geo.w, vp.w - 16));
  const h = Math.max(Math.min(LIST_MIN_H, vp.h - 16), Math.min(geo.h, vp.h - 16));
  const x = clamp(geo.x, 0, Math.max(0, vp.w - w));
  const y = clamp(geo.y, 0, Math.max(0, vp.h - h));
  const limits = () => ({ minW: Math.min(LIST_MIN_W, vp.w - 16), maxW: Math.min(maxW, vp.w - 16), minH: Math.min(LIST_MIN_H, vp.h - 16), maxH: Math.min(maxH, vp.h - 16) });

  const full = notes.length >= MAX_NOTES;
  const sorted = [...notes].sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

  useEffect(() => {
    if (!maxTip) return undefined;
    const t = setTimeout(() => setMaxTip(false), 2200);
    return () => clearTimeout(t);
  }, [maxTip]);

  const finish = () => {
    if (!act.current) return;
    act.current = null;
    const g = geoRef.current;
    onGeo({ x: Math.round(g.x), y: Math.round(g.y), w: Math.round(g.w), h: Math.round(g.h) });
  };

  // drag by the header
  const startDrag = (e) => {
    act.current = { type: 'drag', dx: e.clientX - x, dy: e.clientY - y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e) => {
    const a = act.current;
    if (!a || a.type !== 'drag') return;
    setG({ ...geoRef.current, x: clamp(e.clientX - a.dx, 0, Math.max(0, vp.w - w)), y: clamp(e.clientY - a.dy, 0, Math.max(0, vp.h - h)) });
  };

  // resize with the 8 handles (mouse or touch drag)
  const startResize = (dir) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFront();
    act.current = { type: 'resize', dir, px: e.clientX, py: e.clientY, g: { x, y, w, h } };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveResize = (e) => {
    const a = act.current;
    if (!a || a.type !== 'resize') return;
    const L = limits();
    const [sx, sy] = HANDLES[a.dir];
    const nw = sx ? clamp(a.g.w + sx * (e.clientX - a.px), L.minW, L.maxW) : a.g.w;
    const nh = sy ? clamp(a.g.h + sy * (e.clientY - a.py), L.minH, L.maxH) : a.g.h;
    setG({ w: nw, h: nh, x: sx < 0 ? a.g.x + (a.g.w - nw) : a.g.x, y: sy < 0 ? a.g.y + (a.g.h - nh) : a.g.y });
  };

  // two-finger pinch anywhere on the window
  const onRootDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [p, q] = [...pointers.current.values()];
      act.current = { type: 'pinch', d0: Math.hypot(p.x - q.x, p.y - q.y) || 1, g: { x, y, w, h } };
    }
  };
  const onRootMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const a = act.current;
    if (a && a.type === 'pinch' && pointers.current.size === 2) {
      const [p, q] = [...pointers.current.values()];
      const f = Math.hypot(p.x - q.x, p.y - q.y) / a.d0;
      const L = limits();
      const nw = clamp(a.g.w * f, L.minW, L.maxW);
      const nh = clamp(a.g.h * f, L.minH, L.maxH);
      setG({ w: nw, h: nh, x: a.g.x - (nw - a.g.w) / 2, y: a.g.y - (nh - a.g.h) / 2 });
    }
  };
  const onRootUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (act.current && act.current.type === 'pinch' && pointers.current.size < 2) finish();
  };

  const clickNew = () => { if (full) setMaxTip(true); else onNew(); };

  return (
    <div
      className="sp-root sp-list"
      style={{ left: x, top: y, width: w, height: h, zIndex: z }}
      role="dialog"
      aria-label="Sticky-pedia"
      onPointerDownCapture={onFront}
      onPointerDown={onRootDown}
      onPointerMove={onRootMove}
      onPointerUp={onRootUp}
      onPointerCancel={onRootUp}
    >
      <div className="sp-list-head" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finish} onPointerCancel={finish} title="Drag to move">
        <img className="sp-list-ico" src={notesIcon} alt="" draggable={false} />
        <span className="sp-list-title">Sticky-pedia</span>
        <span className="sp-list-btns" onPointerDown={(e) => e.stopPropagation()}>
          <span className={`sp-tipwrap${maxTip || full ? ' has-tip' : ''}${maxTip ? ' show' : ''}`} data-tip="Max 5 notes reached!">
            <button type="button" className={`sp-btn${full ? ' off' : ''}`} aria-disabled={full} onClick={clickNew}>+ New Note</button>
          </span>
          <button type="button" className="sp-btn close" onClick={onClose} aria-label="Close Sticky-pedia" title="Close">X</button>
        </span>
      </div>
      <div className="sp-list-sub">{notes.length}/{MAX_NOTES} notes</div>
      <div className="sp-scroll">
        {sorted.length === 0 ? (
          <div className="sp-empty">
            <img src={notesIcon} alt="" draggable={false} />
            <span>No notes yet.</span>
            <span className="sp-empty-sub">Press + New Note to stick one up!</span>
          </div>
        ) : (
          <ul className="sp-cards">
            {sorted.map((n) => <NoteCard key={n.id} note={n} onOpen={onOpen} onColor={onColor} onAskDelete={onAskDelete} />)}
          </ul>
        )}
      </div>
      {Object.keys(HANDLES).map((dir) => (
        <i key={dir} className={`sp-h ${dir}`} onPointerDown={startResize(dir)} onPointerMove={moveResize} onPointerUp={finish} onPointerCancel={finish} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- the whole module
export default function Stickypedia({ notes: rawNotes, setNotes, listOpen, setListOpen }) {
  const notes = cleanNotes(rawNotes);
  const [order, setOrder] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const [focusId, setFocusId] = useState(null);
  // the list window's position/size is saved on this device only (screens differ between devices)
  const [listGeo, setListGeo] = useState(() => {
    try { const g = JSON.parse(localStorage.getItem('kutitap_notes_list_geo')); if (g && g.w && g.h) return g; } catch (e) { /* fall through */ }
    return defaultListGeo();
  });
  const saveListGeo = (g) => {
    setListGeo(g);
    try { localStorage.setItem('kutitap_notes_list_geo', JSON.stringify(g)); } catch (e) { /* storage full or blocked */ }
  };
  const front = useCallback((id) => setOrder((o) => (o[o.length - 1] === id ? o : [...o.filter((k) => k !== id), id])), []);
  const zOf = (id) => 9960 + Math.max(0, order.indexOf(id));

  const patch = useCallback((id, p, touch) => {
    setNotes((prev) => cleanNotes(prev).map((n) => (n.id === id ? { ...n, ...p, ...(touch ? { lastUpdated: Date.now() } : {}) } : n)));
  }, [setNotes]);

  const create = () => {
    if (notes.length >= MAX_NOTES) return;
    const n = newNote(notes.length, window.innerWidth, window.innerHeight);
    setNotes((prev) => { const p = cleanNotes(prev); return p.length >= MAX_NOTES ? p : [...p, n]; });
    setFocusId(n.id);
    front(n.id);
  };
  const open = (id) => { patch(id, { isOpen: true }); setFocusId(id); front(id); };
  const remove = () => {
    const id = confirmId;
    setConfirmId(null);
    setNotes((prev) => cleanNotes(prev).filter((n) => n.id !== id));
  };

  return (
    <>
      {listOpen && (
        <NotesListModal
          notes={notes}
          geo={listGeo}
          onGeo={saveListGeo}
          z={zOf('list')}
          onFront={() => front('list')}
          onNew={create}
          onOpen={open}
          onColor={(id, color) => patch(id, { color }, true)}
          onAskDelete={setConfirmId}
          onClose={() => setListOpen(false)}
        />
      )}
      {notes.filter((n) => n.isOpen).map((n) => (
        <StickyNoteWindow
          key={n.id}
          note={n}
          z={zOf(n.id)}
          autoFocus={focusId === n.id}
          onFront={() => front(n.id)}
          onPatch={(p, touch) => patch(n.id, p, touch)}
          onText={(content, formatting) => patch(n.id, { content, formatting }, true)}
          onClose={() => patch(n.id, { isOpen: false })}
          onDelete={() => setConfirmId(n.id)}
        />
      ))}
      {confirmId && notes.some((n) => n.id === confirmId) && <DeleteConfirmModal onYes={remove} onNo={() => setConfirmId(null)} />}
    </>
  );
}
