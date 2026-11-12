// Builds the small, pre-calculated summary that is sent with a chat question (never the raw data).
// Only the year(s) relevant to the question are included. Sticky notes, farm and shop data are never part of it.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LOAN_LABELS = { Atome: 'Home Credit', AtomeNew: 'Atome' }; // the app shows these two under different names
const HOURLY_USD = 7.5;

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const round2 = (n) => Math.round(n * 100) / 100;

export const manilaToday = (now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD

export function sanitizeRate(r) {
  const n = Number(r);
  return Number.isFinite(n) && n >= 30 && n <= 100 ? n : 56.5;
}

export function pickYears(question, todayISO) {
  const cy = parseInt(todayISO.slice(0, 4), 10);
  const cm = parseInt(todayISO.slice(5, 7), 10);
  const years = new Set([cy]);
  if (cm === 1) years.add(cy - 1);
  if (cm === 12) years.add(cy + 1);
  (question.match(/\b20\d\d\b/g) || []).slice(0, 3).forEach((y) => { const n = parseInt(y, 10); if (n >= 2020 && n <= 2100) years.add(n); });
  if (/\blast year\b/i.test(question)) years.add(cy - 1);
  if (/\bnext year\b/i.test(question)) years.add(cy + 1);
  return [...years].sort();
}

function monthDigest(data, mi, y, rate) {
  const m = MONTHS[mi];
  const key = `${m}-${y}`;
  const d = {};

  const inc = (data.kutitap_incomes || {})[key];
  if (inc && (num(inc.expected) || num(inc.actual))) d.income = { expected: num(inc.expected), actual: num(inc.actual) };

  const utils = Object.entries((data.kutitap_utilities || {})[key] || {}).filter(([, v]) => v && num(v.amount)).map(([name, v]) => ({ name, amount: num(v.amount), paid: !!v.paid }));
  if (utils.length) d.utilities = utils;

  const exps = ((data.kutitap_expenses || {})[key] || []).filter((e) => e && (num(e.amount) || (e.category || '').trim())).map((e) => ({ name: String(e.category || '').trim().slice(0, 60), amount: num(e.amount), paid: !!e.paid }));
  if (exps.length) d.expenses = exps;

  const sav = [];
  (Array.isArray(data.kutitap_savings) ? data.kutitap_savings : []).forEach((g) => {
    const row = (g.monthsList || []).find((x) => x.monthKey === key);
    if (row) sav.push({ goal: String(g.name || '').slice(0, 60), amount: num(row.amount), paid: !!row.paid });
  });
  if (sav.length) d.savings = sav;

  const loans = { '15th': [], '30th': [] };
  Object.entries(data.kutitap_loans || {}).forEach(([cat, cd]) => {
    if (!cd || typeof cd !== 'object') return;
    ['15th', '30th'].forEach((cut) => {
      const rowKey = `${y}-${m}-${cut}`;
      let total = 0, paid = 0;
      Object.entries((cd.cells || {})[rowKey] || {}).forEach(([col, v]) => {
        if (cd.columns && !cd.columns.includes(col)) return; // amounts of deleted columns are not shown in the app
        const n = num(v);
        if (!n) return;
        total += n;
        if (cd.paidCells && cd.paidCells[rowKey] && cd.paidCells[rowKey][col]) paid += n;
      });
      if (total > 0) loans[cut].push({ loan: LOAN_LABELS[cat] || cat, total, paid, unpaid: round2(total - paid) });
    });
  });
  if (loans['15th'].length || loans['30th'].length) d.loans = loans;

  // attendance: weekdays only, Present or Late counts as an 8 hour shift
  let present = 0, late = 0, other = 0;
  const last = new Date(Date.UTC(y, mi + 1, 0)).getUTCDate();
  for (let day = 1; day <= last; day++) {
    const dow = new Date(Date.UTC(y, mi, day)).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const rec = (data.kutitap_attendance || {})[`${y}-${String(mi + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`];
    if (!rec) continue;
    if (rec.status === 'Present') present++; else if (rec.status === 'Late') late++; else if (rec.status && rec.status !== '-') other++;
  }
  if (present + late + other) {
    const hours = (present + late) * 8;
    d.attendance = { presentDays: present, lateDays: late, otherDays: other, workedHours: hours, earnedUSD: round2(hours * HOURLY_USD), earnedPHPAtTodaysRate: Math.round(hours * HOURLY_USD * rate) };
  }

  if (!Object.keys(d).length) return null;

  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const unpaidLoans = round2(sum(loans['15th'], (x) => x.unpaid) + sum(loans['30th'], (x) => x.unpaid));
  const totalDue = round2(sum(utils, (x) => x.amount) + unpaidLoans + sum(sav, (x) => x.amount) + sum(exps, (x) => x.amount));
  d.totals = {
    utilities: round2(sum(utils, (x) => x.amount)), loansStillUnpaid: unpaidLoans, savingsDeposits: round2(sum(sav, (x) => x.amount)),
    expenses: round2(sum(exps, (x) => x.amount)), totalDue,
    remainingAfterDue: d.income && d.income.actual ? round2(d.income.actual - totalDue) : null,
  };
  return [key, d];
}

export function buildDigest(data, { todayISO, years, rate }) {
  const src = data && typeof data === 'object' ? data : {};
  const months = {};
  years.forEach((y) => { for (let mi = 0; mi < 12; mi++) { const r = monthDigest(src, mi, y, rate); if (r) months[r[0]] = r[1]; } });

  const goals = (Array.isArray(src.kutitap_savings) ? src.kutitap_savings : []).map((g) => {
    const list = g.monthsList || [];
    const saved = list.reduce((s, m) => s + (m.paid ? num(m.amount) : 0), 0);
    return { name: String(g.name || '').slice(0, 60), goalAmount: num(g.goalAmount), saved: round2(saved), left: round2(Math.max(0, num(g.goalAmount) - saved)), from: `${g.startMonth} ${g.startYear}`, to: `${g.endMonth} ${g.endYear}` };
  });

  const star = src.kutitap_star || {};
  return {
    today: todayISO,
    usdToPhpRateUsed: rate,
    months, // only months that have data; amounts are pesos unless named USD
    savingsGoals: goals,
    starCoins: num(star.coins),
    attendanceShift: src.kutitap_attendance_dst === false ? '11 PM - 8 AM (DST off)' : '10 PM - 7 AM (DST on)',
  };
}
