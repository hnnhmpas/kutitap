// The farm map: a locked, hand-approved archipelago (see farmMap.js). Plots snap into its 15 fenced slots.
import { cellHash, SHAPE_OPTIONS } from './farmLogic.js';
import { MAP } from './farmMap.js';

const K = (x, y) => `${x},${y}`;
const BLOCKING_DECOR = new Set(['tree', 'bush', 'rock', 'stump', 'log']);

// choose a slot (best fit) and a planter layout for every plot, in goal order
function assign(plots) {
  const free = MAP.slots.map((s, i) => ({ s, i, w: s.fx1 - s.fx0 + 1, h: s.fy1 - s.fy0 + 1 })).sort((a, b) => a.w * a.h - b.w * b.h || a.i - b.i);
  const out = [];
  plots.forEach((p) => {
    const n = p.planters.length; const opts = SHAPE_OPTIONS[Math.min(12, Math.max(1, n))];
    let pick = null;
    for (const f of free) { const shape = opts.find((sh) => Math.max(...sh.map((r) => r.length)) + 4 <= f.w && sh.length + 4 <= f.h); if (shape) { pick = { f, shape }; break; } }
    if (!pick && free.length) { const f = free[free.length - 1]; pick = { f, shape: opts[0] }; }        // nothing fits: biggest slot left
    if (!pick) return;
    free.splice(free.indexOf(pick.f), 1); out.push({ plot: p, slot: pick.f.s, slotIdx: pick.f.i, shape: pick.shape });
  });
  return out;
}

export function buildWorld(plots) {
  const { W, H } = MAP;
  const land = new Set(), owner = new Map();
  MAP.land.forEach(([x, y, o]) => { land.add(K(x, y)); owner.set(K(x, y), o); });
  const terraces = MAP.terraces.map((t) => ({ ...t, stairs: { x: t.sx, y: t.y1 } }));
  terraces.forEach((t) => { for (let x = t.x0; x <= t.x1; x++) { land.add(K(x, t.y1 + 1)); if (!owner.has(K(x, t.y1 + 1))) owner.set(K(x, t.y1 + 1), owner.get(K(x, t.y1)) ?? 0); } });
  const bridgeSet = new Set(); MAP.bridges.forEach((b) => { if (b.dir === 'h') for (let x = b.x0; x < b.x1; x++) bridgeSet.add(K(x, b.y)); else for (let y = b.y0; y < b.y1; y++) bridgeSet.add(K(b.x, y)); });
  // plots -> slots
  const patch = new Set(), planterCells = new Set(), fences = [], worldPlots = [];
  assign(plots).forEach(({ plot, slot, slotIdx, shape }) => {
    const shW = Math.max(...shape.map((r) => r.length)), shH = shape.length;
    const sw = slot.fx1 - slot.fx0 + 1, sh = slot.fy1 - slot.fy0 + 1;
    const ox = slot.fx0 + 2 + Math.max(0, Math.floor((sw - 4 - shW) / 2)), oy = slot.fy0 + 2 + Math.max(0, Math.floor((sh - 4 - shH) / 2));
    const cells = []; shape.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) if (row[dx] === 'X') cells.push({ x: ox + dx, y: oy + dy }); });
    cells.forEach((c, i) => { c.i = i; planterCells.add(K(c.x, c.y)); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) patch.add(K(c.x + a, c.y + b)); });
    slot.fences.forEach((f) => fences.push({ x: f.x, y: f.y, kind: f.k }));
    worldPlots.push({ id: plot.id, cells, gate: { x: slot.gx, y: slot.fy1 }, fence: { x0: slot.fx0, y0: slot.fy0, x1: slot.fx1, y1: slot.fy1 }, center: { x: (slot.fx0 + slot.fx1 + 1) / 2, y: (slot.fy0 + slot.fy1 + 1) / 2 }, slot: slotIdx });
  });
  patch.forEach((k) => land.add(k));
  const pen = MAP.pen; const pens = [pen];
  MAP.penFences.forEach((f) => fences.push({ x: f.x, y: f.y, kind: f.k, pen: true }));
  // blocked tiles
  const blocked = new Set([...planterCells, ...fences.map((f) => K(f.x, f.y))]);
  MAP.decor.forEach((d) => { if (BLOCKING_DECOR.has(d.kind)) blocked.add(K(d.x, d.y)); });
  MAP.structures.forEach((s) => s.bt.forEach(([x, y]) => blocked.add(K(x, y))));
  const stairCells = new Set();
  terraces.forEach((t) => { for (let x = t.x0; x <= t.x1; x++) { blocked.add(K(x, t.y1)); blocked.add(K(x, t.y1 + 1)); } for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { const k = K(t.stairs.x + a, t.stairs.y + b); blocked.delete(k); stairCells.add(k); } });
  // walk grid
  const walk = new Uint8Array(W * H);
  land.forEach((k) => { if (blocked.has(k)) return; const [a, b] = k.split(',').map(Number); if (a >= 0 && b >= 0 && a < W && b < H) walk[b * W + a] = 1; });
  bridgeSet.forEach((k) => { const [a, b] = k.split(',').map(Number); walk[b * W + a] = 1; });
  stairCells.forEach((k) => { const [a, b] = k.split(',').map(Number); walk[b * W + a] = 1; });
  // every plot must be reachable: if its fence is closed off from the walkable land, open the fence where a path would cross it
  const fenceAt = new Map(fences.map((f, i) => [K(f.x, f.y), i]));
  worldPlots.forEach((wp) => {
    const target = (x, y) => x > wp.fence.x0 && x < wp.fence.x1 && y > wp.fence.y0 && y < wp.fence.y1 && walk[y * W + x];
    const prev = new Map(); const start = K(MAP.home.x, MAP.home.y); prev.set(start, null); const q = [start]; let hit = null;
    for (let i = 0; i < q.length && !hit; i++) { const [cx, cy] = q[i].split(',').map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, nk = K(nx, ny); if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev.has(nk)) continue;
        const own = fenceAt.has(nk) && !fences[fenceAt.get(nk)].pen && land.has(nk); const passable = walk[ny * W + nx] || own; if (!passable) continue; prev.set(nk, q[i]); if (target(nx, ny)) { hit = nk; break; } q.push(nk); } }
    if (!hit) return;
    let cur = hit; const crossing = []; while (cur) { if (fenceAt.has(cur) && !walk[cur.split(',').map(Number).reduce((a, b) => b * W + a)]) crossing.push(cur); cur = prev.get(cur); }
    crossing.forEach((ck) => { const [fx, fy] = ck.split(',').map(Number); const fo = fences[fenceAt.get(ck)]; const horizontal = fo.kind === 'h' || (fo.kind === 'c' && false); const nb = horizontal ? K(fx + 1, fy) : K(fx, fy + 1);
      [ck, nb].forEach((kk) => { if (fenceAt.has(kk) && !fences[fenceAt.get(kk)].pen) { const [px, py] = kk.split(',').map(Number); blocked.delete(kk); walk[py * W + px] = 1; fences[fenceAt.get(kk)].gone = true; } }); });
  });
  for (let i = fences.length - 1; i >= 0; i--) if (fences[i].gone) fences.splice(i, 1);
  // water: jump spots only where the whole arc is open water
  const isW = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !land.has(K(x, y)) && !bridgeSet.has(K(x, y));
  const lilyAt = new Set(MAP.lily.map(([x, y]) => K(x, y))); const boat = MAP.boat ? { x: MAP.boat[0], y: MAP.boat[1] } : null;
  const waterCells = [], fishSpots = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (!isW(x, y)) continue; let d2 = 99; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) if (land.has(K(x + a, y + b))) d2 = Math.min(d2, Math.max(Math.abs(a), Math.abs(b)));
    waterCells.push([x, y, d2]);
    if (d2 >= 2) for (const dir of [1, -1]) if ([0, 1, 2, 3].every((s) => [-1, 0, 1].every((o) => isW(x + dir * s, y + o) && !lilyAt.has(K(x + dir * s, y + o)) && !(boat && Math.abs(x + dir * s - boat.x - 0.5) < 2 && Math.abs(y + o - boat.y) < 2)))) { fishSpots.push({ x, y, dir }); break; }
  }
  // animals: spawn points from the map (cows in the pen stay inside it)
  const penRegion = new Set(); for (let y = pen.y0 + 1; y < pen.y1; y++) for (let x = pen.x0 + 1; x < pen.x1; x++) if (walk[y * W + x]) penRegion.add(K(x, y));
  const animals = MAP.animals.map((a, i) => ({ kind: a.kind === 'cow' ? 'cow' : 'chick', x: a.x, y: a.y, region: a.pen ? penRegion : undefined, island: owner.get(K(a.x, a.y)), id: `${a.kind}${i}` }));
  return { W, H, land, patch, fences, decor: MAP.decor, structures: MAP.structures, pens, terraces, terrace: terraces[0], lily: MAP.lily.map(([x, y]) => ({ x, y, v: Math.floor(cellHash(x, y, 19) * 2) })), boat, bridges: MAP.bridges, bridgeSet, owner, waterCells, fishSpots, animals, home: { ...MAP.home }, plots: worldPlots, walk, blocked };
}

export function nearestWalkable(world, x, y, maxR = 6) {
  const { W, H, walk } = world;
  for (let r = 0; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < W && b < H && walk[b * W + a]) return { x: a, y: b }; }
  return null;
}
export function findPath(world, from, to) {
  const { W, H, walk } = world; const s = from.y * W + from.x, t = to.y * W + to.x; if (!walk[t]) return null;
  const prev = new Int32Array(W * H).fill(-2); prev[s] = -1; const q = [s];
  for (let i = 0; i < q.length; i++) { const c = q[i]; if (c === t) break; const cx = c % W, cy = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n = ny * W + nx; if (prev[n] !== -2 || !walk[n]) continue; prev[n] = c; q.push(n); } }
  if (prev[t] === -2) return null;
  const path = []; for (let c = t; c !== -1; c = prev[c]) path.push({ x: c % W, y: (c / W) | 0 }); return path.reverse().slice(1);
}
