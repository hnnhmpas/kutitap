// Builds the island for the current plots: land mask, soil patches, fences, decor, walk grid.
import { cellHash } from './farmLogic.js';

const ROW_W = 38;   // max width (tiles) of a shelf of plots
const MARGIN = 9;   // water around the island (tiles)

const clean = (S, keep) => {
  let ch = true;
  while (ch) {
    ch = false;
    for (const k of Array.from(S)) {
      if (keep && keep.has(k)) continue;
      const [x, y] = k.split(',').map(Number);
      const n = S.has(`${x},${y - 1}`), e = S.has(`${x + 1},${y}`), s = S.has(`${x},${y + 1}`), w = S.has(`${x - 1},${y}`);
      if ((!n && !s) || (!e && !w) || n + e + s + w <= 1) { S.delete(k); ch = true; }
    }
  }
  return S;
};
const K = (x, y) => `${x},${y}`;

export function buildWorld(plots) {
  const slots = [{ kind: 'cabin', cw: 11, ch: 9 }];
  plots.forEach((p) => {
    const shW = Math.max(...p.shape.map((r) => r.length)), shH = p.shape.length;
    slots.push({ kind: 'plot', plot: p, shW, shH, cw: shW + 6, ch: shH + 6 });
  });
  // shelf packing
  let x = 0, y = 0, rowH = 0, maxX = 0;
  for (const s of slots) {
    if (x > 0 && x + s.cw > ROW_W) { y += rowH; x = 0; rowH = 0; }
    s.sx = MARGIN + x; s.sy = MARGIN + y; x += s.cw; rowH = Math.max(rowH, s.ch); maxX = Math.max(maxX, x);
  }
  const W = MARGIN * 2 + maxX, H = MARGIN * 2 + y + rowH;

  // land = union of lumpy ellipses around the slots
  const land = new Set();
  slots.forEach((s, si) => {
    const f = 1.1 + 0.28 * cellHash(si, 1, 31);
    const cx = s.sx + s.cw / 2, cy = s.sy + s.ch / 2, rx = (s.cw / 2) * f + 0.8, ry = (s.ch / 2) * f + 0.8;
    for (let yy = Math.floor(cy - ry - 2); yy <= cy + ry + 2; yy++) for (let xx = Math.floor(cx - rx - 2); xx <= cx + rx + 2; xx++) {
      const dx = (xx + 0.5 - cx) / rx, dy = (yy + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 + (cellHash(xx, yy, 7) - 0.5) * 0.3) land.add(K(xx, yy));
    }
  });
  // plots: soil, fences
  const patch = new Set(), keep = new Set(), planterCells = new Set(), fences = [], worldPlots = [];
  for (const s of slots) {
    if (s.kind !== 'plot') continue;
    const cells = []; const ring = new Set();
    s.plot.shape.forEach((row, dy) => { let n = 0; for (let dx = 0; dx < row.length; dx++) if (row[dx] === 'X') cells.push({ x: s.sx + 3 + dx, y: s.sy + 3 + dy }); });
    cells.forEach((c, i) => { c.i = i; planterCells.add(K(c.x, c.y)); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) ring.add(K(c.x + a, c.y + b)); });
    ring.forEach((k) => { patch.add(k); keep.add(k); land.add(k); });
    const fx0 = s.sx + 1, fy0 = s.sy + 1, fx1 = s.sx + s.shW + 4, fy1 = s.sy + s.shH + 4;
    for (let yy = fy0; yy <= fy1; yy++) for (let xx = fx0; xx <= fx1; xx++) land.add(K(xx, yy));
    const gx = Math.floor((fx0 + fx1) / 2);
    const fset = new Set();
    for (let yy = fy0; yy <= fy1; yy++) for (let xx = fx0; xx <= fx1; xx++) {
      const edge = xx === fx0 || xx === fx1 || yy === fy0 || yy === fy1; if (!edge) continue;
      const corner = (xx === fx0 || xx === fx1) && (yy === fy0 || yy === fy1);
      if (yy === fy1 && (xx === gx || xx === gx + 1)) continue;                        // gate
      if (!corner && cellHash(xx, yy, 3) < 0.3 && !(yy === fy1 && Math.abs(xx - gx) <= 2)) continue; // natural gaps
      const kind = corner ? 'c' : (yy === fy0 || yy === fy1 ? 'h' : 'v');
      fences.push({ x: xx, y: yy, kind }); fset.add(K(xx, yy)); land.add(K(xx, yy));
    }
    worldPlots.push({ id: s.plot.id, cells, gate: { x: gx, y: fy1 }, fence: { x0: fx0, y0: fy0, x1: fx1, y1: fy1 }, center: { x: (fx0 + fx1 + 1) / 2, y: (fy0 + fy1 + 1) / 2 }, slot: s });
  }
  clean(patch, keep);
  const cab = slots[0]; const house = { x: cab.sx + 3, y: cab.sy + 1 };
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) land.add(K(house.x + a, house.y + b));
  clean(land, new Set([...keep, ...fences.map((f) => K(f.x, f.y))]));
  // two decorative islets in the water margin
  const islets = [[2.6, H - 3.5], [W - 3.2, 3]];
  const isletCells = [];
  islets.forEach(([cx, cy]) => { for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) { const dx = (xx + .5 - cx) / 2.3, dy = (yy + .5 - cy) / 1.8; if (dx * dx + dy * dy <= 1 + (cellHash(xx, yy, 9) - .5) * .2) { land.add(K(xx, yy)); isletCells.push([xx, yy]); } } });
  clean(land, new Set([...keep, ...fences.map((f) => K(f.x, f.y))]));

  // blocked tiles (not walkable)
  const blocked = new Set([...planterCells, ...fences.map((f) => K(f.x, f.y))]);
  for (let a = 0; a < 4; a++) for (let b = 1; b < 4; b++) blocked.add(K(house.x + a, house.y + b));
  // forbidden zones for decor
  const forb = new Set();
  const forbRect = (x0, y0, x1, y1, m) => { for (let yy = y0 - m; yy <= y1 + m; yy++) for (let xx = x0 - m; xx <= x1 + m; xx++) forb.add(K(xx, yy)); };
  worldPlots.forEach((wp) => forbRect(wp.fence.x0, wp.fence.y0, wp.fence.x1, wp.fence.y1, 2));
  forbRect(house.x, house.y, house.x + 3, house.y + 4, 1);
  const isInterior = (x, y) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (!land.has(K(x + a, y + b))) return false; return true; };
  const nearWater = (x, y, r) => { for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (!land.has(K(x + a, y + b))) return true; return false; };

  // decor: sparse on purpose
  const decor = []; const trees = [];
  const treeKinds = ['mid', 'heart', 'orange', 'pear', 'mid', 'tall', 'bigheart', 'small', 'oak'];
  const area = land.size; const treeCap = Math.max(6, Math.round(area / 55));
  const sorted = Array.from(land).map((k) => k.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [cx, cy] of sorted) {
    const k = K(cx, cy); if (forb.has(k) || blocked.has(k) || patch.has(k) || !isInterior(cx, cy)) continue;
    const r = cellHash(cx, cy, 11); const rim = nearWater(cx, cy, 3);
    const tp = rim ? 0.10 : 0.012;
    let acc = tp;
    if (r < acc) {
      if (trees.length < treeCap && !trees.some(([a, b]) => Math.abs(a - cx) + Math.abs(b - cy) < 4)) {
        const kind = treeKinds[Math.floor(cellHash(cx, cy, 5) * treeKinds.length)];
        trees.push([cx, cy]); decor.push({ kind: 'tree', v: kind, x: cx, y: cy }); blocked.add(k);
      }
      continue;
    }
    const table = [['bush', 0.014, true], ['rock', 0.012, true], ['mush', 0.008, false], ['log', 0.005, true], ['flower', 0.05, false], ['tuft', 0.07, false]];
    for (const [kind, p, blocks] of table) {
      acc += p;
      if (r < acc) { decor.push({ kind, v: Math.floor(cellHash(cx, cy, 13) * 8), x: cx, y: cy }); if (blocks) blocked.add(k); break; }
    }
  }
  // islet trees
  const iso = isletCells.filter(([a, b]) => isInterior(a, b));
  const pick = (cx, cy) => iso.slice().sort((p, q) => Math.hypot(p[0] - cx, p[1] - cy) - Math.hypot(q[0] - cx, q[1] - cy))[0];
  islets.forEach(([cx, cy], i) => { const c = pick(cx, cy); if (c) decor.push({ kind: 'tree', v: i ? 'orange' : 'heart', x: c[0], y: c[1] }); });
  // water decor
  const lily = [], waterShore = [];
  for (let yy = 1; yy < H - 1; yy++) for (let xx = 1; xx < W - 1; xx++) {
    if (land.has(K(xx, yy))) continue;
    let d2 = 99; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) if (land.has(K(xx + a, yy + b))) d2 = Math.min(d2, Math.max(Math.abs(a), Math.abs(b)));
    if (d2 === 2 && cellHash(xx, yy, 17) < 0.07) lily.push({ x: xx, y: yy, v: Math.floor(cellHash(xx, yy, 19) * 2) });
    if (d2 === 1 && !land.has(K(xx + 1, yy)) && land.has(K(xx - 1, yy)) && yy > H * 0.45 && !land.has(K(xx + 2, yy)) && !land.has(K(xx, yy + 1)) && !land.has(K(xx, yy - 1))) waterShore.push([xx, yy]);
  }
  waterShore.sort((a, b) => cellHash(a[0], a[1], 23) - cellHash(b[0], b[1], 23));
  const boat = waterShore[0] ? { x: waterShore[0][0], y: waterShore[0][1] } : null;

  // walkability
  const walk = new Uint8Array(W * H);
  land.forEach((k) => { const [a, b] = k.split(',').map(Number); if (a >= 0 && b >= 0 && a < W && b < H && !blocked.has(k) && !isletCells.some(([p, q]) => p === a && q === b)) walk[b * W + a] = 1; });
  return { W, H, land, patch, fences, decor, lily, boat, house, home: { x: house.x + 2, y: house.y + 4 }, plots: worldPlots, walk, blocked };
}

export function nearestWalkable(world, x, y, maxR = 6) {
  const { W, H, walk } = world;
  for (let r = 0; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < W && b < H && walk[b * W + a]) return { x: a, y: b };
  }
  return null;
}

export function findPath(world, from, to) {
  const { W, H, walk } = world;
  const s = from.y * W + from.x, t = to.y * W + to.x;
  if (!walk[t]) return null;
  const prev = new Int32Array(W * H).fill(-2); prev[s] = -1; const q = [s];
  for (let i = 0; i < q.length; i++) {
    const c = q[i]; if (c === t) break;
    const cx = c % W, cy = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx; if (prev[n] !== -2 || !walk[n]) continue; prev[n] = c; q.push(n);
    }
  }
  if (prev[t] === -2) return null;
  const path = []; for (let c = t; c !== -1; c = prev[c]) path.push({ x: c % W, y: (c / W) | 0 });
  return path.reverse().slice(1);
}
