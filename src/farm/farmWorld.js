// Builds the archipelago for the current plots: one island per plot (+ the cabin island),
// bridges between them, ponds/inlets, fences, decor, animals and the walk grid.
import { cellHash } from './farmLogic.js';

const ROW_W = 44;   // max width (tiles) of a shelf of islands
const GAP = 6;      // water between islands (tiles)
const MARGIN = 9;   // water around the archipelago (tiles)
const K = (x, y) => `${x},${y}`;
const P = (k) => k.split(',').map(Number);

const clean = (S, keep) => {
  let ch = true;
  while (ch) {
    ch = false;
    for (const k of Array.from(S)) {
      if (keep && keep.has(k)) continue;
      const [x, y] = P(k);
      const n = S.has(K(x, y - 1)), e = S.has(K(x + 1, y)), s = S.has(K(x, y + 1)), w = S.has(K(x - 1, y));
      if ((!n && !s) || (!e && !w) || n + e + s + w <= 1) { S.delete(k); ch = true; }
    }
  }
  return S;
};
// smooth value noise in [0,1] (for ponds and inlets)
const vnoise = (x, y, seed) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = (t) => t * t * (3 - 2 * t);
  const a = cellHash(xi, yi, seed), b = cellHash(xi + 1, yi, seed), c = cellHash(xi, yi + 1, seed), d = cellHash(xi + 1, yi + 1, seed);
  const u = s(xf), v = s(yf);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
};

export function buildWorld(plots) {
  const slots = [{ kind: 'cabin', cw: 11, ch: 9 }];
  plots.forEach((p) => {
    const shW = Math.max(...p.shape.map((r) => r.length)), shH = p.shape.length;
    slots.push({ kind: 'plot', plot: p, shW, shH, cw: shW + 6, ch: shH + 6 });
  });
  // shelf packing with gaps (each slot is its own island)
  let x = 0, y = 0, rowH = 0, maxX = 0, row = 0;
  slots.forEach((s) => {
    if (x > 0 && x + s.cw > ROW_W) { y += rowH + GAP; x = 0; rowH = 0; row++; }
    s.sx = MARGIN + x; s.sy = MARGIN + y; s.row = row; x += s.cw + GAP; rowH = Math.max(rowH, s.ch); maxX = Math.max(maxX, x - GAP);
  });
  const W = MARGIN * 2 + maxX, H = MARGIN * 2 + y + rowH;

  // plots: soil, fences, protected zones
  const patch = new Set(), keep = new Set(), planterCells = new Set(), fences = [], worldPlots = [], prot = new Set();
  const rect = (S, x0, y0, x1, y1, m = 0) => { for (let yy = y0 - m; yy <= y1 + m; yy++) for (let xx = x0 - m; xx <= x1 + m; xx++) S.add(K(xx, yy)); };
  for (const s of slots) {
    if (s.kind !== 'plot') continue;
    const cells = []; const ring = new Set();
    s.plot.shape.forEach((rw, dy) => { for (let dx = 0; dx < rw.length; dx++) if (rw[dx] === 'X') cells.push({ x: s.sx + 3 + dx, y: s.sy + 3 + dy }); });
    cells.forEach((c, i) => { c.i = i; planterCells.add(K(c.x, c.y)); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) ring.add(K(c.x + a, c.y + b)); });
    ring.forEach((k) => { patch.add(k); keep.add(k); });
    const fx0 = s.sx + 1, fy0 = s.sy + 1, fx1 = s.sx + s.shW + 4, fy1 = s.sy + s.shH + 4;
    rect(prot, fx0, fy0, fx1, fy1, 2);
    const gx = Math.floor((fx0 + fx1) / 2);
    for (let yy = fy0; yy <= fy1; yy++) for (let xx = fx0; xx <= fx1; xx++) {
      const edge = xx === fx0 || xx === fx1 || yy === fy0 || yy === fy1; if (!edge) continue;
      const corner = (xx === fx0 || xx === fx1) && (yy === fy0 || yy === fy1);
      if (yy === fy1 && (xx === gx || xx === gx + 1)) continue;
      if (!corner && cellHash(xx, yy, 3) < 0.3 && !(yy === fy1 && Math.abs(xx - gx) <= 2)) continue;
      fences.push({ x: xx, y: yy, kind: corner ? 'c' : (yy === fy0 || yy === fy1 ? 'h' : 'v') });
    }
    worldPlots.push({ id: s.plot.id, cells, gate: { x: gx, y: fy1 }, fence: { x0: fx0, y0: fy0, x1: fx1, y1: fy1 }, center: { x: (fx0 + fx1 + 1) / 2, y: (fy0 + fy1 + 1) / 2 }, slot: s });
  }
  const cab = slots[0]; const house = { x: cab.sx + 3, y: cab.sy + 1 };
  rect(prot, house.x, house.y, house.x + 3, house.y + 5, 1);

  // islands: lumpy ellipse per slot, eaten by smooth noise into ponds/inlets (never inside protected zones)
  const land = new Set(), owner = new Map();
  slots.forEach((s, si) => {
    const f = 1.1 + 0.1 * cellHash(si, 1, 31);
    const cx = s.sx + s.cw / 2, cy = s.sy + s.ch / 2, rx = (s.cw / 2) * f + 0.8, ry = (s.ch / 2) * f + 0.8;
    for (let yy = Math.floor(cy - ry - 2); yy <= cy + ry + 2; yy++) for (let xx = Math.floor(cx - rx - 2); xx <= cx + rx + 2; xx++) {
      const dx = (xx + 0.5 - cx) / rx, dy = (yy + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1 + (cellHash(xx, yy, 7) - 0.5) * 0.28) continue;
      const k = K(xx, yy);
      if (!prot.has(k) && vnoise(xx * 0.3, yy * 0.3, 41 + si) > 0.6) continue;   // pond / inlet
      land.add(k); owner.set(k, si);
    }
  });
  const protKeep = new Set([...prot].filter((k) => land.has(k)));
  patch.forEach((k) => { land.add(k); }); fences.forEach((f) => land.add(K(f.x, f.y)));
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) land.add(K(house.x + a, house.y + b));
  const ownerOf = (xx, yy) => { let bi = 0, bd = 1e9; slots.forEach((sl, i) => { const dx = Math.max(sl.sx - xx, 0, xx - (sl.sx + sl.cw - 1)), dy = Math.max(sl.sy - yy, 0, yy - (sl.sy + sl.ch - 1)); const d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }); return bi; };
  land.forEach((k) => { if (!owner.has(k)) { const [a, b] = P(k); owner.set(k, ownerOf(a, b)); } });
  clean(patch, keep);
  clean(land, new Set([...keep, ...protKeep, ...fences.map((f) => K(f.x, f.y))]));
  // keep only the biggest connected piece of each island (no stray fragments)
  const seenC = new Set(); const comps = [];
  for (const k0 of land) {
    if (seenC.has(k0)) continue; const o = owner.get(k0); const st = [k0], comp = []; seenC.add(k0);
    while (st.length) { const k = st.pop(); comp.push(k); const [cx, cy] = P(k); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = K(cx + dx, cy + dy); if (land.has(nk) && !seenC.has(nk) && owner.get(nk) === o) { seenC.add(nk); st.push(nk); } } }
    comps.push({ o, comp });
  }
  const best = {}; comps.forEach((c) => { if (!best[c.o] || c.comp.length > best[c.o].comp.length) best[c.o] = c; });
  comps.forEach((c) => { if (best[c.o] !== c && !c.comp.some((k) => keep.has(k))) c.comp.forEach((k) => { land.delete(k); owner.delete(k); }); });
  clean(land, new Set([...keep, ...protKeep, ...fences.map((f) => K(f.x, f.y))]));
  for (const k of Array.from(owner.keys())) if (!land.has(k)) owner.delete(k);

  // bridges between neighbouring islands
  const blockedTmp = new Set([...planterCells, ...fences.map((f) => K(f.x, f.y))]);
  for (let a = 0; a < 4; a++) for (let b = 1; b < 4; b++) blockedTmp.add(K(house.x + a, house.y + b));
  const bridges = []; const bridgeSet = new Set();
  const okLand = (xx, yy) => land.has(K(xx, yy)) && !blockedTmp.has(K(xx, yy));
  const tryH = (A, B) => {      // A left of B
    const ia = slots.indexOf(A), ib = slots.indexOf(B);
    const y0 = Math.max(A.sy, B.sy) + 1, y1 = Math.min(A.sy + A.ch, B.sy + B.ch) - 2; if (y1 < y0) return false;
    const mid = Math.round((y0 + y1) / 2);
    for (let d = 0; d <= y1 - y0; d++) for (const yy of d ? [mid + d, mid - d] : [mid]) {
      if (yy < y0 || yy > y1) continue;
      let xa = -1, xb = -1;
      for (let xx = Math.floor(A.sx + A.cw / 2); xx < B.sx + B.cw / 2; xx++) {
        if (land.has(K(xx, yy)) || !land.has(K(xx - 1, yy)) || owner.get(K(xx - 1, yy)) !== ia) continue;
        let e = xx; while (e < W && !land.has(K(e, yy))) e++;
        if (e < W && owner.get(K(e, yy)) === ib && e - xx >= 1 && e - xx <= 8) { xa = xx; xb = e; break; }
      }
      if (xa < 0) continue;
      const run = xb - xa;
      if (!(okLand(xa - 1, yy) && okLand(xa - 2, yy) && okLand(xb, yy) && okLand(xb + 1, yy))) continue;
      bridges.push({ dir: 'h', x0: xa, x1: xb, y: yy }); for (let q = xa; q < xb; q++) bridgeSet.add(K(q, yy)); return true;
    }
    return false;
  };
  const tryV = (A, B) => {      // A above B
    const ia = slots.indexOf(A), ib = slots.indexOf(B);
    const x0 = Math.max(A.sx, B.sx) + 1, x1 = Math.min(A.sx + A.cw, B.sx + B.cw) - 2; if (x1 < x0) return false;
    const mid = Math.round((x0 + x1) / 2);
    for (let d = 0; d <= x1 - x0; d++) for (const xx0 of d ? [mid + d, mid - d] : [mid]) {
      if (xx0 < x0 || xx0 > x1) continue;
      let ya = -1, yb = -1;
      for (let yy = Math.floor(A.sy + A.ch / 2); yy < B.sy + B.ch / 2; yy++) {
        if (land.has(K(xx0, yy)) || !land.has(K(xx0, yy - 1)) || owner.get(K(xx0, yy - 1)) !== ia) continue;
        let e = yy; while (e < H && !land.has(K(xx0, e))) e++;
        if (e < H && owner.get(K(xx0, e)) === ib && e - yy >= 1 && e - yy <= 8) { ya = yy; yb = e; break; }
      }
      if (ya < 0) continue;
      const run = yb - ya;
      if (!(okLand(xx0, ya - 1) && okLand(xx0, ya - 2) && okLand(xx0, yb) && okLand(xx0, yb + 1))) continue;
      bridges.push({ dir: 'v', y0: ya, y1: yb, x: xx0 }); for (let q = ya; q < yb; q++) bridgeSet.add(K(xx0, q)); return true;
    }
    return false;
  };
  slots.forEach((s, i) => {
    if (i === 0) return;
    const prev = slots[i - 1]; let linked = false;
    if (prev.row === s.row) linked = tryH(prev, s);
    if (!linked || cellHash(i, 5, 61) < 0.5) {       // vertical link to an island above
      const above = slots.filter((o) => o.row === s.row - 1 && Math.min(o.sx + o.cw, s.sx + s.cw) - Math.max(o.sx, s.sx) >= 4).sort((a, b) => Math.abs(a.sx - s.sx) - Math.abs(b.sx - s.sx))[0];
      if (above) { if (tryV(above, s)) linked = true; }
    }
    if (!linked && i > 0) { for (let j = i - 1; j >= 0 && !linked; j--) linked = slots[j].row === s.row ? tryH(slots[j], s) : tryV(slots[j], s); }
  });

  // blocked tiles & decor zones
  const blocked = new Set(blockedTmp);
  const forb = new Set(prot); const near = (x, y, m) => { for (let a = -m; a <= m; a++) for (let b = -m; b <= m; b++) forb.add(K(x + a, y + b)); };
  bridgeSet.forEach((k) => { const [bx, by] = P(k); near(bx, by, 2); });
  const isInterior = (xx, yy) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (!land.has(K(xx + a, yy + b))) return false; return true; };
  const nearWater = (xx, yy, r) => { for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (!land.has(K(xx + a, yy + b))) return true; return false; };

  // decor (sparse)
  const decor = []; const trees = [];
  const treeKinds = ['mid', 'heart', 'orange', 'pear', 'mid', 'tall', 'bigheart', 'small', 'oak'];
  const treeCap = Math.max(6, Math.round(land.size / 45));
  const sorted = Array.from(land).map(P).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [cx, cy] of sorted) {
    const k = K(cx, cy); if (forb.has(k) || blocked.has(k) || patch.has(k) || !isInterior(cx, cy)) continue;
    const r = cellHash(cx, cy, 11); const tp = nearWater(cx, cy, 3) ? 0.10 : 0.012; let acc = tp;
    if (r < acc) {
      if (trees.length < treeCap && !trees.some(([a, b]) => Math.abs(a - cx) + Math.abs(b - cy) < 4)) {
        trees.push([cx, cy]); decor.push({ kind: 'tree', v: treeKinds[Math.floor(cellHash(cx, cy, 5) * treeKinds.length)], x: cx, y: cy }); blocked.add(k);
      }
      continue;
    }
    for (const [kind, p, blocks] of [['bush', 0.014, true], ['rock', 0.014, true], ['mush', 0.008, false], ['log', 0.005, true], ['flower', 0.05, false], ['tuft', 0.07, false]]) {
      acc += p; if (r < acc) { decor.push({ kind, v: Math.floor(cellHash(cx, cy, 13) * 8), x: cx, y: cy }); if (blocks) blocked.add(k); break; }
    }
  }
  // water decor + jump spots
  const lily = [], waterCells = [];
  let boat = null; const shore = [];
  for (let yy = 1; yy < H - 1; yy++) for (let xx = 1; xx < W - 1; xx++) {
    const k = K(xx, yy); if (land.has(k) || bridgeSet.has(k)) continue;
    let d2 = 99; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) if (land.has(K(xx + a, yy + b))) d2 = Math.min(d2, Math.max(Math.abs(a), Math.abs(b)));
    if (d2 <= 3) waterCells.push([xx, yy, d2]);
    if (d2 >= 1 && d2 <= 2 && cellHash(xx, yy, 17) < 0.09) lily.push({ x: xx, y: yy, v: Math.floor(cellHash(xx, yy, 19) * 2) });
    if (d2 === 1 && !land.has(K(xx + 1, yy)) && land.has(K(xx - 1, yy)) && !land.has(K(xx + 2, yy)) && !land.has(K(xx, yy + 1)) && !land.has(K(xx, yy - 1)) && !bridgeSet.has(K(xx + 1, yy))) shore.push([xx, yy]);
  }
  shore.sort((a, b) => cellHash(a[0], a[1], 23) - cellHash(b[0], b[1], 23)); if (shore[0]) boat = { x: shore[0][0], y: shore[0][1] };

  // walkability (land + bridges) and animal spawns
  const walk = new Uint8Array(W * H);
  land.forEach((k) => { const [a, b] = P(k); if (a >= 0 && b >= 0 && a < W && b < H && !blocked.has(k)) walk[b * W + a] = 1; });
  bridgeSet.forEach((k) => { const [a, b] = P(k); walk[b * W + a] = 1; });
  const inFence = (xx, yy) => worldPlots.some((p) => xx >= p.fence.x0 && xx <= p.fence.x1 && yy >= p.fence.y0 && yy <= p.fence.y1);
  const free = (xx, yy) => walk[yy * W + xx] && !bridgeSet.has(K(xx, yy)) && isInterior(xx, yy) && !patch.has(K(xx, yy)) && !inFence(xx, yy) && !(xx >= house.x - 1 && xx <= house.x + 4 && yy >= house.y && yy <= house.y + 5);
  const byIsland = {}; sorted.forEach(([a, b]) => { if (free(a, b)) { const o = owner.get(K(a, b)); if (o != null) (byIsland[o] = byIsland[o] || []).push([a, b]); } });
  const animals = []; const want = [['cow', 3], ['chick', 3]];
  const islandsBySpace = Object.keys(byIsland).map(Number).sort((a, b) => byIsland[b].length - byIsland[a].length);
  want.forEach(([kind, n]) => { for (let i = 0; i < n && islandsBySpace.length; i++) {
    const isl = islandsBySpace[(i + (kind === 'cow' ? 0 : 1)) % islandsBySpace.length]; const cells = byIsland[isl];
    const c = cells[Math.floor(cellHash(i, isl, kind === 'cow' ? 71 : 73) * cells.length)]; if (c) animals.push({ kind, x: c[0], y: c[1], island: isl, id: `${kind}${i}` });
  } });
  return { W, H, land, patch, fences, decor, lily, boat, bridges, bridgeSet, owner, waterCells, animals, house, home: { x: house.x + 2, y: house.y + 4 }, plots: worldPlots, walk, blocked };
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
