// Catculator: floating, draggable calculator. Lives at the app root so it stays on screen when you switch tabs.
// mode: 'closed' (state cleared) | 'min' (hidden, state kept for the session) | 'open'.
// History (completed calculations) is kept for a rolling 7 days.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import catFace from './assets/pixel/cat-happy.png';
import spTwinkle from './assets/shop/twinkle.png';

const WIDTH = 380;
const HEIGHT = 740;
const WEEK = 7 * 24 * 60 * 60 * 1000;
const OPS = ['+', '\u2212', '\u00d7', '\u00f7'];
const INIT = { expr: '', result: null, done: false };

const curNum = (e) => (e.match(/[\d.]*$/) || [''])[0];
const isOp = (ch) => OPS.includes(ch);

// no eval: x and / first, then + and -
function evaluate(expr) {
  const parts = expr.match(/\d*\.?\d+|\d+\.|[+\u2212\u00d7\u00f7]/g) || [];
  const t = parts[0] === '\u2212' ? ['0', ...parts] : parts;
  const out = [Number(t[0])];
  for (let i = 1; i < t.length; i += 2) {
    const op = t[i];
    const n = Number(t[i + 1]);
    if (op === '\u00d7') out[out.length - 1] *= n;
    else if (op === '\u00f7') { if (n === 0) return NaN; out[out.length - 1] /= n; } else out.push(op, n);
  }
  let r = out[0];
  for (let i = 1; i < out.length; i += 2) r = out[i] === '+' ? r + out[i + 1] : r - out[i + 1];
  return Number.isFinite(r) ? Number(r.toFixed(10)) : NaN;
}
const fmt = (v) => (Number.isNaN(v) ? 'Error' : v.toLocaleString('en-US', { maximumFractionDigits: 10 }));
const when = (t) => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function Calculator({ mode, setMode, history, setHistory }) {
  const [st, setSt] = useState(INIT);
  const [pos, setPos] = useState(null);
  const box = useRef(null);
  const drag = useRef(null);

  // closing clears the calculation; minimizing keeps it
  useEffect(() => { if (mode === 'closed') setSt(INIT); }, [mode]);
  useEffect(() => { if (mode === 'open' && box.current) box.current.focus(); }, [mode]);
  useEffect(() => {
    if (mode === 'open' && !pos) setPos({ x: Math.max(8, window.innerWidth - WIDTH - 110), y: 8 });
  }, [mode, pos]);

  // rolling 7-day history
  useEffect(() => {
    const cut = Date.now() - WEEK;
    if ((history || []).some((h) => h.t < cut)) setHistory((h) => (h || []).filter((e) => e.t >= cut));
  }, [mode, history, setHistory]);

  const press = useCallback((k) => {
    setSt((s) => {
      const { expr, result, done } = s;
      if (/^\d$/.test(k)) {
        if (done) return { expr: k, result: null, done: false };
        if (expr.length > 40) return s;
        const seg = curNum(expr);
        return { ...s, expr: seg === '0' ? expr.slice(0, -1) + k : expr + k };
      }
      if (k === '.') {
        if (done) return { expr: '0.', result: null, done: false };
        const seg = curNum(expr);
        if (seg.includes('.')) return s;
        return { ...s, expr: expr + (seg === '' ? '0.' : '.') };
      }
      if (isOp(k)) {
        if (done) return Number.isNaN(result) ? s : { expr: String(result) + k, result: null, done: false };
        if (expr === '') return { ...s, expr: k === '\u2212' ? k : `0${k}` };
        if (isOp(expr.slice(-1))) return expr.length === 1 ? s : { ...s, expr: expr.slice(0, -1) + k };
        return { ...s, expr: expr + k };
      }
      if (k === '=') {
        const e = expr.replace(/[+\u2212\u00d7\u00f7.]+$/, '');
        if (done || e === '') return s;
        const val = evaluate(e);
        if (!Number.isNaN(val)) {
          const now = Date.now();
          setHistory((h) => [{ id: `${now}-${Math.random().toString(36).slice(2, 6)}`, expr: e, result: val, t: now }, ...(h || []).filter((x) => x.t >= now - WEEK)].slice(0, 300));
        }
        return { expr: e, result: val, done: true };
      }
      if (k === '%') {
        if (done) return Number.isNaN(result) ? s : { ...s, result: Number((result / 100).toFixed(12)) };
        const seg = curNum(expr);
        if (!seg) return s;
        return { ...s, expr: expr.slice(0, expr.length - seg.length) + String(Number((Number(seg) / 100).toFixed(12))) };
      }
      if (k === 'AC') return INIT;
      if (k === 'BS') return done ? INIT : { ...s, expr: expr.slice(0, -1) };
      return s;
    });
  }, [setHistory]);

  const onKeyDown = (e) => {
    const map = { '*': '\u00d7', '/': '\u00f7', '-': '\u2212', '+': '+', Enter: '=', '=': '=', Backspace: 'BS', '%': '%', '.': '.', Delete: 'AC' };
    const k = /^\d$/.test(e.key) ? e.key : map[e.key];
    if (k) { e.preventDefault(); e.stopPropagation(); press(k); }
  };

  // dragging by the top of the calculator
  const onDragStart = (e) => {
    if (e.target.closest('button')) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e) => {
    if (!drag.current) return;
    const h = Math.min(HEIGHT, window.innerHeight - 16);
    setPos({
      x: Math.min(Math.max(0, e.clientX - drag.current.dx), Math.max(0, window.innerWidth - WIDTH)),
      y: Math.min(Math.max(0, e.clientY - drag.current.dy), Math.max(0, window.innerHeight - h))
    });
  };
  const onDragEnd = () => { drag.current = null; };

  if (mode === 'closed' || !pos) return null;

  const expr = st.expr;
  const lastChar = expr.slice(-1);
  const prevNum = (expr.match(/[\d.]+(?=[+\u2212\u00d7\u00f7]$)/) || [''])[0];
  const main = st.done ? fmt(st.result) : (curNum(expr) || prevNum || '0');
  const sub = expr ? `${expr.replace(/([+\u2212\u00d7\u00f7])/g, ' $1 ')}` : '\u00a0';
  const mainSize = main.length > 14 ? 24 : main.length > 10 ? 30 : main.length > 7 ? 38 : 48;
  const key = (label, k, cls = '', extra = {}) => (
    <button type="button" className={`cc-key ${cls}`} onClick={() => press(k)} aria-label={extra.aria || label} style={extra.style}>{extra.content || label}</button>
  );

  return (
    <div
      ref={box}
      className="cc-window"
      role="dialog"
      aria-label="Catculator"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={{ left: pos.x, top: pos.y, display: mode === 'min' ? 'none' : 'flex', width: WIDTH, height: `min(${HEIGHT}px, calc(100vh - 16px))` }}
    >
      <div className="cc-ear l"><button type="button" onClick={() => setMode('min')} aria-label="Minimize calculator" title="Minimize">&#8211;</button></div>
      <div className="cc-ear r"><button type="button" onClick={() => setMode('closed')} aria-label="Close calculator" title="Close (clears)">&#215;</button></div>
      <img className="px-sprite cc-spark a" src={spTwinkle} alt="" /><img className="px-sprite cc-spark b" src={spTwinkle} alt="" />

      <div className="cc-handle" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>CATCULATOR</div>

      <div className="cc-screen" aria-live="polite">
        <div className="cc-expr">{sub}</div>
        <div className="cc-main" style={{ fontSize: mainSize }}>{main}</div>
      </div>

      <div className="cc-hist">
        <div className="cc-hist-title">History · last 7 days</div>
        <div className="cc-hist-list">
          {(history || []).length === 0 && <span className="cc-hist-empty">No calculations yet.</span>}
          {(history || []).map((h) => (
            <button type="button" key={h.id} className="cc-hist-item" onClick={() => setSt({ expr: String(h.result), result: h.result, done: true })} title="Use this result">
              <span className="cc-hist-expr">{h.expr.replace(/([+\u2212\u00d7\u00f7])/g, ' $1 ')}</span>
              <b>{fmt(h.result)}</b>
              <em>{when(h.t)}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="cc-keys">
        {key('AC', 'AC', 'pink')}{key('%', '%', 'pink')}{key('\u00d7', '\u00d7', 'green')}{key('\u00f7', '\u00f7', 'green')}
        {key('7', '7')}{key('8', '8')}{key('9', '9')}{key('+', '+', 'green tall2')}
        {key('4', '4')}{key('5', '5')}{key('6', '6')}
        {key('1', '1')}{key('2', '2')}{key('3', '3')}
        {key('=', '=', 'green tall2b', { aria: 'Equals', content: <img className="px-sprite" src={catFace} alt="" /> })}
        {key('0', '0')}{key('.', '.')}{key('\u2212', '\u2212', 'green')}
      </div>
    </div>
  );
}
