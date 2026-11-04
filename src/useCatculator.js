// Calculator engine, cat-key tap logic and session history for the Catculator.
import { useCallback, useEffect, useRef, useState } from 'react';

const OPS = ['+', '\u2212', '\u00d7', '\u00f7'];
const INIT = { expr: '', result: null, done: false };
const curNum = (e) => (e.match(/[\d.]*$/) || [''])[0];
const isOp = (ch) => OPS.includes(ch);

// no eval: x and / first, then + and -
export function evaluate(expr) {
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
export const fmt = (v) => (Number.isNaN(v) ? 'Error' : v.toLocaleString('en-US', { maximumFractionDigits: 10 }));
const spaced = (e) => e.replace(/([+\u2212\u00d7\u00f7])/g, '$1');

export function useCatculator({ onComplete } = {}) {
  const [st, setSt] = useState(INIT);
  const done = useRef(onComplete);
  done.current = onComplete;

  const press = useCallback((k) => {
    setSt((s) => {
      const { expr, result, done } = s;
      if (/^\d$/.test(k)) {
        if (done) return { expr: k, result: null, done: false };
        if (expr.length > 40) return s;
        return { ...s, expr: curNum(expr) === '0' ? expr.slice(0, -1) + k : expr + k };
      }
      if (k === '.') {
        if (done) return { expr: '0.', result: null, done: false };
        const seg = curNum(expr);
        return seg.includes('.') ? s : { ...s, expr: expr + (seg === '' ? '0.' : '.') };
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
        return { expr: e, result: evaluate(e), done: true };
      }
      if (k === '%') {
        if (done) return Number.isNaN(result) ? s : { ...s, result: Number((result / 100).toFixed(12)) };
        const seg = curNum(expr);
        return seg ? { ...s, expr: expr.slice(0, expr.length - seg.length) + String(Number((Number(seg) / 100).toFixed(12))) } : s;
      }
      if (k === 'AC') return INIT;
      if (k === 'BS') return done ? INIT : { ...s, expr: expr.slice(0, -1) };
      return s;
    });
  }, []);

  // a completed calculation is reported once (results reloaded from history are marked silent)
  useEffect(() => {
    if (st.done && !st.silent && !Number.isNaN(st.result) && done.current) done.current({ expr: st.expr, result: st.result });
  }, [st.done, st.silent, st.expr, st.result]);

  const reset = useCallback(() => setSt(INIT), []);
  const load = useCallback((result) => setSt({ expr: String(result), result, done: true, silent: true }), []);

  const prevNum = (st.expr.match(/[\d.]+(?=[+\u2212\u00d7\u00f7]$)/) || [''])[0];
  const main = st.done ? fmt(st.result) : (curNum(st.expr) || prevNum || '0');
  const sub = st.expr ? spaced(st.expr) : '';
  return { press, reset, load, main, sub };
}

// keyboard: digits, + - * / Enter = Backspace % . Delete
export const calcKeyHandler = (press) => (e) => {
  const map = { '*': '\u00d7', '/': '\u00f7', '-': '\u2212', '+': '+', Enter: '=', '=': '=', Backspace: 'BS', '%': '%', '.': '.', Delete: 'AC' };
  const k = /^\d$/.test(e.key) ? e.key : map[e.key];
  if (k) { e.preventDefault(); press(k); }
};

// Cat key: ONE click closes, DOUBLE click minimizes (the single action waits `delay` ms for a second click).
export function useCatTap(onClose, onMinimize, delay = 260) {
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; onMinimize(); return; }
    timer.current = setTimeout(() => { timer.current = null; onClose(); }, delay);
  }, [onClose, onMinimize, delay]);
}
