// CATCULATOR, Option 2: the artwork is the shell (Layer 1), live LCD text sits on the screen (Layer 2),
// invisible buttons sit on the keys (Layer 3). Resize by dragging any corner or edge (or pinch on touch screens);
// the window can never be smaller than 50% of its native size.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import './Catculator.css';
import shell from './assets/ui/catculator.png';
import { useCatculator, useCatTap, calcKeyHandler, fmt } from './useCatculator';

const WEEK = 7 * 24 * 60 * 60 * 1000;
const when = (t) => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// ---- artwork geometry: all numbers are pixels of catculator.png (630 x 924) ------------------
const IMG_W = 630;
const IMG_H = 924;
const NATIVE_W = 360; // native (100%) width in CSS px; height follows the image ratio
const MIN_SCALE = 0.5; // strict minimum
const MAX_SCALE = 1.5;
const ASPECT = IMG_H / IMG_W;

const COLS = [62, 193.5, 325, 456];
const ROWS = [370, 463.75, 557.5, 651.25, 745];
const KW = 108;
const KH = 72;
const PAD = 5; // hit areas include the dark key outline
const R = (x, y, w, h) => ({ x: x - PAD, y: y - PAD, w: w + PAD * 2, h: h + PAD * 2 });
const rect = (c, r) => R(COLS[c], ROWS[r], KW, KH);

// Heart key = minus (the artwork has no minus key). x is available from the keyboard (*).
const KEYS = [
  ['AC', 'All clear', rect(0, 0)], ['%', 'Percent', rect(1, 0)], ['\u2212', 'Minus (heart key)', rect(2, 0)], ['\u00f7', 'Divide', rect(3, 0)],
  ['7', '7', rect(0, 1)], ['8', '8', rect(1, 1)], ['9', '9', rect(2, 1)], ['+', 'Plus', R(456, 462, 111, 196)],
  ['4', '4', rect(0, 2)], ['5', '5', rect(1, 2)], ['6', '6', rect(2, 2)],
  ['1', '1', rect(0, 3)], ['2', '2', rect(1, 3)], ['3', '3', rect(2, 3)],
  ['0', '0', rect(0, 4)], ['.', 'Decimal point', rect(1, 4)], ['=', 'Equals', R(325, 745, 108, 70)]
];
const CAT = R(458, 678, 112, 137);
const LCD = { x: 92, y: 189, w: 455, h: 129 };
const DRAG_STRIP = { x: 60, y: 0, w: 510, h: 186 }; // bumps + title: drag the window here

const box = (r) => ({ left: `${(r.x / IMG_W) * 100}%`, top: `${(r.y / IMG_H) * 100}%`, width: `${(r.w / IMG_W) * 100}%`, height: `${(r.h / IMG_H) * 100}%` });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const HANDLES = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] };

// ---- floating pieces for the closed / minimized states -------------------------------------
function CatCrop({ w }) {
  const s = w / CAT.w;
  return <span className="cx-catcrop" style={{ width: w, height: CAT.h * s, backgroundImage: `url(${shell})`, backgroundSize: `${IMG_W * s}px ${IMG_H * s}px`, backgroundPosition: `${-CAT.x * s}px ${-CAT.y * s}px` }} />;
}

function Badge({ value, onRestore }) {
  const [pos, setPos] = useState(() => ({ x: Math.max(8, window.innerWidth - 200), y: Math.max(8, window.innerHeight - 130) }));
  const drag = useRef(null);
  return (
    <button
      type="button"
      className="cx-badge"
      style={{ left: pos.x, top: pos.y }}
      aria-label="Catculator (minimized). Click to restore, drag to move"
      title="Click to restore · drag to move"
      onPointerDown={(e) => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, sx: e.clientX, sy: e.clientY, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
        if (d.moved) setPos({ x: clamp(e.clientX - d.dx, 0, window.innerWidth - 84), y: clamp(e.clientY - d.dy, 0, window.innerHeight - 110) });
      }}
      onPointerUp={() => { const d = drag.current; drag.current = null; if (d && !d.moved) onRestore(); }}
      onPointerCancel={() => { drag.current = null; }}
    >
      <CatCrop w={56} />
      <span className="cx-badge-lcd">{value.length > 9 ? value.slice(0, 9) : value}</span>
    </button>
  );
}

// mode / setMode come from the app (the calculator icon above the Shop button toggles it); history is the 7-day log.
export default function Catculator({ mode, setMode, history, setHistory }) {
  const onComplete = useCallback((e) => {
    const now = Date.now();
    setHistory((h) => [{ id: `${now}-${Math.random().toString(36).slice(2, 6)}`, expr: e.expr, result: e.result, t: now }, ...(h || []).filter((x) => x.t >= now - WEEK)].slice(0, 300));
  }, [setHistory]);
  const { press, reset, load, main, sub } = useCatculator({ onComplete });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState(null);
  const win = useRef(null);
  const gesture = useRef({ resize: null, drag: null, pointers: new Map(), pinch: 0 });
  const width = NATIVE_W * scale;
  const height = width * ASPECT;

  // smooth open/close: stay mounted while the closing animation plays
  const [phase, setPhase] = useState(mode === 'open' ? 'open' : 'gone'); // open | closing | gone
  const prevMode = useRef(mode);
  useEffect(() => {
    const prev = prevMode.current;
    prevMode.current = mode;
    if (mode === 'open') {
      if (prev === 'closed') reset(); // reopening after a close starts fresh
      setPhase('open');
      return undefined;
    }
    setPhase((p) => (p === 'open' ? 'closing' : p));
    const t = setTimeout(() => {
      setPhase('gone');
      if (mode === 'closed') reset(); // closing clears the calculation; minimizing keeps it
    }, 230);
    return () => clearTimeout(t);
  }, [mode, reset]);

  // rolling 7-day history
  useEffect(() => {
    const cut = Date.now() - WEEK;
    if ((history || []).some((h) => h.t < cut)) setHistory((h) => (h || []).filter((e) => e.t >= cut));
  }, [mode, history, setHistory]);

  const close = useCallback(() => setMode('closed'), [setMode]); // click on the cat
  const minimize = useCallback(() => setMode('min'), [setMode]); // double-click on the cat
  const onCat = useCatTap(close, minimize);

  useEffect(() => { if (mode === 'open' && !pos) setPos({ x: Math.max(8, window.innerWidth - NATIVE_W - 110), y: 24 }); }, [mode, pos]);
  useEffect(() => { if (mode === 'open' && win.current) win.current.focus(); }, [mode, phase]);

  // size changes always stay inside [50%, 150%] of native and keep the window on screen
  const applyWidth = useCallback((w, anchor) => {
    const nw = clamp(w, NATIVE_W * MIN_SCALE, NATIVE_W * MAX_SCALE);
    setScale(nw / NATIVE_W);
    if (anchor) {
      const p = anchor(nw, nw * ASPECT);
      // keep the window on screen while it grows
      setPos({ x: clamp(p.x, 0, Math.max(0, window.innerWidth - nw)), y: clamp(p.y, 0, Math.max(0, window.innerHeight - nw * ASPECT)) });
    }
  }, []);

  // ---- corner / edge resize, like a desktop window ----
  const startResize = (dir) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    gesture.current.resize = { dir, x: e.clientX, y: e.clientY, w: width, h: height, px: pos.x, py: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveResize = (e) => {
    const g = gesture.current.resize;
    if (!g) return;
    const [sx, sy] = HANDLES[g.dir];
    const dW = sx !== 0 ? sx * (e.clientX - g.x) : (sy * (e.clientY - g.y)) / ASPECT;
    applyWidth(g.w + dW, (nw, nh) => ({ x: sx < 0 ? g.px + (g.w - nw) : g.px, y: sy < 0 ? g.py + (g.h - nh) : g.py }));
  };
  const endResize = () => { gesture.current.resize = null; };

  // ---- drag the window by its top strip ----
  const startDrag = (e) => { gesture.current.drag = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }; e.currentTarget.setPointerCapture(e.pointerId); };
  const moveDrag = (e) => {
    const d = gesture.current.drag;
    if (d) setPos({ x: clamp(e.clientX - d.dx, 0, Math.max(0, window.innerWidth - width)), y: clamp(e.clientY - d.dy, 0, Math.max(0, window.innerHeight - height)) });
  };
  const endDrag = () => { gesture.current.drag = null; };

  // ---- pinch (two fingers) and ctrl+wheel (trackpad pinch) ----
  const zoomAround = useCallback((factor) => {
    applyWidth(width * factor, (nw, nh) => ({ x: pos.x - (nw - width) / 2, y: pos.y - (nh - height) / 2 }));
  }, [applyWidth, width, height, pos]);
  const onRootDown = (e) => { gesture.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (gesture.current.pointers.size === 2) gesture.current.pinch = 0; };
  const onRootMove = (e) => {
    const g = gesture.current;
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.pinch) zoomAround(dist / g.pinch);
      g.pinch = dist;
    }
  };
  const onRootUp = (e) => { gesture.current.pointers.delete(e.pointerId); gesture.current.pinch = 0; };
  useEffect(() => {
    const el = win.current;
    if (!el) return undefined;
    const onWheel = (e) => { if (e.ctrlKey) { e.preventDefault(); zoomAround(e.deltaY < 0 ? 1.06 : 0.94); } };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  if (phase === 'gone') {
    if (mode === 'closed') {
      return (
        <button type="button" className="cx-reopen" onClick={() => setMode('open')} aria-label="Reopen Catculator">
          <CatCrop w={30} /><span>REOPEN</span>
        </button>
      );
    }
    if (mode === 'min') return <Badge value={main} onRestore={() => setMode('open')} />;
    return null;
  }
  if (!pos) return null;

  const mainSize = main.length > 15 ? 2.6 : main.length > 11 ? 3.6 : main.length > 8 ? 4.8 : 6.4;
  return (
    <div
      ref={win}
      className={`cx-win ${phase === 'closing' ? 'out' : 'in'}`}
      style={{ left: pos.x, top: pos.y, width, height, transformOrigin: `${window.innerWidth - 50 - pos.x}px ${window.innerHeight - 134 - pos.y}px` }}
      tabIndex={0}
      role="dialog"
      aria-label="Catculator"
      onKeyDown={calcKeyHandler(press)}
      onPointerDown={onRootDown}
      onPointerMove={onRootMove}
      onPointerUp={onRootUp}
      onPointerCancel={onRootUp}
    >
      <div className="cx-stage">
        {/* LAYER 1: the artwork */}
        <img className="cx-shell" src={shell} alt="" draggable={false} style={{ imageRendering: scale < 0.99 ? 'auto' : 'pixelated' }} />

        {/* LAYER 2: LCD text (Press Start 2P, retro green) */}
        <div className="cx-lcd" style={box(LCD)} aria-live="polite">
          <div className="cx-hist" title="Last 7 days · click an entry to reuse its result">
            {(history || []).map((h) => (
              <button type="button" key={h.id} className="cx-hist-item" onClick={() => load(h.result)} title={when(h.t)}>{`${h.expr}=${fmt(h.result)}`}</button>
            ))}
          </div>
          <div className="cx-expr">{sub || '\u00a0'}</div>
          <div className="cx-main" style={{ fontSize: `${mainSize}cqi` }}>{main}</div>
        </div>

        {/* LAYER 3: hit boxes over the keys */}
        {KEYS.map(([k, label, r]) => <button type="button" key={k} className="cx-key" style={box(r)} onClick={() => press(k)} aria-label={label} />)}
        <button
          type="button"
          className="cx-key cx-cat"
          style={box(CAT)}
          onClick={onCat}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onCat(); } }}
          aria-label="Cat: click to close, double-click to minimize"
          title="Click: close · Double-click: minimize"
        />

        <div className="cx-drag" style={box(DRAG_STRIP)} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} title="Drag to move" />
      </div>

      {/* resize handles: 4 corners + 4 edges */}
      {Object.keys(HANDLES).map((dir) => (
        <i key={dir} className={`cx-h ${dir}`} onPointerDown={startResize(dir)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} />
      ))}
    </div>
  );
}
