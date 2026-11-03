// Weather for Kutitap's sky and the shop window.
// Rainy days are picked from the date alone (3 per month), so every device shows the same weather
// and nothing has to be saved.
import React from 'react';

export const RAINY_DAYS_PER_MONTH = 3;

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

const rainCache = {};
// One rainy day in each third of the month (so they are spread out), chosen by hashing the date.
export const rainyDays = (monthKey) => {
  if (!rainCache[monthKey]) {
    const [y, m] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const bands = [[1, 10], [11, 20], [21, daysInMonth]];
    rainCache[monthKey] = bands.slice(0, RAINY_DAYS_PER_MONTH).map(([from, to]) => {
      let best = from;
      let bestScore = Infinity;
      for (let d = from; d <= to; d++) {
        const score = hash(`${monthKey}|rain|${d}`);
        if (score < bestScore) { bestScore = score; best = d; }
      }
      return best;
    });
  }
  return rainCache[monthKey];
};

export const isRainyDay = (date = new Date()) => {
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return rainyDays(monthKey).includes(date.getDate());
};

export const weatherLabel = (tod, rain) => (rain ? 'Rainy day' : { morning: 'Morning', day: 'Sunny day', sunset: 'Sunset', night: 'Night' }[tod] || 'Day');

// Pixel rain. Positions are fixed (no randomness) so it never flickers on re-render.
export function RainDrops({ count = 18 }) {
  return (
    <div className="rain-fx" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <i key={i} style={{ left: `${(i * 37 + 11) % 100}%`, animationDelay: `${((i * 13) % 10) / 10}s`, animationDuration: `${0.55 + ((i * 7) % 5) / 10}s` }} />
      ))}
    </div>
  );
}
