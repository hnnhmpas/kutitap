// Pure helpers for the monthly attendance quest (progress bar + victory screen). No React in here.
// The attendance table lists weekdays only, so the "month" runs from day 1 to the LAST LISTED SHIFT DATE.

const FILLED_OFF = new Set(['', '-', undefined, null]);
export const isFilled = (rec) => !!rec && (!FILLED_OFF.has(rec.status) || !!rec.timedIn);

export const RANKS = {
  5: 'Flawless Scout!',
  4: 'Veteran Ranger!',
  3: 'Steady Adventurer!',
  2: 'Battle-Worn!',
  1: 'Survived the Month!',
};
export const starsForRate = (rate) => (rate >= 100 ? 5 : rate >= 90 ? 4 : rate >= 75 ? 3 : rate >= 50 ? 2 : 1);

// workingDays = [1,2,5,...] day numbers shown in the table; records = { 'YYYY-MM-DD': {status, timedIn, ...} }
// shiftDate = { y, m, d } of the CURRENT shift date (night shift rolls back a day until the shift ends). Progress follows it,
// so shifts or holidays plotted ahead of time never move Kutitap. Past months use what was filled; future months stay at 0.
export function computeQuest({ year, monthIndex, records, workingDays, shiftDate }) {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const keyOf = (d) => `${year}-${mm}-${String(d).padStart(2, '0')}`;
  const days = workingDays || [];
  const endDay = days.length ? days[days.length - 1] : new Date(year, monthIndex + 1, 0).getDate();
  let latestDay = 0;
  let todayDay = Infinity;                                   // last day number that has "arrived"
  if (shiftDate) {
    const cmp = (year - shiftDate.y) * 12 + (monthIndex - shiftDate.m);
    todayDay = cmp < 0 ? Infinity : cmp > 0 ? 0 : shiftDate.d;
  }
  const c = { present: 0, late: 0, excused: 0, outOfShift: 0, empty: 0 };
  const dayStatus = {};
  days.forEach((d) => {
    const rec = records && records[keyOf(d)];
    const s = rec && rec.status;
    if (isFilled(rec) && d <= todayDay) latestDay = Math.max(latestDay, d);
    if (s === 'Present') { c.present++; dayStatus[d] = 'present'; }
    else if (s === 'Late') { c.late++; dayStatus[d] = 'late'; }
    else if (s === 'Holiday' || s === 'Leave') { c.excused++; dayStatus[d] = 'excused'; }
    else if (s === 'Out of Shift') { c.outOfShift++; dayStatus[d] = 'out'; }
    else if (isFilled(rec)) { c.present++; dayStatus[d] = 'present'; }   // timed in, status not set yet
    else { c.empty++; dayStatus[d] = 'empty'; }
  });
  // calendar weeks (Mon-Fri) that have shifts; a week is done when its last shift date is filled
  const weeks = [];
  let cur = null;
  days.forEach((d) => {
    const mon = d - ((new Date(year, monthIndex, d).getDay() + 6) % 7);
    if (!cur || cur.mon !== mon) { cur = { n: weeks.length + 1, mon, days: [] }; weeks.push(cur); }
    cur.days.push(d);
  });
  weeks.forEach((w) => { w.endDay = w.days[w.days.length - 1]; w.done = w.endDay <= todayDay && isFilled(records && records[keyOf(w.endDay)]); });
  const scheduled = Math.max(0, days.length - c.excused);                 // holidays and leave are not absences
  const credit = c.present + 0.5 * c.late;                                  // a late shift counts as half
  const rate = scheduled === 0 ? 100 : Math.round((credit / scheduled) * 1000) / 10;
  const stars = starsForRate(rate);
  const current = shiftDate && todayDay !== Infinity && todayDay > 0;   // viewing the running month: position = today's shift date
  if (current) latestDay = Math.min(todayDay, endDay);
  return {
    endDay, latestDay, progress: endDay ? Math.min(1, latestDay / endDay) : 0,
    complete: days.length > 0 && endDay <= todayDay && isFilled(records && records[keyOf(endDay)]),
    present: c.present, late: c.late, excused: c.excused, absent: c.empty + c.outOfShift,
    scheduled, rate, stars, rank: RANKS[stars], dayStatus,
    weeks: weeks.map(({ n, days: wd, endDay: ed, done }) => ({ n, days: wd, endDay: ed, done })), weeksDone: weeks.filter((w) => w.done).length,
    level: monthIndex + 1, chapter: String(year % 100).padStart(2, '0'),
  };
}
