// Pure logic for Kutitap's Savings Farm (no React, no canvas).
export const MAX_PLOTS = 15;
export const MAX_PLANTERS = 12;

// row = row in assets/farm/crops.png (stage columns 1..5, column 0 = seed packet)
export const CROPS = [
  { id: 'carrot', name: 'Carrot', row: 2, price: 8 },
  { id: 'cauliflower', name: 'Cauliflower', row: 3, price: 10 },
  { id: 'radish', name: 'Radish', row: 4, price: 9 },
  { id: 'eggplant', name: 'Eggplant', row: 5, price: 12 },
  { id: 'bluebell', name: 'Bluebell', row: 6, price: 11 },
  { id: 'cabbage', name: 'Cabbage', row: 7, price: 8 },
  { id: 'corn', name: 'Corn', row: 8, price: 14 },
  { id: 'pumpkin', name: 'Pumpkin', row: 9, price: 18 },
  { id: 'turnip', name: 'Turnip', row: 10, price: 9 },
  { id: 'beet', name: 'Beet', row: 11, price: 12 },
  { id: 'violet', name: 'Violet Root', row: 12, price: 13 },
  { id: 'starfruit', name: 'Starfruit', row: 13, price: 16 },
];
export const CROP_BY_ID = Object.fromEntries(CROPS.map((c) => [c.id, c]));

export const FARM_DEFAULT = { v: 1, crops: {}, harvested: {}, basket: {} };

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {            // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const cellHash = (x, y, seed = 0) => {
  let h = hashStr(`${seed}:${x}:${y}`);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

// planter layouts by count (X = planter). Irregular on purpose.
export const SHAPES = {
  1: ['X'],
  2: ['XX'],
  3: ['XX', 'X.'],
  4: ['XX', 'XX'],
  5: ['XXX', '.XX'],
  6: ['.XXX', 'XXX.'],
  7: ['XXXX', 'XXX.'],
  8: ['XXX', 'XXX', '.XX'],
  9: ['XXX', 'XXX', 'XXX'],
  10: ['XXXXX', 'XXXXX'],
  11: ['XXXX', 'XXXX', 'XXX.'],
  12: ['XXXX.', '.XXXX', 'XXXX.'],
};

// 0 paid = seeds only (stage 0), otherwise 1..5 stretched over the goal duration
export function stageFor(paid, total) {
  if (!total || paid <= 0) return 0;
  return Math.max(1, Math.min(5, Math.ceil((5 * paid) / total)));
}

export function defaultCrop(goalId, key) {
  return CROPS[hashStr(`${goalId}|${key}`) % CROPS.length].id;
}

export function monthLabel(key) {
  const [m, y] = String(key || '').split('-');
  return y ? `${m} ${y}` : String(key || '');
}

// A goal -> a plot. >12 months: planters each cover a group of months.
export function buildPlot(goal, farm) {
  const list = goal.monthsList || [];
  const total = list.length;
  const group = Math.max(1, Math.ceil(total / MAX_PLANTERS));
  const count = Math.max(1, Math.ceil(total / group));
  const chosen = (farm && farm.crops && farm.crops[goal.id]) || {};
  const planters = [];
  for (let i = 0; i < count; i++) {
    const ms = list.slice(i * group, i * group + group);
    const key = ms[0] ? ms[0].monthKey : `m${i}`;
    const paidAny = ms.some((m) => m.paid);
    const saved = chosen[key];
    const crop = CROP_BY_ID[saved] ? saved : (paidAny ? defaultCrop(goal.id, key) : null); // legacy paid months get an auto crop
    planters.push({ i, key, months: ms.map((m) => m.monthKey), locked: paidAny, crop, chosen: !!CROP_BY_ID[saved], label: group > 1 ? `${monthLabel(ms[0]?.monthKey)} - ${monthLabel(ms[ms.length - 1]?.monthKey)}` : monthLabel(key) });
  }
  const paid = list.filter((m) => m.paid).length;
  return { id: goal.id, name: goal.name || 'Goal', total, paid, stage: stageFor(paid, total), ready: total > 0 && paid === total, planters, shape: SHAPES[Math.min(count, 12)] };
}

export function plotsFromGoals(goals, farm) {
  return (goals || []).filter((g) => g && g.monthsList && g.monthsList.length && !(farm && farm.harvested && farm.harvested[g.id])).slice(0, MAX_PLOTS).map((g) => buildPlot(g, farm));
}
