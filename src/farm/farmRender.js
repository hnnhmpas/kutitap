// Canvas helpers: sprite loading, auto-tiling, ground baking (islands, terrace, soil, bridges), static sprite list.
import grassUrl from '../assets/farm/grass.png';
import dirtUrl from '../assets/farm/dirt.png';
import waterUrl from '../assets/farm/water.png';
import fencesUrl from '../assets/farm/fences.png';
import biomUrl from '../assets/farm/biom.png';
import cropsUrl from '../assets/farm/crops.png';
import treesUrl from '../assets/farm/trees.png';
import boatUrl from '../assets/farm/boat.png';
import housesUrl from '../assets/farm/houses.png';
import coopUrl from '../assets/farm/coop.png';
import hillsUrl from '../assets/farm/hills.png';
import exteriorUrl from '../assets/farm/exterior.png';
import natureUrl from '../assets/farm/nature.png';
import chestUrl from '../assets/farm/chest.png';
import picnicUrl from '../assets/farm/picnic.png';
import basketUrl from '../assets/farm/basket.png';
import woodUrl from '../assets/farm/woodshroom.png';
import twinkleUrl from '../assets/shop/twinkle.png';
import coinUrl from '../assets/shop/star-coin.png';
import teemoUrl from '../assets/farm/teemo.png';
import toolsUrl from '../assets/farm/tools.png';
import cowUrl from '../assets/farm/cow.png';
import chickenUrl from '../assets/farm/chicken.png';
import fishUrl from '../assets/farm/fish.png';
import bridgeUrl from '../assets/farm/bridge.png';
import cropsWetUrl from '../assets/farm/crops_watered.png';
import { CROP_BY_ID, cellHash } from './farmLogic.js';
export { default as FRAME_URL } from '../assets/farm/ui/frame.png';
export { default as SLOT_URL } from '../assets/farm/ui/slot.png';
export { default as FACE_URL } from '../assets/farm/ui/face.png';
export { default as SPROUT_URL } from '../assets/farm/ui/sprout.png';
export { default as CAN_URL } from '../assets/farm/ui/can.png';

export const CROPS_SHEET_URL = cropsUrl;
const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = src; });
export async function loadImages() {
  const names = { grass: grassUrl, dirt: dirtUrl, water: waterUrl, fences: fencesUrl, biom: biomUrl, crops: cropsUrl, trees: treesUrl, boat: boatUrl, houses: housesUrl, coop: coopUrl, hills: hillsUrl, exterior: exteriorUrl, nature: natureUrl, chest: chestUrl, picnic: picnicUrl, basket: basketUrl, wood: woodUrl,
    twinkle: twinkleUrl, coin: coinUrl, teemo: teemoUrl, tools: toolsUrl, cow: cowUrl, chicken: chickenUrl, fish: fishUrl, bridge: bridgeUrl, cropsWet: cropsWetUrl };
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
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function hayBale() { const c = canvas(14, 11), g = c.getContext('2d'); g.fillStyle = '#96642a'; g.fillRect(1, 0, 12, 11); g.fillRect(0, 1, 14, 9); g.fillStyle = '#e2ba50'; g.fillRect(1, 1, 12, 9); g.fillStyle = '#c4963a'; for (let x = 2; x < 12; x += 3) g.fillRect(x, 2, 1, 7); g.fillStyle = '#f4d678'; g.fillRect(2, 5, 10, 1); g.fillStyle = '#96642a'; g.fillRect(4, 0, 1, 11); g.fillRect(9, 0, 1, 11); return c; }
function hayRoll() { const c = canvas(15, 15), g = c.getContext('2d'); const circ = (r, col) => { g.fillStyle = col; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) g.fillRect(7 + x, 7 + y, 1, 1); }; circ(7, '#96642a'); circ(6, '#e8c45c'); circ(4, '#d4a840'); circ(2, '#b88a34'); circ(1, '#96642a'); return c; }
function makeSprites(i) {
  const T = (b) => trim(i.trees, b), B = (b) => trim(i.biom, b), X = (b) => trim(i.exterior, b), N = (b) => trim(i.nature, b);
  const house = (col, row) => trim(i.houses, [col * 16, row * 16, col * 16 + 64, row * 16 + 64]);
  return {
    tree: { oak: T([96, 0, 144, 52]), mid: T([64, 16, 96, 48]), tall: T([48, 16, 64, 48]), heart: T([0, 64, 32, 112]), orange: T([32, 64, 64, 112]), pear: T([64, 64, 96, 112]), bigheart: T([96, 64, 128, 112]), small: T([16, 16, 48, 48]), pine: N([52, 28, 80, 64]), round: N([12, 24, 52, 66]) },
    bush: [T([144, 16, 160, 32]), T([128, 64, 144, 80]), T([144, 64, 160, 80]), T([160, 64, 176, 80]), N([174, 14, 196, 36])],
    flower: [B([96, 32, 112, 48]), B([112, 32, 128, 48]), B([80, 48, 96, 64]), B([96, 48, 112, 64]), B([112, 48, 128, 64])],
    mush: [B([80, 0, 96, 16]), B([96, 0, 112, 16]), B([112, 0, 128, 16]), B([128, 0, 144, 16])],
    rock: [B([112, 16, 128, 32]), B([128, 16, 144, 32]), N([224, 16, 258, 48]), B([96, 64, 112, 80])],
    stump: [N([18, 104, 50, 132]), N([54, 110, 74, 128])],
    tuft: [B([80, 16, 96, 32]), B([96, 16, 112, 32])],
    lily: [B([112, 64, 128, 80]), B([128, 64, 144, 80])],
    log: [N([98, 110, 126, 126]), N([125, 112, 150, 126])],
    houses: { pink: house(4, 4), purple: house(0, 8), blue: house(4, 8) },
    coop: trim(i.coop, [0, 0, 48, 48]),
    props: { crates: X([300, 26, 340, 52]), barrels: X([300, 58, 350, 92]), bench: X([80, 88, 112, 110]), well: X([160, 14, 192, 50]), sign: X([352, 22, 390, 48]), chest: trim(i.chest, [0, 0, 48, 48]), boulder: N([224, 16, 258, 48]), stump_l: N([18, 104, 50, 132]), logs2: N([98, 110, 126, 126]),
      logpile: trim(i.wood, [0, 0, 32, 32]), haybale: hayBale(), hayroll: hayRoll(), blanket: trim(i.picnic, [0, 0, i.picnic.width, i.picnic.height]), basket: trim(i.basket, [0, 0, i.basket.width, i.basket.height]) },
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
  // delicate ripple shoreline: dithered foam rings around every bit of land
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (land.has(`${x},${y}`) || world.bridgeSet.has(`${x},${y}`)) continue;
    let d = 9; for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (land.has(`${x + a},${y + b}`)) d = Math.min(d, Math.max(Math.abs(a), Math.abs(b)));
    if (d === 1) { g.fillStyle = 'rgba(226,250,243,.66)'; for (let yy = 0; yy < 16; yy++) for (let xx = (yy % 2); xx < 16; xx += 2) g.fillRect(x * 16 + xx, y * 16 + yy, 1, 1); }
    else if (d === 2) { g.fillStyle = 'rgba(226,250,243,.58)'; for (let yy = 0; yy < 16; yy += 4) for (let xx = (yy / 4 % 2) * 2; xx < 16; xx += 4) g.fillRect(x * 16 + xx, y * 16 + yy, 1, 1); }
  }
  const plain = (x, y) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (!land.has(`${x + a},${y + b}`)) return false; return true; };
  land.forEach((k) => {
    const [x, y] = k.split(',').map(Number);
    if (plain(x, y) && cellHash(x, y, 2) < 0.55) { const [tx, ty] = PLAIN[Math.floor(cellHash(x, y, 4) * PLAIN.length)]; g.drawImage(im.grass, tx * 16, ty * 16, 16, 16, x * 16, y * 16, 16, 16); }
    else g.drawImage(autoTile('g', im.grass, land, x, y, 8), x * 16, y * 16);
  });
  // raised terraces: grass top, brown cliff wall, stairs
  (world.terraces || []).forEach((t) => {
    for (let y = t.y0; y <= t.y1; y++) for (let x = t.x0; x <= t.x1; x++) { const tx = x === t.x0 ? 0 : x === t.x1 ? 2 : 1, ty = y === t.y0 ? 0 : y === t.y1 ? 2 : 1; g.drawImage(im.hills, tx * 16, ty * 16, 16, 16, x * 16, y * 16, 16, 16); }
    for (let x = t.x0; x <= t.x1; x++) { const tx = x === t.x0 ? 0 : x === t.x1 ? 2 : 1; g.drawImage(im.hills, tx * 16, 48, 16, 16, x * 16, (t.y1 + 1) * 16, 16, 16); }
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) g.drawImage(im.hills, (9 + a) * 16, (5 + b) * 16, 16, 16, (t.stairs.x + a) * 16, (t.stairs.y + b) * 16, 16, 16);
  });
  patch.forEach((k) => { const [x, y] = k.split(',').map(Number); g.drawImage(autoTile('d', im.dirt, patch, x, y, 10), x * 16, y * 16); });
  (world.bridges || []).forEach((b) => {
    if (b.dir === 'h') { const n = (b.x1 - b.x0) * 16 + 10; for (let xx = 0; xx < n; xx++) { const sx = xx < 14 ? xx : xx >= n - 14 ? 29 + (xx - (n - 14)) : 14 + ((xx - 14) % 15); g.drawImage(im.bridge, 34 + sx, 0, 1, 16, b.x0 * 16 - 5 + xx, b.y * 16, 1, 16); } }
    else { const n = (b.y1 - b.y0) * 16 + 10; for (let yy = 0; yy < n; yy++) { const sy = yy < 14 ? yy : yy >= n - 14 ? 29 + (yy - (n - 14)) : 14 + ((yy - 14) % 15); g.drawImage(im.bridge, 0, 2 + sy, 16, 1, b.x * 16, b.y0 * 16 - 5 + yy, 16, 1); } }
  });
  return c;
}

// ---------- static sprites (sorted by y) ----------
const TALL_ROWS = new Set([1, 16, 23, 25, 29]);
export function drawCrop(g, im, cropId, stage, tx, ty, wet) {
  const c = CROP_BY_ID[cropId]; if (!c) return;
  const tall = TALL_ROWS.has(c.row); const col = stage; const sh = wet && im.cropsWet ? im.cropsWet : im.crops;   // 0 = seed packet
  if (tall) g.drawImage(sh, col * 16, (c.row - 1) * 16, 16, 32, tx * 16, ty * 16 - 16, 16, 32);
  else g.drawImage(sh, col * 16, c.row * 16, 16, 16, tx * 16, ty * 16, 16, 16);
}
export function buildSprites(world, plotsById, im, wet) {
  const L = [], sp = im.sp;
  const put = (spr, tx, ty, dy = 0, shakeKey) => { const key = shakeKey || `${tx},${ty}`; L.push({ y: ty * 16 + 16 + dy, draw: (g, env) => { const sh = env && env.shake[key] > env.T ? Math.sin(env.T * 46) * Math.min(1.4, (env.shake[key] - env.T) * 3) : 0; g.drawImage(spr, Math.round(tx * 16 + 8 - spr.width / 2 + sh), ty * 16 + 16 - spr.height + dy); } }); };
  world.decor.forEach((d) => {
    if (d.kind === 'tree') put(sp.tree[d.v] || sp.tree.mid, d.x, d.y, 4);
    else { const arr = sp[d.kind]; if (arr) put(arr[d.v % arr.length], d.x, d.y, d.kind === 'tuft' ? 3 : 2); }
  });
  world.structures.forEach((s) => {
    let spr, left;
    if (s.n.startsWith('house_')) { spr = sp.houses[s.n.slice(6)]; if (spr) left = s.px + 32 - Math.round(spr.width / 2); }
    else if (s.n === 'coop') { spr = sp.coop; left = s.px + 24 - Math.round(sp.coop.width / 2); }
    else { spr = sp.props[s.n]; left = s.px; }
    if (!spr) return;
    const top = s.py - spr.height; const yk = s.n === 'blanket' ? s.py - 30 : s.n === 'basket' ? s.py + 1 : s.py;
    L.push({ y: yk, draw: (g) => g.drawImage(spr, left, top) });
  });
  const all = [...world.fences];
  const fs = new Set(all.map((f) => `${f.x},${f.y}`)); const has = (x, y) => fs.has(`${x},${y}`);
  const rects = [...world.plots.map((p) => p.fence), ...(world.pens || []).map((p) => ({ x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1 }))];
  all.forEach((f) => {
    let tx, ty;
    if (f.kind === 'h') { const l = has(f.x - 1, f.y), r = has(f.x + 1, f.y); [tx, ty] = l && r ? [2, 3] : r ? [1, 3] : l ? [3, 3] : [0, 3]; }
    else if (f.kind === 'v') { const u = has(f.x, f.y - 1), d = has(f.x, f.y + 1); [tx, ty] = u && d ? [0, 1] : d ? [0, 0] : u ? [0, 2] : [0, 3]; }
    else { const R = rects.find((p) => f.x >= p.x0 && f.x <= p.x1 && f.y >= p.y0 && f.y <= p.y1) || rects[0]; [tx, ty] = f.y === R.y0 ? (f.x === R.x0 ? [1, 0] : [3, 0]) : (f.x === R.x0 ? [1, 2] : [3, 2]); }
    L.push({ y: f.y * 16 + 16, draw: (g) => g.drawImage(im.fences, tx * 16, ty * 16, 16, 16, f.x * 16, f.y * 16, 16, 16) });
  });
  world.plots.forEach((wp) => {
    const plot = plotsById[wp.id]; if (!plot) return;
    wp.cells.forEach((c) => { const pl = plot.planters[c.i];
      if (pl && !pl.crop) L.push({ y: c.y * 16 + 8, draw: (g) => { g.fillStyle = 'rgba(255,243,212,.85)'; g.fillRect(c.x * 16 + 7, c.y * 16 + 5, 2, 6); g.fillRect(c.x * 16 + 5, c.y * 16 + 7, 6, 2); } });
      if (pl && pl.crop) L.push({ y: c.y * 16 + 16, draw: (g) => drawCrop(g, im, pl.crop, plot.stage, c.x, c.y, wet && wet(plot.id, pl.key)) }); });
  });
  L.sort((a, b) => a.y - b.y);
  return L;
}
