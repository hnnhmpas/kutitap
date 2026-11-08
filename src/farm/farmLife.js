// Living things on the farm: ambient animals, jumping fish, particles, Kutitap (Teemo) drawing.
const rnd = (a, b) => a + Math.random() * (b - a);
const DIRCOL = { up: 0, left: 2, down: 4, right: 6 };   // columns of teemo.png (8 directions)

export function initLife(world) {
  return {
    animals: (world.animals || []).map((a) => ({ ...a, px: a.x * 16 + 8, py: a.y * 16 + 15, tx: a.x, ty: a.y, face: Math.random() < 0.5 ? 1 : -1, t: Math.random() * 4, wait: rnd(1, 4), moving: false })),
    fish: [], parts: [], shake: {}, nextFish: rnd(2, 4), ripples: [],
  };
}

export function addParts(L, kind, x, y, n = 1, o = {}) {
  for (let i = 0; i < n; i++) L.parts.push({ kind, x: x + rnd(-2, 2), y: y + rnd(-2, 2), vx: o.vx != null ? o.vx + rnd(-8, 8) : rnd(-14, 14), vy: o.vy != null ? o.vy + rnd(-6, 6) : rnd(-26, -8), life: o.life || 0.9, age: 0, g: o.g != null ? o.g : 60 });
}

export function updateLife(L, world, dt, T) {
  // animals wander on their own island only (never over bridges)
  const occ = new Set(L.animals.map((a) => `${a.tx},${a.ty}`));
  L.animals.forEach((a) => {
    const speed = a.kind === 'cow' ? 7 : 13;
    if (a.moving) {
      const dx = a.tx * 16 + 8 - a.px, dy = a.ty * 16 + 15 - a.py, d = Math.hypot(dx, dy), st = speed * dt; a.t += dt;
      if (d <= st) { a.px = a.tx * 16 + 8; a.py = a.ty * 16 + 15; a.moving = false; a.wait = rnd(2, 6); } else { a.px += (dx / d) * st; a.py += (dy / d) * st; if (Math.abs(dx) > 0.5) a.face = dx > 0 ? 1 : -1; }
    } else {
      a.wait -= dt; a.t += dt * 0.5;
      if (a.wait <= 0) {
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [a.tx + dx, a.ty + dy]).filter(([x, y]) => { const k = `${x},${y}`;
          if (!world.walk[y * world.W + x] || world.bridgeSet.has(k) || occ.has(k) || world.patch.has(k)) return false;
          if (a.region) return a.region.has(k);                                   // pen animals stay in their pen
          return world.owner.get(k) === a.island && !world.plots.some((p) => x >= p.fence.x0 && x <= p.fence.x1 && y >= p.fence.y0 && y <= p.fence.y1) && !(world.pens || []).some((p) => x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) && !(world.terraces || []).some((t) => y >= t.y1 - 1 && y <= t.y1 + 2 && x >= t.x0 && x <= t.x1); });
        if (opts.length) { const [x, y] = opts[Math.floor(Math.random() * opts.length)]; occ.delete(`${a.tx},${a.ty}`); a.tx = x; a.ty = y; occ.add(`${x},${y}`); a.moving = true; } else a.wait = 2;
      }
    }
  });
  // fish jump every now and then
  L.nextFish -= dt;
  if (L.nextFish <= 0 && world.fishSpots && world.fishSpots.length) {      // only from spots where the whole arc is open water
    const c = world.fishSpots[Math.floor(Math.random() * world.fishSpots.length)];
    L.fish.push({ x: c.x * 16 + 8, y: c.y * 16 + 8, dir: c.dir, t: 0, dur: rnd(0.8, 1.1), ic: Math.floor(Math.random() * 3), splashed: false });
    L.ripples.push({ x: c.x * 16 + 8, y: c.y * 16 + 10, age: 0 });
    L.nextFish = rnd(5, 11);
  } else if (L.nextFish <= 0) L.nextFish = 6;
  L.fish.forEach((f) => { f.t += dt; if (!f.splashed && f.t >= f.dur) { f.splashed = true; const ex = f.x + f.dir * 22; L.ripples.push({ x: ex, y: f.y + 2, age: 0 }); addParts(L, 'drop', ex, f.y, 5, { vy: -22, life: 0.6 }); } });
  L.fish = L.fish.filter((f) => f.t < f.dur + 0.05);
  L.ripples.forEach((r) => { r.age += dt; }); L.ripples = L.ripples.filter((r) => r.age < 1.1);
  L.parts.forEach((p) => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; }); L.parts = L.parts.filter((p) => p.age < p.life);
}

const FISH = [[5, 0], [1, 0], [6, 0]];
export function drawWaterFx(g, L, im) {
  L.ripples.forEach((r) => { const k = r.age / 1.1; g.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.8})`; g.lineWidth = 0.8; g.beginPath(); g.ellipse(r.x, r.y, 3 + k * 9, 1.5 + k * 4, 0, 0, Math.PI * 2); g.stroke(); });
  L.fish.forEach((f) => {
    if (f.t > f.dur) return; const k = f.t / f.dur; const x = f.x + f.dir * 22 * k, y = f.y - Math.sin(k * Math.PI) * 15; const [cx, cy] = FISH[f.ic];
    g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate((k - 0.5) * 1.8 * f.dir); if (f.dir < 0) g.scale(-1, 1);
    g.drawImage(im.fish, cx * 16, cy * 16, 16, 16, -8, -8, 16, 16); g.restore();
  });
}
export function drawParts(g, L, im) {
  L.parts.forEach((p) => {
    const a = 1 - p.age / p.life; const x = Math.round(p.x), y = Math.round(p.y);
    if (p.kind === 'drop') { g.fillStyle = `rgba(120,190,255,${a})`; g.fillRect(x, y, 1, 2); }
    else if (p.kind === 'leaf') { g.fillStyle = `rgba(111,176,92,${a})`; g.fillRect(x, y, 2, 2); }
    else if (p.kind === 'chip') { g.fillStyle = `rgba(190,140,90,${a})`; g.fillRect(x, y, 2, 1); }
    else if (p.kind === 'spark') { g.fillStyle = `rgba(255,240,170,${a})`; g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y, 3, 1); }
    else if (p.kind === 'note') { g.fillStyle = `rgba(194,48,107,${a})`; g.fillRect(x, y, 2, 2); g.fillRect(x + 1, y - 4, 1, 4); g.fillRect(x + 1, y - 4, 3, 1); }
    else if (p.kind === 'heart') { g.fillStyle = `rgba(240,88,154,${a})`; g.fillRect(x, y, 2, 1); g.fillRect(x + 3, y, 2, 1); g.fillRect(x - 1, y + 1, 7, 2); g.fillRect(x, y + 3, 5, 1); g.fillRect(x + 1, y + 4, 3, 1); g.fillRect(x + 2, y + 5, 1, 1); }
    else if (p.kind === 'zzz') { g.fillStyle = `rgba(90,70,160,${a})`; g.fillRect(x, y, 4, 1); g.fillRect(x + 2, y + 1, 1, 1); g.fillRect(x + 1, y + 2, 1, 1); g.fillRect(x, y + 3, 4, 1); }
    else if (p.kind === 'coin') { g.globalAlpha = a; g.drawImage(im.coin, x - 6, y - 6, 12, 12); g.globalAlpha = 1; }
  });
}

export function animalItems(L, im) {
  return L.animals.map((a) => ({ y: a.py, draw: (g) => {
    const flip = a.face < 0;
    if (a.kind === 'cow') { const f = a.moving ? Math.floor(a.t * 4) % 3 : (Math.floor(a.t * 0.6) % 2 ? 1 : 0); g.save(); g.translate(Math.round(a.px), 0); if (flip) g.scale(-1, 1); g.drawImage(im.cow, f * 32, 0, 32, 32, -16, Math.round(a.py) - 27, 32, 32); g.restore(); }
    else { const f = a.moving ? Math.floor(a.t * 6) % 4 : (Math.floor(a.t * 0.8) % 2); const row = a.moving ? 1 : 0; g.save(); g.translate(Math.round(a.px), 0); if (flip) g.scale(-1, 1); g.drawImage(im.chicken, f * 16, row * 16, 16, 16, -8, Math.round(a.py) - 13, 16, 16); g.restore(); }
  } }));
}

// ---- Kutitap (Teemo) ----
const WALK = [0, 1, 2, 1];
export function drawTeemo(g, im, c, T) {
  const col = DIRCOL[c.dir] != null ? DIRCOL[c.dir] : 4;
  let row = 1, hop = 0, flip = false, dirCol = col;
  if (c.moving) row = WALK[Math.floor(c.t * 8) % 4];
  const a = c.act;
  if (a && a.type === 'dance') { const seq = [4, 2, 0, 6]; dirCol = seq[Math.floor(a.t * 3.2) % 4]; row = Math.floor(a.t * 8) % 2 ? 0 : 2; hop = -Math.abs(Math.sin(a.t * 9)) * 3; }
  if (a && a.type === 'sleep') { row = 1; hop = 1; }
  const x = Math.round(c.px - 8), y = Math.round(c.py - 16 + hop);
  g.drawImage(im.teemo, dirCol * 16, row * 16, 16, 16, x, y, 16, 16);
  if (!a) return;
  const fl = c.dir === 'left' ? -1 : 1; const hx = c.px + fl * 8, hy = c.py - 9;
  const tool = (col2, row2, ox, oy, rot, pivx, pivy, mirror) => { g.save(); g.translate(Math.round(hx + ox), Math.round(hy + oy)); if (mirror) g.scale(-1, 1); g.rotate(rot); g.drawImage(im.tools, col2 * 16, row2 * 16, 16, 16, -pivx, -pivy, 16, 16); g.restore(); };
  if (a.type === 'water') { const pour = a.t > 0.25 && a.t < a.dur - 0.2; tool(pour ? 1 : 0, 0, 0, -2, 0, 8, 8, fl > 0); }
  if (a.type === 'chop') { const ph = (a.t % 0.6) / 0.6; const rot = (ph < 0.55 ? -1.2 + ph * 3.2 : 0.55 - (ph - 0.55) * 3.5) * fl; tool(2, 2, 0, 0, rot, 8, 14, false); }
  if (a.type === 'mine') { const ph = (a.t % 0.7) / 0.7; const rot = (ph < 0.55 ? -1.2 + ph * 3.2 : 0.55 - (ph - 0.55) * 3.5) * fl; tool(2, 4, 0, 0, rot, 8, 14, false); }
}
