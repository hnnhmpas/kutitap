import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CROPS, plotsFromGoals, MAX_PLOTS } from './farmLogic.js';
import { buildWorld, findPath, nearestWalkable } from './farmWorld.js';
import { loadImages, bakeGround, buildSprites, CROPS_SHEET_URL, FRAME_URL, SLOT_URL, FACE_URL, SPROUT_URL, CAN_URL } from './farmRender.js';
import { initLife, updateLife, addParts, drawWaterFx, drawParts, animalItems, drawTeemo } from './farmLife.js';

const WATER = '#9bd4c3';
const WATER_COINS = 2;
const sfxEvt = (type) => { try { window.dispatchEvent(new CustomEvent('kutitap-sfx', { detail: { type } })); } catch (e) { /* ignore */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const btn = { width: 38, height: 38, background: '#fff3d4', border: '3px solid #4a1d36', boxShadow: '2px 2px 0 rgba(74,29,54,.35)', color: '#4a1d36', fontFamily: 'inherit', fontWeight: 400, textTransform: 'none', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 };
const SEQ_IDLE = ['dance', 'chop', 'mine', 'sleep', 'wander', 'dance', 'chop'];   // watering only happens when the user asks for it
const TRACKER_FONT = "'DotGothic16', 'Pixelify Sans', ui-monospace, 'Courier New', monospace";

export default function KutitapFarm({ goals, farm, setFarm, onCoins }) {
  const plots = useMemo(() => plotsFromGoals(goals, farm), [goals, farm]);
  const layoutKey = plots.map((p) => `${p.id}:${p.planters.length}`).join('|');
  const world = useMemo(() => buildWorld(plots), [layoutKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const plotsById = useMemo(() => Object.fromEntries(plots.map((p) => [p.id, p])), [plots]);
  const [imgs, setImgs] = useState(null);
  const [picker, setPicker] = useState(null);       // { id, i }
  const [hoverCrop, setHoverCrop] = useState(null);
  const [toast, setToast] = useState('');
  const [waterMode, setWaterMode] = useState(false);
  const [wetV, setWetV] = useState(0);
  const wrapRef = useRef(null); const cvRef = useRef(null);
  const S = useRef({ cam: { x: 0, y: 0, z: 2.2, tz: 2.2 }, anchor: null, follow: true, size: { w: 600, h: 400, dpr: 1 }, hover: null, bubbles: [], ptrs: new Map(), drag: null,
    cat: { px: 0, py: 0, dir: 'down', path: [], t: 0, idle: 3, gap: 5, moving: false, act: null, pending: null }, ground: null, sprites: [], world: null, plotsById: {}, imgs: null,
    life: null, tasks: [], wet: new Set(), paid: new Set(), day: dayKey(), waterMode: false }).current;
  S.world = world; S.plotsById = plotsById; S.imgs = imgs; S.waterMode = waterMode;
  if (typeof window !== 'undefined' && window.__FARM_DEBUG) window.__farmS = S;

  useEffect(() => { let on = true; loadImages().then((i) => { if (on) setImgs(i); }); try { document.fonts && document.fonts.load('400 14px "Pixelify Sans"'); } catch (e) { /* ignore */ } return () => { on = false; }; }, []);
  useEffect(() => { // today's watering state from the synced farm data (nothing carries over to a new day)
    const w = farm && farm.water; const today = dayKey();
    if (S.day !== today) { S.wet.clear(); S.paid.clear(); S.day = today; }
    if (w && w.day === today) { Object.entries(w.done || {}).forEach(([pid, m]) => Object.keys(m).forEach((k) => S.wet.add(`${pid}|${k}`))); Object.keys(w.paid || {}).forEach((pid) => S.paid.add(String(pid))); }
    setWetV((v) => v + 1);
  }, [farm && farm.water]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => { if (S.day !== dayKey()) { S.wet.clear(); S.paid.clear(); S.day = dayKey(); setWetV((v) => v + 1); } }, 30000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const isWet = (pid, key) => S.wet.has(`${pid}|${key}`);

  useEffect(() => { // bake ground + living things when the layout changes
    if (!imgs) return;
    S.ground = bakeGround(world, imgs); S.life = initLife(world);
    const c = S.cat; const tx = Math.floor(c.px / 16), ty = Math.floor((c.py - 1) / 16);
    if (!c.px || !world.walk[ty * world.W + tx]) { c.px = world.home.x * 16 + 8; c.py = world.home.y * 16 + 14; c.path = []; c.act = null; c.pending = null; S.cam.x = c.px; S.cam.y = c.py; }
  }, [imgs, world]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (imgs) S.sprites = buildSprites(world, plotsById, imgs, isWet); }, [imgs, world, plotsById, wetV]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (m) => { setToast(m); clearTimeout(say.t); say.t = setTimeout(() => setToast(''), 3200); };
  const cell = () => ({ x: Math.floor(S.cat.px / 16), y: Math.floor((S.cat.py - 1) / 16) });
  const walkTo = (tx, ty) => { const to = nearestWalkable(S.world, tx, ty, 5); if (!to) return false; const p = findPath(S.world, cell(), to); if (!p) return false; S.cat.path = p; S.cat.idle = 0; return true; };
  // walk next to a target tile, then run an action there
  const approach = (target, type, extra = {}) => {
    const c = S.cat, wd = S.world; const cands = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: target.x + dx, y: target.y + dy })).filter((q) => wd.walk[q.y * wd.W + q.x]);
    let best = null; cands.forEach((q) => { const p = (q.x === cell().x && q.y === cell().y) ? [] : findPath(wd, cell(), q); if (p && (!best || p.length + (q.y === target.y ? 0 : 1) < best.p.length + (best.q.y === target.y ? 0 : 1))) best = { p, q }; });
    if (!best) return false; c.path = best.p; c.pending = { type, target, ...extra }; c.idle = 0; return true;
  };
  const startAct = (type, target, extra = {}) => {
    const c = S.cat; const dx = target ? target.x * 16 + 8 - c.px : 0, dy = target ? target.y * 16 + 8 - c.py : 0;
    if (target) c.dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    const dur = { dance: 3.4, chop: 2.5, mine: 2.1, water: 1.5, sleep: 4.2 }[type] || 2;
    c.act = { type, t: 0, dur, target, fx: 0, ...extra }; c.moving = false;
  };
  const finishAct = (a) => {
    if (a.type === 'water' && a.task) markWatered(a.task);
  };
  const markWatered = (task) => {
    const { plotId, key } = task; const plot = S.plotsById[plotId]; const k = `${plotId}|${key}`; if (S.wet.has(k)) return;
    S.wet.add(k);
    const need = plot ? plot.planters.filter((p) => p.crop) : [];
    const complete = need.length > 0 && need.every((p) => S.wet.has(`${plotId}|${p.key}`));
    const reward = complete && !S.paid.has(String(plotId));
    if (reward) { S.paid.add(String(plotId)); if (onCoins) onCoins(WATER_COINS); const wp = S.world.plots.find((q) => q.id === plotId); if (wp && S.life) { addParts(S.life, 'coin', wp.center.x * 16, wp.center.y * 16, 1, { vx: 0, vy: -16, life: 1.6, g: 0 }); addParts(S.life, 'spark', wp.center.x * 16, wp.center.y * 16, 8, { life: 1 }); } say(`${plot ? plot.name : 'Plot'} is all watered! +${WATER_COINS} Star Coins`); sfxEvt('coin'); }
    const today = dayKey();
    setFarm((prev) => { const base = prev || {}; const w = base.water && base.water.day === today ? base.water : { day: today, done: {}, paid: {} };
      return { ...base, v: 1, water: { day: today, done: { ...w.done, [plotId]: { ...(w.done[plotId] || {}), [key]: true } }, paid: reward ? { ...w.paid, [plotId]: true } : w.paid } }; });
    setWetV((v) => v + 1);
  };
  const queueWater = (plotId, only) => {
    const plot = S.plotsById[plotId], wp = S.world.plots.find((q) => q.id === plotId); if (!plot || !wp) return 0;
    const list = wp.cells.filter((c) => { const pl = plot.planters[c.i]; return pl && pl.crop && !S.wet.has(`${plotId}|${pl.key}`) && (only == null || c.i === only); })
      .sort((a, b) => Math.hypot(a.x - cell().x, a.y - cell().y) - Math.hypot(b.x - cell().x, b.y - cell().y));
    list.forEach((c) => { if (!S.tasks.some((t) => t.plotId === plotId && t.key === plot.planters[c.i].key)) S.tasks.push({ plotId, key: plot.planters[c.i].key, cell: { x: c.x, y: c.y } }); });
    S.cat.act = null; S.cat.pending = null; S.cat.path = []; S.follow = true;
    return list.length;
  };
  const toWorld = (sx, sy) => ({ x: S.cam.x + (sx - S.size.w / 2) / S.cam.z, y: S.cam.y + (sy - S.size.h / 2) / S.cam.z });
  const zoomBy = (f, sx, sy) => { const z = clamp(S.cam.tz * f, 0.3, 6); S.cam.tz = z; if (sx != null) { const w = toWorld(sx, sy); S.anchor = { sx, sy, wx: w.x, wy: w.y }; } else S.anchor = null; };

  const hitTest = (sx, sy) => {
    for (const b of S.bubbles) if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) return { type: b.kind, id: b.id };
    const w = toWorld(sx, sy);
    for (const wp of S.world.plots) for (const c of wp.cells) if (w.x >= c.x * 16 && w.x < c.x * 16 + 16 && w.y >= c.y * 16 - 8 && w.y < c.y * 16 + 16) return { type: 'planter', id: wp.id, i: c.i, cell: c };
    const tx = Math.floor(w.x / 16), ty = Math.floor(w.y / 16);
    for (const wp of S.world.plots) { const R = wp.fence; if (tx >= R.x0 && tx <= R.x1 && ty >= R.y0 && ty <= R.y1) return { type: 'plot', id: wp.id, tx, ty }; }
    return { type: 'ground', tx, ty };
  };
  const harvest = (id) => {
    const plot = S.plotsById[id]; if (!plot || !plot.ready) return;
    const got = {}; plot.planters.forEach((p) => { if (p.crop) got[p.crop] = (got[p.crop] || 0) + 1; });
    setFarm((prev) => { const base = prev || {}; const basket = { ...(base.basket || {}) }; Object.entries(got).forEach(([k, n]) => { basket[k] = (basket[k] || 0) + n; });
      return { ...base, v: 1, crops: base.crops || {}, basket, harvested: { ...(base.harvested || {}), [id]: true } }; });
    const total = Object.values(got).reduce((a, b) => a + b, 0);
    say(`Harvested ${total} crop${total === 1 ? '' : 's'}! They're in your Harvest Basket.`); sfxEvt('coin'); setPicker(null);
  };
  const click = (sx, sy) => {
    const h = hitTest(sx, sy); S.follow = true;
    if (h.type === 'harvest') { harvest(h.id); return; }
    if (h.type === 'water') { const n = queueWater(h.id); if (n) say(`Kutitap is watering ${n} plant${n === 1 ? '' : 's'}...`); return; }
    if (h.type === 'planter') {
      const plot = S.plotsById[h.id]; const pl = plot && plot.planters[h.i];
      if (S.waterMode && pl) { if (!pl.crop) say('Pick a crop for this planter first.'); else if (S.wet.has(`${h.id}|${pl.key}`)) say('Already watered today!'); else queueWater(h.id, h.i); return; }
      S.cat.act = null; S.cat.pending = null; S.tasks = []; approach({ x: h.cell.x, y: h.cell.y }, 'look'); setPicker({ id: h.id, i: h.i }); sfxEvt('open'); return;
    }
    setPicker(null);
    if (h.type === 'plot' || h.type === 'ground') { S.cat.act = null; S.cat.pending = null; S.tasks = []; walkTo(h.tx, h.ty); }
  };

  // ---- idle behaviour: Kutitap dances, chops wood, mines, waters plants, naps or wanders ----
  const pickIdle = () => {
    const c = S.cat, wd = S.world; const type = SEQ_IDLE[Math.floor(Math.random() * SEQ_IDLE.length)];
    const nearest = (kind) => { let b = null, bd = 28; wd.decor.forEach((d) => { if (d.kind !== kind) return; const dd = Math.hypot(d.x - cell().x, d.y - cell().y); if (dd < bd) { bd = dd; b = d; } }); return b; };
    if (type === 'dance' || type === 'sleep') { startAct(type, null); return; }
    if (type === 'chop') { const t = nearest('tree'); if (t && approach({ x: t.x, y: t.y }, 'chop', { key: `${t.x},${t.y}` })) return; startAct('dance', null); return; }
    if (type === 'mine') { const t = nearest('rock'); if (t && approach({ x: t.x, y: t.y }, 'mine', { key: `${t.x},${t.y}` })) return; startAct('dance', null); return; }
    walkTo(cell().x + Math.round(rnd(-7, 7)), cell().y + Math.round(rnd(-5, 5)));
  };

  // ---- main loop ----
  useEffect(() => {
    const cv = cvRef.current, wrap = wrapRef.current; if (!cv || !wrap || !imgs) return undefined;
    const g = cv.getContext('2d');
    const resize = () => { const r = wrap.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); S.size = { w: r.width, h: r.height, dpr }; cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(wrap);
    let raf, last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const c = S.cat, cam = S.cam, wd = S.world, L = S.life, { w, h, dpr } = S.size; const T = now / 1000;
      if (!L) { raf = requestAnimationFrame(loop); return; }
      // Kutitap: act / walk / pending work / idle choice
      c.moving = false;
      if (c.act) {
        const a = c.act; a.t += dt; const tx = a.target ? a.target.x * 16 + 8 : c.px, ty = a.target ? a.target.y * 16 + 8 : c.py;
        if (a.type === 'water' && a.t > 0.35 && a.t < a.dur - 0.2 && Math.random() < dt * 22) addParts(L, 'drop', c.px + (c.dir === 'left' ? -12 : 12), c.py - 12, 1, { vx: (tx - c.px) * 0.6, vy: -4, life: 0.5, g: 70 });
        if ((a.type === 'chop' || a.type === 'mine') && a.t % (a.type === 'chop' ? 0.6 : 0.7) < dt && a.t > 0.3) { if (a.key) L.shake[a.key] = T + 0.4; addParts(L, a.type === 'chop' ? 'leaf' : 'spark', tx, ty - 6, a.type === 'chop' ? 3 : 4, { life: 0.8 }); if (a.type === 'chop') addParts(L, 'chip', tx, ty, 2, { life: 0.6 }); }
        if (a.type === 'dance' && a.t - a.fx > 0.38) { a.fx = a.t; addParts(L, 'note', c.px + rnd(-6, 6), c.py - 18, 1, { vy: -18, vx: rnd(-8, 8), life: 1, g: 0 }); }
        if (a.type === 'sleep' && a.t - a.fx > 0.9) { a.fx = a.t; addParts(L, 'zzz', c.px + 7, c.py - 18, 1, { vy: -10, vx: 3, life: 1.3, g: 0 }); }
        if (a.t >= a.dur) { c.act = null; c.idle = 0; c.gap = rnd(4, 8); finishAct(a); if (a.type === 'dance') addParts(L, 'heart', c.px, c.py - 20, 1, { vy: -14, vx: 0, life: 1.1, g: 0 }); }
      } else if (c.path.length) {
        const tg = c.path[0], tx = tg.x * 16 + 8, ty = tg.y * 16 + 14, dx = tx - c.px, dy = ty - c.py, d = Math.hypot(dx, dy), step = 36 * dt;
        if (d <= step) { c.px = tx; c.py = ty; c.path.shift(); } else { c.px += (dx / d) * step; c.py += (dy / d) * step; }
        c.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'); c.moving = true; c.t += dt;
        if (!c.path.length && c.pending) { const p = c.pending; c.pending = null; if (p.type === 'look') { /* just arrived at the planter */ } else startAct(p.type, p.target, p); }
      } else if (c.pending) { const p = c.pending; c.pending = null; if (p.type !== 'look') startAct(p.type, p.target, p); }
      else if (S.tasks.length) {
        const t = S.tasks.shift(); if (!approach(t.cell, 'water', { task: t })) markWatered(t);
      } else { c.idle += dt; if (S.follow && !picker && c.idle > c.gap) { c.idle = 0; c.gap = rnd(5, 9); pickIdle(); } }
      updateLife(L, wd, dt, T);
      // camera
      cam.z += (cam.tz - cam.z) * Math.min(1, dt * 9);
      if (S.anchor) { cam.x = S.anchor.wx - (S.anchor.sx - w / 2) / cam.z; cam.y = S.anchor.wy - (S.anchor.sy - h / 2) / cam.z; }
      else if (S.follow) { cam.x += (c.px - cam.x) * Math.min(1, dt * 4); cam.y += (c.py - 8 - cam.y) * Math.min(1, dt * 4); }
      const hw = (w / cam.z) / 2, hh = (h / cam.z) / 2, WW = wd.W * 16, HH = wd.H * 16;
      cam.x = WW < hw * 2 ? WW / 2 : clamp(cam.x, hw, WW - hw); cam.y = HH < hh * 2 ? HH / 2 : clamp(cam.y, hh, HH - hh);
      // draw
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = WATER; g.fillRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = false;
      const z = cam.z * dpr; g.setTransform(z, 0, 0, z, Math.round((w / 2 - cam.x * cam.z) * dpr), Math.round((h / 2 - cam.y * cam.z) * dpr));
      if (S.ground) g.drawImage(S.ground, 0, 0);
      wd.lily.forEach((l) => g.drawImage(imgs.sp.lily[l.v], l.x * 16 + 2, l.y * 16 + 3 + Math.sin(T * 1.2 + l.x) * 0.6));
      if (wd.boat) g.drawImage(imgs.boat, 0, 64, 32, 16, wd.boat.x * 16, wd.boat.y * 16 + Math.sin(T * 1.6) * 1.2, 32, 16);
      drawWaterFx(g, L, imgs);
      const env = { shake: L.shake, T };
      const dyn = [{ y: c.py, draw: (gg) => { gg.fillStyle = 'rgba(40,60,30,.18)'; gg.beginPath(); gg.ellipse(c.px, c.py - 1, 5, 2, 0, 0, Math.PI * 2); gg.fill(); drawTeemo(gg, imgs, c, T); } }, ...animalItems(L, imgs)].sort((a, b) => a.y - b.y);
      const sp = S.sprites; let di = 0;
      for (let i = 0; i < sp.length; i++) { while (di < dyn.length && dyn[di].y <= sp[i].y) { dyn[di].draw(g); di++; } sp[i].draw(g, env); }
      while (di < dyn.length) { dyn[di].draw(g); di++; }
      wd.plots.forEach((wp) => { const p = S.plotsById[wp.id]; if (p && p.ready) wp.cells.forEach((cc, k) => { const ph = (T * 1.5 + k * 0.7) % 2; if (ph < 1) g.drawImage(imgs.twinkle, Math.round(cc.x * 16 + (k * 5) % 12), Math.round(cc.y * 16 - 6 - ph * 6)); }); });
      drawParts(g, L, imgs);
      // screen space overlays
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.font = `400 14px ${TRACKER_FONT}`; g.textBaseline = 'middle'; S.bubbles = [];
      const toS = (wx, wy) => ({ x: (wx - cam.x) * cam.z + w / 2, y: (wy - cam.y) * cam.z + h / 2 });
      const box = (x, y, bw, bh, fill) => { g.fillStyle = '#4a1d36'; g.fillRect(x - 3, y, bw + 6, bh); g.fillRect(x, y - 3, bw, bh + 6); g.fillStyle = fill; g.fillRect(x, y, bw, bh); };
      if (cam.z >= 1.5) wd.plots.forEach((wp) => {
        const p = S.plotsById[wp.id]; if (!p) return;
        const a = toS(wp.center.x * 16, wp.fence.y0 * 16 - 8 + Math.sin(T * 3) * 1.5);
        if (p.ready) { const tw = g.measureText('Harvest').width + 36, bh = 26, x = a.x - tw / 2, y = a.y - bh - 8;
          box(x, y, tw, bh, '#ffe9a8'); g.fillStyle = '#4a1d36'; g.beginPath(); g.moveTo(a.x - 6, y + bh); g.lineTo(a.x + 6, y + bh); g.lineTo(a.x, y + bh + 8); g.fill(); g.textAlign = 'left'; g.fillText('Harvest', x + 28, y + bh / 2 + 1);
          g.fillStyle = '#ffc23c'; g.fillRect(x + 8, y + 6, 14, 14); g.fillStyle = '#c2306b'; g.fillRect(x + 12, y + 10, 6, 6); S.bubbles.push({ kind: 'harvest', id: wp.id, x, y, w: tw, h: bh + 8 }); return; }
        const need = p.planters.filter((q) => q.crop); const todo = need.filter((q) => !S.wet.has(`${wp.id}|${q.key}`));
        if (need.length && todo.length && !S.tasks.some((t) => t.plotId === wp.id) && !(c.act && c.act.task && c.act.task.plotId === wp.id)) {
          const rewardLeft = !S.paid.has(String(wp.id)); const label = rewardLeft ? `Water +${WATER_COINS}` : 'Water'; const tw = g.measureText(label).width + 44, bh = 26, x = a.x - tw / 2, y = a.y - bh - 8 + Math.sin(T * 2.4 + wp.id) * 1.5;
          box(x, y, tw, bh, '#d8f0ff'); g.fillStyle = '#4a1d36'; g.beginPath(); g.moveTo(a.x - 6, y + bh); g.lineTo(a.x + 6, y + bh); g.lineTo(a.x, y + bh + 8); g.fill();
          g.fillStyle = '#3d8be0'; g.fillRect(x + 11, y + 6, 4, 4); g.fillRect(x + 9, y + 10, 8, 6); g.fillRect(x + 10, y + 16, 6, 3); g.fillStyle = '#4a1d36'; g.textAlign = 'left'; g.fillText(label, x + 26, y + bh / 2 + 1);
          S.bubbles.push({ kind: 'water', id: wp.id, x, y, w: tw, h: bh + 8 });
        }
      });
      const hv = S.hover && wd.plots.find((q) => q.id === S.hover); const hp = hv && S.plotsById[hv.id];
      if (hp) { const a = toS(hv.center.x * 16, hv.fence.y0 * 16 - 4); const tw = g.measureText(hp.name).width + 22, bh = 26, x = a.x - tw / 2, y = a.y - bh - 10 - 36; box(x, y, tw, bh, '#fffdf3'); g.fillStyle = '#4a1d36'; g.textAlign = 'left'; g.fillText(hp.name, x + 11, y + bh / 2 + 1); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [imgs, picker]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- pointer input (drag = pan, tap = act, two fingers = pinch) ----
  const onDown = (e) => { const r = cvRef.current.getBoundingClientRect(); S.ptrs.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top }); cvRef.current.setPointerCapture(e.pointerId);
    if (S.ptrs.size === 1) S.drag = { sx: e.clientX, sy: e.clientY, moved: false, cx: S.cam.x, cy: S.cam.y }; else S.drag = { pinch: true, d: null }; };
  const onMove = (e) => {
    const r = cvRef.current.getBoundingClientRect(); const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (!S.ptrs.has(e.pointerId)) { const h = hitTest(p.x, p.y); S.hover = (h.type === 'plot' || h.type === 'planter') ? h.id : null; cvRef.current.style.cursor = h.type === 'ground' ? 'default' : 'pointer'; return; }
    S.ptrs.set(e.pointerId, p);
    if (S.ptrs.size >= 2) { const [a, b] = Array.from(S.ptrs.values()); const d = Math.hypot(a.x - b.x, a.y - b.y); if (S.drag.d) zoomBy(d / S.drag.d, (a.x + b.x) / 2, (a.y + b.y) / 2); S.drag.d = d; S.drag.moved = true; return; }
    const d = S.drag; if (!d) return; const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 6) { d.moved = true; S.follow = false; S.anchor = null; }
    if (d.moved) { S.cam.x = d.cx - dx / S.cam.z; S.cam.y = d.cy - dy / S.cam.z; }
  };
  const onUp = (e) => { const r = cvRef.current.getBoundingClientRect(); const d = S.drag; S.ptrs.delete(e.pointerId); if (S.ptrs.size === 0) { if (d && !d.moved && !d.pinch) click(e.clientX - r.left, e.clientY - r.top); S.drag = null; } else if (S.ptrs.size === 1) S.drag = { pinch: true, d: null, moved: true }; };
  useEffect(() => { const cv = cvRef.current; if (!cv) return undefined; const onWheel = (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const r = cv.getBoundingClientRect(); zoomBy(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top); };
    cv.addEventListener('wheel', onWheel, { passive: false }); return () => cv.removeEventListener('wheel', onWheel); }, [imgs]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') setPicker(null); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);

  const pPlot = picker && plotsById[picker.id]; const pPl = pPlot && pPlot.planters[picker.i];
  const choose = (cropId) => { if (!pPlot || !pPl || pPl.locked) return;     // planting is free: nothing is charged
    setFarm((prev) => { const base = prev || {}; const crops = { ...(base.crops || {}) }; crops[pPlot.id] = { ...(crops[pPlot.id] || {}), [pPl.key]: cropId }; return { ...base, v: 1, crops, basket: base.basket || {}, harvested: base.harvested || {} }; });
    sfxEvt('drop'); setPicker(null); };
  const fit = () => { const wd = S.world; S.follow = false; S.anchor = null; S.cam.tz = clamp(Math.min(S.size.w / (wd.W * 16), S.size.h / (wd.H * 16)) * 0.95, 0.3, 6); S.cam.x = wd.W * 8; S.cam.y = wd.H * 8; };
  const home = () => { S.follow = true; S.anchor = null; S.cat.idle = 0; };
  const shown = hoverCrop || (pPl && pPl.crop);
  const shownName = shown ? (CROPS.find((c) => c.id === shown) || {}).name : null;

  return (
    <div style={{ position: 'relative', width: '75%', margin: '20px auto 0' }}>
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: 'min(51vh, 465px)', minHeight: 260, background: WATER, overflow: 'hidden',
        WebkitMaskImage: 'linear-gradient(to right, transparent, #000 30px, #000 calc(100% - 30px), transparent), linear-gradient(to bottom, transparent, #000 30px, #000 calc(100% - 30px), transparent)',
        WebkitMaskComposite: 'source-in', maskImage: 'linear-gradient(to right, transparent, #000 30px, #000 calc(100% - 30px), transparent), linear-gradient(to bottom, transparent, #000 30px, #000 calc(100% - 30px), transparent)', maskComposite: 'intersect' }}>
        <canvas ref={cvRef} aria-label="Kutitap's Savings Farm" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => { S.hover = null; }}
          style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated', touchAction: 'none' }} />
      </div>
      <div style={{ position: 'absolute', top: 12, right: 30, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button style={btn} aria-label="Zoom in" onClick={() => zoomBy(1.25)}>+</button>
        <button style={btn} aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>-</button>
        <button style={btn} aria-label="Follow Kutitap" title="Follow Kutitap" onClick={home}><img src={FACE_URL} alt="" style={{ width: 25, height: 21, imageRendering: 'pixelated', display: 'block', margin: '0 auto' }} /></button>
        <button style={btn} aria-label="Show whole map" title="Show the whole map" onClick={fit}><img src={SPROUT_URL} alt="" style={{ width: 24, height: 20, imageRendering: 'pixelated', display: 'block', margin: '0 auto' }} /></button>
        <button style={{ ...btn, background: waterMode ? '#9bd4ff' : '#fff3d4' }} aria-pressed={waterMode} aria-label="Water mode" title="Water mode: tap a plant to water it" onClick={() => { setWaterMode((v) => !v); setPicker(null); }}><img src={CAN_URL} alt="" style={{ width: 28, height: 16, imageRendering: 'pixelated', display: 'block', margin: '0 auto' }} /></button>
      </div>
      {waterMode && <div style={{ position: 'absolute', left: 34, top: 14, background: '#d8f0ff', border: '3px solid #4a1d36', padding: '5px 9px', fontFamily: 'inherit', fontWeight: 400, textTransform: 'none', fontSize: 11, color: '#4a1d36' }}>Water mode: tap a plant</div>}
      {plots.length === 0 && imgs && <div style={{ position: 'absolute', left: 34, bottom: 20, background: '#fffdf3', border: '3px solid #4a1d36', padding: '8px 12px', fontFamily: 'inherit', fontWeight: 400, textTransform: 'none', fontSize: 13, color: '#4a1d36' }}>Add a savings goal to plant your first plot!</div>}
      {toast && <div style={{ position: 'absolute', left: '50%', top: 14, transform: 'translateX(-50%)', background: '#ffe9a8', border: '3px solid #4a1d36', padding: '8px 14px', fontFamily: 'inherit', fontWeight: 400, textTransform: 'none', fontSize: 13, color: '#4a1d36', maxWidth: '86%', textAlign: 'center', zIndex: 4 }}>{toast}</div>}
      {goals && goals.filter((g) => g && g.monthsList && g.monthsList.length).length > MAX_PLOTS && <div style={{ position: 'absolute', left: 34, bottom: 14, background: '#fffdf3', border: '3px solid #4a1d36', padding: '4px 8px', fontFamily: 'inherit', fontWeight: 400, textTransform: 'none', fontSize: 11, color: '#4a1d36' }}>Showing the first {MAX_PLOTS} goals</div>}
      {pPlot && pPl && (
        <div role="dialog" aria-label="Pick a crop" style={{ position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', background: '#fff3d4', border: '3px solid #4a1d36', padding: '4px 10px', marginBottom: 4, fontFamily: TRACKER_FONT, fontWeight: 400, textTransform: 'none', fontSize: 14, color: '#4a1d36', display: 'flex', gap: 10, alignItems: 'center', boxShadow: '2px 2px 0 rgba(74,29,54,.35)' }}>
            <span>{pPlot.name} - {pPl.label}</span><span style={{ color: '#8a5a74' }}>{pPl.locked ? 'paid: locked in' : (shownName || 'pick a crop')}</span>
            <button onClick={() => setPicker(null)} aria-label="Close" style={{ ...btn, width: 22, height: 22, fontSize: 11 }}>X</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5, padding: 8, pointerEvents: 'auto', borderStyle: 'solid', borderWidth: '18px 18px', borderImage: `url(${FRAME_URL}) 9 fill / 18px / 0 stretch`, imageRendering: 'pixelated', boxSizing: 'border-box', maxWidth: '100%' }}>
            {CROPS.map((c) => { const sel = pPl.crop === c.id; return (
              <button key={c.id} disabled={pPl.locked} aria-label={c.name} title={c.name} onClick={() => choose(c.id)} onMouseEnter={() => setHoverCrop(c.id)} onMouseLeave={() => setHoverCrop(null)}
                style={{ width: 52, height: 56, border: 0, padding: 0, background: `url(${SLOT_URL}) center / 100% 100% no-repeat`, imageRendering: 'pixelated', cursor: pPl.locked ? 'default' : 'pointer', opacity: pPl.locked && !sel ? 0.5 : 1, borderRadius: 12, boxShadow: sel ? '0 0 0 3px rgba(255,255,255,.75), 0 0 0 5px rgba(240,200,200,.55)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 40, height: 40, marginTop: -3, backgroundImage: `url(${CROPS_SHEET_URL})`, backgroundSize: '280px 1320px', backgroundPosition: `-200px -${c.row * 40}px`, imageRendering: 'pixelated' }} />
              </button>); })}
          </div>
        </div>)}
    </div>
  );
}
