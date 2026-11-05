// Canvas helpers: sprite loading, auto-tiling, ground baking, static sprite list.
import grassUrl from '../assets/farm/grass.png';
import dirtUrl from '../assets/farm/dirt.png';
import waterUrl from '../assets/farm/water.png';
import fencesUrl from '../assets/farm/fences.png';
import biomUrl from '../assets/farm/biom.png';
import cropsUrl from '../assets/farm/crops.png';
import treesUrl from '../assets/farm/trees.png';
import boatUrl from '../assets/farm/boat.png';
import cabinUrl from '../assets/farm/cabin.png';
import catDownUrl from '../assets/pixel/cat-walk-down.png';
import catLeftUrl from '../assets/pixel/cat-walk-left.png';
import catRightUrl from '../assets/pixel/cat-walk-right.png';
import catIdleUrl from '../assets/pixel/cat-happy.png';
import twinkleUrl from '../assets/shop/twinkle.png';
import { CROP_BY_ID, cellHash } from './farmLogic.js';

export const CROPS_SHEET_URL = cropsUrl;
const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = src; });
export async function loadImages() {
  const names = { grass: grassUrl, dirt: dirtUrl, water: waterUrl, fences: fencesUrl, biom: biomUrl, crops: cropsUrl, trees: treesUrl, boat: boatUrl, cabin: cabinUrl, catDown: catDownUrl, catLeft: catLeftUrl, catRight: catRightUrl, catIdle: catIdleUrl, twinkle: twinkleUrl };
  const out = {}; await Promise.all(Object.entries(names).map(async ([k, u]) => { out[k] = await load(u); }));
  out.sp = makeSprites(out);
  return out;
}

function trim(img, [x0, y0, x1, y1]) {
  const c = document.createElement('canvas'); c.width = x1 - x0; c.height = y1 - y0;
  const g = c.getContext('2d'); g.drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
  const d = g.getImageData(0, 0, c.width, c.height).data; let a = c.width, b = c.height, e = 0, f = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 0) { a = Math.min(a, x); b = Math.min(b, y); e = Math.max(e, x + 1); f = Math.max(f, y + 1); }
  if (e <= a) return c;
  const o = document.createElement('canvas'); o.width = e - a; o.height = f - b; o.getContext('2d').drawImage(c, a, b, e - a, f - b, 0, 0, e - a, f - b); return o;
}
function makeSprites(i) {
  const T = (b) => trim(i.trees, b), B = (b) => trim(i.biom, b);
  return {
    tree: { oak: T([96, 0, 144, 52]), mid: T([64, 16, 96, 48]), tall: T([48, 16, 64, 48]), heart: T([0, 64, 32, 112]), orange: T([32, 64, 64, 112]), pear: T([64, 64, 96, 112]), bigheart: T([96, 64, 128, 112]), small: T([16, 16, 48, 48]) },
    bush: [T([144, 16, 160, 32]), T([128, 64, 144, 80]), T([144, 64, 160, 80]), T([160, 64, 176, 80])],
    flower: [B([96, 32, 112, 48]), B([112, 32, 128, 48]), B([80, 48, 96, 64]), B([96, 48, 112, 64]), B([112, 48, 128, 64])],
    mush: [B([80, 0, 96, 16]), B([96, 0, 112, 16]), B([112, 0, 128, 16]), B([128, 0, 144, 16])],
    rock: [B([112, 16, 128, 32]), B([128, 16, 144, 32]), B([80, 64, 96, 80]), B([96, 64, 112, 80])],
    tuft: [B([80, 16, 96, 32]), B([96, 16, 112, 32])],
    lily: [B([112, 64, 128, 80]), B([128, 64, 144, 80])],
    log: [B([80, 32, 112, 48])],
    cabin: trim(i.cabin, [0, 0, 64, 64]),
  };
}

// ---------- auto-tiling ----------
const NOTCH = { NE: [5, 2], NW: [6, 2], SW: [6, 1], SE: [5, 1] };
const tileCache = new Map();
function autoTile(name, sheet, S, x, y, q) {
  const h = (a, b) => S.has(`${a},${b}`);
  const n = h(x, y - 1), e = h(x + 1, y), s = h(x, y + 1), w = h(x - 1, y);
  const tx = !w ? 0 : (!e ? 2 : 1), ty = !n ? 0 : (!s ? 2 : 1);
  const notches = [];
  if (!h(x + 1, y - 1) && n && e) notches.push('NE'); if (!h(x - 1, y - 1) && n && w) notches.push('NW');
  if (!h(x - 1, y + 1) && s && w) notches.push('SW'); if (!h(x + 1, y + 1) && s && e) notches.push('SE');
  const key = `${name}${tx}${ty}${notches.join('')}`;
  let c = tileCache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
    g.drawImage(sheet, tx * 16, ty * 16, 16, 16, 0, 0, 16, 16);
    notches.forEach((nm) => { const [nx, ny] = NOTCH[nm]; const qx = nm === 'NW' || nm === 'SW' ? 0 : 16 - q, qy = nm === 'NW' || nm === 'NE' ? 0 : 16 - q; g.clearRect(qx, qy, q, q); g.drawImage(sheet, nx * 16 + qx, ny * 16 + qy, q, q, qx, qy, q, q); });
    tileCache.set(key, c);
  }
  return c;
}
const PLAIN = [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6]];
export function bakeGround(world, im) {
  tileCache.clear();
  const { W, H, land, patch } = world;
  const c = document.createElement('canvas'); c.width = W * 16; c.height = H * 16; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g.drawImage(im.water, Math.floor(cellHash(x, y, 1) * 4) * 16, 0, 16, 16, x * 16, y * 16, 16, 16);
  const plain = (x, y) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (!land.has(`${x + a},${y + b}`)) return false; return true; };
  land.forEach((k) => {
    const [x, y] = k.split(',').map(Number);
    if (plain(x, y) && cellHash(x, y, 2) < 0.55) { const [tx, ty] = PLAIN[Math.floor(cellHash(x, y, 4) * PLAIN.length)]; g.drawImage(im.grass, tx * 16, ty * 16, 16, 16, x * 16, y * 16, 16, 16); }
    else g.drawImage(autoTile('g', im.grass, land, x, y, 8), x * 16, y * 16);
  });
  patch.forEach((k) => { const [x, y] = k.split(',').map(Number); g.drawImage(autoTile('d', im.dirt, patch, x, y, 10), x * 16, y * 16); });
  return c;
}

// ---------- static sprites (sorted by y) ----------
const TALL_ROWS = new Set([1, 16, 23, 25, 29]);
export function drawCrop(g, im, cropId, stage, tx, ty) {
  const c = CROP_BY_ID[cropId]; if (!c) return;
  const tall = TALL_ROWS.has(c.row); const col = stage; // 0 = seed packet
  if (tall) g.drawImage(im.crops, col * 16, (c.row - 1) * 16, 16, 32, tx * 16, ty * 16 - 16, 16, 32);
  else g.drawImage(im.crops, col * 16, c.row * 16, 16, 16, tx * 16, ty * 16, 16, 16);
}
export function buildSprites(world, plotsById, im) {
  const L = [], sp = im.sp;
  const put = (spr, tx, ty, dy = 0) => L.push({ y: ty * 16 + 16 + dy, draw: (g) => g.drawImage(spr, Math.round(tx * 16 + 8 - spr.width / 2), ty * 16 + 16 - spr.height + dy) });
  world.decor.forEach((d) => {
    if (d.kind === 'tree') put(sp.tree[d.v] || sp.tree.mid, d.x, d.y, 4);
    else { const arr = sp[d.kind]; if (arr) put(arr[d.v % arr.length], d.x, d.y, d.kind === 'tuft' ? 3 : 2); }
  });
  L.push({ y: (world.house.y + 4) * 16, draw: (g) => g.drawImage(sp.cabin, world.house.x * 16, world.house.y * 16 - 4) });
  const fs = new Set(world.fences.map((f) => `${f.x},${f.y}`)); const has = (x, y) => fs.has(`${x},${y}`);
  world.fences.forEach((f) => {
    let tx, ty;
    if (f.kind === 'h') { const l = has(f.x - 1, f.y), r = has(f.x + 1, f.y); [tx, ty] = l && r ? [2, 3] : r ? [1, 3] : l ? [3, 3] : [0, 3]; }
    else if (f.kind === 'v') { const u = has(f.x, f.y - 1), d = has(f.x, f.y + 1); [tx, ty] = u && d ? [0, 1] : d ? [0, 0] : u ? [0, 2] : [0, 3]; }
    else { const wp = world.plots.find((p) => f.x >= p.fence.x0 && f.x <= p.fence.x1 && f.y >= p.fence.y0 && f.y <= p.fence.y1); const R = wp.fence; [tx, ty] = f.y === R.y0 ? (f.x === R.x0 ? [1, 0] : [3, 0]) : (f.x === R.x0 ? [1, 2] : [3, 2]); }
    L.push({ y: f.y * 16 + 16, draw: (g) => g.drawImage(im.fences, tx * 16, ty * 16, 16, 16, f.x * 16, f.y * 16, 16, 16) });
  });
  world.plots.forEach((wp) => {
    const plot = plotsById[wp.id]; if (!plot) return;
    wp.cells.forEach((c) => { const pl = plot.planters[c.i]; if (pl && !pl.crop) L.push({ y: c.y * 16 + 8, draw: (g) => { g.fillStyle = 'rgba(255,243,212,.85)'; g.fillRect(c.x * 16 + 7, c.y * 16 + 5, 2, 6); g.fillRect(c.x * 16 + 5, c.y * 16 + 7, 6, 2); } });
      if (pl && pl.crop) L.push({ y: c.y * 16 + 16, draw: (g) => drawCrop(g, im, pl.crop, plot.stage, c.x, c.y) }); });
  });
  L.sort((a, b) => a.y - b.y);
  return L;
}
