import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CROPS, CROP_BY_ID, plotsFromGoals, MAX_PLOTS } from './farmLogic.js';
import { buildWorld, findPath, nearestWalkable } from './farmWorld.js';
import { loadImages, bakeGround, buildSprites, CROPS_SHEET_URL } from './farmRender.js';
import coinUrl from '../assets/shop/star-coin.png';

const WATER = '#9bd4c3';
const sfxEvt = (type) => { try { window.dispatchEvent(new CustomEvent('kutitap-sfx', { detail: { type } })); } catch (e) { /* ignore */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const btn = { width: 34, height: 34, background: '#fff3d4', border: '3px solid #4a1d36', boxShadow: '2px 2px 0 rgba(74,29,54,.35)', color: '#4a1d36', fontFamily: 'SproutPx, monospace', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 };

export default function KutitapFarm({ goals, farm, setFarm }) {
  const plots = useMemo(() => plotsFromGoals(goals, farm), [goals, farm]);
  const layoutKey = plots.map((p) => `${p.id}:${p.planters.length}`).join('|');
  const world = useMemo(() => buildWorld(plots), [layoutKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const plotsById = useMemo(() => Object.fromEntries(plots.map((p) => [p.id, p])), [plots]);
  const [imgs, setImgs] = useState(null);
  const [picker, setPicker] = useState(null);   // { id, i }
  const [toast, setToast] = useState('');
  const wrapRef = useRef(null); const cvRef = useRef(null);
  const S = useRef({ cam: { x: 0, y: 0, z: 2.2, tz: 2.2 }, anchor: null, follow: true, size: { w: 600, h: 400, dpr: 1 }, hover: null, bubbles: [], ptrs: new Map(), drag: null,
    cat: { px: 0, py: 0, dir: 'down', path: [], t: 0, idle: 3, moving: false }, ground: null, sprites: [], world: null, plotsById: {}, imgs: null }).current;
  S.world = world; S.plotsById = plotsById; S.imgs = imgs;
  if (typeof window !== 'undefined' && window.__FARM_DEBUG) window.__farmS = S;

  useEffect(() => { let on = true; loadImages().then((i) => { if (on) setImgs(i); }); try { document.fonts && document.fonts.load('14px SproutPx'); } catch (e) { /* ignore */ } return () => { on = false; }; }, []);
  useEffect(() => { // bake ground when the layout changes
    if (!imgs) return;
    S.ground = bakeGround(world, imgs);
    const c = S.cat; const tx = Math.floor(c.px / 16), ty = Math.floor((c.py - 1) / 16);
    if (!c.px || !world.walk[ty * world.W + tx]) { c.px = world.home.x * 16 + 8; c.py = world.home.y * 16 + 14; c.path = []; S.cam.x = c.px; S.cam.y = c.py; }
  }, [imgs, world]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (imgs) S.sprites = buildSprites(world, plotsById, imgs); }, [imgs, world, plotsById]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (m) => { setToast(m); clearTimeout(say.t); say.t = setTimeout(() => setToast(''), 3200); };
  const walkTo = (tx, ty) => {
    const c = S.cat; const from = { x: Math.floor(c.px / 16), y: Math.floor((c.py - 1) / 16) };
    const to = nearestWalkable(S.world, tx, ty, 5); if (!to) return false;
    const p = findPath(S.world, from, to); if (!p) return false; c.path = p; c.idle = 0; return true;
  };
  const toWorld = (sx, sy) => ({ x: S.cam.x + (sx - S.size.w / 2) / S.cam.z, y: S.cam.y + (sy - S.size.h / 2) / S.cam.z });
  const zoomBy = (f, sx, sy) => { const z = clamp(S.cam.tz * f, 0.5, 6); S.cam.tz = z; if (sx != null) { const w = toWorld(sx, sy); S.anchor = { sx, sy, wx: w.x, wy: w.y }; } else S.anchor = null; };

  const hitTest = (sx, sy) => {
    for (const b of S.bubbles) if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) return { type: 'harvest', id: b.id };
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
    if (h.type === 'planter') { walkTo(h.cell.x, h.cell.y + 1); setPicker({ id: h.id, i: h.i }); sfxEvt('open'); return; }
    setPicker(null);
    if (h.type === 'plot' || h.type === 'ground') walkTo(h.tx, h.ty);
  };

  // ---- main loop ----
  useEffect(() => {
    const cv = cvRef.current, wrap = wrapRef.current; if (!cv || !wrap || !imgs) return undefined;
    const g = cv.getContext('2d');
    const resize = () => { const r = wrap.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); S.size = { w: r.width, h: r.height, dpr }; cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(wrap);
    let raf, last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const c = S.cat, cam = S.cam, wd = S.world, { w, h, dpr } = S.size;
      // cat movement
      c.moving = false;
      if (c.path.length) {
        const tg = c.path[0], tx = tg.x * 16 + 8, ty = tg.y * 16 + 14, dx = tx - c.px, dy = ty - c.py, d = Math.hypot(dx, dy), step = 34 * dt;
        if (d <= step) { c.px = tx; c.py = ty; c.path.shift(); } else { c.px += (dx / d) * step; c.py += (dy / d) * step; }
        c.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'); c.moving = true; c.t += dt;
      } else { c.idle += dt; if (S.follow && c.idle > 6 + (c.px % 3) && wd.plots.length >= 0) { const a = Math.floor(c.px / 16) + Math.round((Math.random() - 0.5) * 14), b = Math.floor(c.py / 16) + Math.round((Math.random() - 0.5) * 10); walkTo(a, b); c.idle = 0; } }
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
      const T = now / 1000;
      wd.lily.forEach((l) => g.drawImage(imgs.sp.lily[l.v], l.x * 16 + 2, l.y * 16 + 3 + Math.sin(T * 1.2 + l.x) * 0.6));
      if (wd.boat) g.drawImage(imgs.boat, 0, 64, 32, 16, wd.boat.x * 16, wd.boat.y * 16 + Math.sin(T * 1.6) * 1.2, 32, 16);
      const drawCat = () => {
        const sheet = c.dir === 'left' ? imgs.catLeft : c.dir === 'right' ? imgs.catRight : imgs.catDown;
        const fw = c.dir === 'left' || c.dir === 'right' ? 10 : 14; const f = c.moving ? Math.floor(c.t * 8) % 4 : -1;
        if (f < 0) g.drawImage(imgs.catIdle, Math.round(c.px - 7), Math.round(c.py - 16)); else g.drawImage(sheet, f * fw, 0, fw, 16, Math.round(c.px - fw / 2), Math.round(c.py - 16 - (f % 2)), fw, 16);
      };
      let catDone = false; const sp = S.sprites;
      for (let i = 0; i < sp.length; i++) { if (!catDone && sp[i].y > c.py) { drawCat(); catDone = true; } sp[i].draw(g); }
      if (!catDone) drawCat();
      // twinkles on plots ready to harvest
      wd.plots.forEach((wp) => { const p = S.plotsById[wp.id]; if (p && p.ready) wp.cells.forEach((cc, k) => { const ph = (T * 1.5 + k * 0.7) % 2; if (ph < 1) g.drawImage(imgs.twinkle, Math.round(cc.x * 16 + (k * 5) % 12), Math.round(cc.y * 16 - 6 - ph * 6)); }); });
      // screen space overlays
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.font = '13px SproutPx, monospace'; g.textBaseline = 'middle'; S.bubbles = [];
      const toS = (wx, wy) => ({ x: (wx - cam.x) * cam.z + w / 2, y: (wy - cam.y) * cam.z + h / 2 });
      const box = (x, y, bw, bh, fill) => { g.fillStyle = '#4a1d36'; g.fillRect(x - 3, y, bw + 6, bh); g.fillRect(x, y - 3, bw, bh + 6); g.fillStyle = fill; g.fillRect(x, y, bw, bh); };
      wd.plots.forEach((wp) => { const p = S.plotsById[wp.id]; if (!p || !p.ready) return; const a = toS(wp.center.x * 16, wp.fence.y0 * 16 - 8 + Math.sin(T * 3) * 1.5); const tw = g.measureText('Harvest!').width + 36, bh = 26, x = a.x - tw / 2, y = a.y - bh - 8;
        box(x, y, tw, bh, '#ffe9a8'); g.fillStyle = '#4a1d36'; g.beginPath(); g.moveTo(a.x - 6, y + bh); g.lineTo(a.x + 6, y + bh); g.lineTo(a.x, y + bh + 8); g.fill(); g.fillStyle = '#4a1d36'; g.textAlign = 'left'; g.fillText('Harvest!', x + 28, y + bh / 2 + 1);
        g.fillStyle = '#ffc23c'; g.fillRect(x + 8, y + 6, 14, 14); g.fillStyle = '#c2306b'; g.fillRect(x + 12, y + 10, 6, 6); S.bubbles.push({ id: wp.id, x, y, w: tw, h: bh + 8 }); });
      const hv = S.hover && wd.plots.find((q) => q.id === S.hover); const hp = hv && S.plotsById[hv.id];
      if (hp) { const a = toS(hv.center.x * 16, hv.fence.y0 * 16 - 4); const nm = hp.name; const tw = g.measureText(nm).width + 22, bh = 26, x = a.x - tw / 2, y = a.y - bh - 10; box(x, y, tw, bh, '#fffdf3'); g.fillStyle = '#4a1d36'; g.textAlign = 'left'; g.fillText(nm, x + 11, y + bh / 2 + 1); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [imgs]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const choose = (cropId) => { if (!pPlot || !pPl || pPl.locked) return;
    setFarm((prev) => { const base = prev || {}; const crops = { ...(base.crops || {}) }; crops[pPlot.id] = { ...(crops[pPlot.id] || {}), [pPl.key]: cropId }; return { ...base, v: 1, crops, basket: base.basket || {}, harvested: base.harvested || {} }; });
    sfxEvt('drop'); setPicker(null); };
  const fit = () => { const wd = S.world; S.follow = false; S.anchor = null; S.cam.tz = clamp(Math.min(S.size.w / (wd.W * 16), S.size.h / (wd.H * 16)) * 0.95, 0.5, 6); S.cam.x = wd.W * 8; S.cam.y = wd.H * 8; };
  const home = () => { S.follow = true; S.anchor = null; S.cat.idle = 0; };

  return (
    <div style={{ position: 'relative', width: '100%', marginTop: 20 }}>
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: 'min(68vh, 620px)', minHeight: 340, background: WATER, overflow: 'hidden',
        WebkitMaskImage: 'linear-gradient(to right, transparent, #000 36px, #000 calc(100% - 36px), transparent), linear-gradient(to bottom, transparent, #000 36px, #000 calc(100% - 36px), transparent)',
        WebkitMaskComposite: 'source-in', maskImage: 'linear-gradient(to right, transparent, #000 36px, #000 calc(100% - 36px), transparent), linear-gradient(to bottom, transparent, #000 36px, #000 calc(100% - 36px), transparent)', maskComposite: 'intersect' }}>
        <canvas ref={cvRef} aria-label="Kutitap's Savings Farm" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => { S.hover = null; }}
          style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated', touchAction: 'none' }} />
      </div>
      <div style={{ position: 'absolute', top: 12, right: 40, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button style={btn} aria-label="Zoom in" onClick={() => zoomBy(1.25)}>+</button>
        <button style={btn} aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>-</button>
        <button style={{ ...btn, fontSize: 12 }} aria-label="Follow Kutitap" onClick={home}>CAT</button>
        <button style={{ ...btn, fontSize: 12 }} aria-label="Show whole island" onClick={fit}>ALL</button>
      </div>
      {plots.length === 0 && imgs && <div style={{ position: 'absolute', left: 44, bottom: 24, background: '#fffdf3', border: '3px solid #4a1d36', padding: '8px 12px', fontFamily: 'SproutPx, monospace', fontSize: 13, color: '#4a1d36' }}>Add a savings goal to plant your first plot!</div>}
      {toast && <div style={{ position: 'absolute', left: '50%', top: 16, transform: 'translateX(-50%)', background: '#ffe9a8', border: '3px solid #4a1d36', padding: '8px 14px', fontFamily: 'SproutPx, monospace', fontSize: 13, color: '#4a1d36', maxWidth: '86%', textAlign: 'center' }}>{toast}</div>}
      {goals && goals.filter((g) => g && g.monthsList && g.monthsList.length).length > MAX_PLOTS && <div style={{ position: 'absolute', left: 44, top: 14, background: '#fffdf3', border: '3px solid #4a1d36', padding: '4px 8px', fontFamily: 'SproutPx, monospace', fontSize: 11, color: '#4a1d36' }}>Showing the first {MAX_PLOTS} goals</div>}
      {pPlot && pPl && (
        <div role="dialog" aria-label="Pick a crop" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(94%, 440px)', background: '#fffdf3', border: '4px solid #4a1d36', boxShadow: '5px 5px 0 rgba(74,29,54,.35)', fontFamily: 'SproutPx, monospace', color: '#4a1d36', zIndex: 5 }}>
          <div style={{ background: '#7e5fc4', color: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15 }}>
            <span>{pPl.locked ? 'LOCKED IN' : 'PICK A CROP'}</span>
            <button onClick={() => setPicker(null)} aria-label="Close" style={{ ...btn, width: 26, height: 26, fontSize: 13, background: '#fff3d4' }}>X</button>
          </div>
          <div style={{ padding: '10px 12px 4px', fontSize: 13 }}>{pPlot.name} - {pPl.label}</div>
          <div style={{ padding: '0 12px 8px', fontSize: 11, color: '#8a5a74' }}>{pPl.locked ? 'This month is paid, so its crop is locked in.' : 'You can change it until this month is paid.'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: '0 12px 12px' }}>
            {CROPS.map((c) => { const sel = pPl.crop === c.id; return (
              <button key={c.id} disabled={pPl.locked} onClick={() => choose(c.id)} style={{ background: sel ? '#ffe9a8' : '#fff3d4', border: `3px solid ${sel ? '#ff9628' : '#4a1d36'}`, padding: '2px 0 4px', cursor: pPl.locked ? 'default' : 'pointer', opacity: pPl.locked && !sel ? 0.45 : 1, fontFamily: 'inherit', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ width: 48, height: 48, backgroundImage: `url(${CROPS_SHEET_URL})`, backgroundSize: '336px 1584px', backgroundPosition: `-240px -${c.row * 48}px`, imageRendering: 'pixelated' }} />
                <span style={{ fontSize: 9, marginTop: 2 }}>{c.name}</span>
                <span style={{ fontSize: 10, color: '#c2306b', display: 'flex', alignItems: 'center', gap: 3 }}><img src={coinUrl} alt="" width={10} height={10} style={{ imageRendering: 'pixelated' }} />{c.price}</span>
              </button>); })}
          </div>
        </div>)}
    </div>
  );
}
