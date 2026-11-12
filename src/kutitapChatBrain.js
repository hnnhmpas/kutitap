// Kutitap chat brain: answers questions about the tracker's own data in Kutitap's playful voice.
// Pure functions (no React, nothing is saved). `ctx` is a read-only snapshot built in App.jsx.
//
// askKutitap(question, ctx) is the single entry point and may return a string or a Promise<string>.
// To plug in a real AI model later, call it inside askKutitap() and fall back to answerLocal() when it fails.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_WORDS = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sept: 8, sep: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
};
const UTILITY_ORDER = ['PAG-IBIG House', 'PLDT WiFi', 'Meralco', 'Maynilad'];
const HOURLY_USD = 7.5;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const num = (v) => parseFloat(v) || 0;
export const peso = (n) => `₱${(Math.round(num(n) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const mk = (mi, yr) => `${MONTHS[mi]}-${yr}`;
const pad = (n) => String(n).padStart(2, '0');

// ------------------------------------------------------------------ month / year parsing
function parseWhen(q, now) {
  let mi = now.getMonth();
  let yr = now.getFullYear();
  let named = false;
  const rel = q.match(/\b(next|last|previous|this)\s+(month|year)\b/);
  const yearMatch = q.match(/\b(20\d\d)\b/);
  const wordRe = /\b(?:(next|last|previous|this)\s+)?(january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\b|\b(?:(next|last|previous|this|in|for|on|of|by)\s+)(may)\b/;
  const w = q.match(wordRe);
  if (w) {
    const word = w[2] || w[4];
    const mod = w[1] || w[3];
    mi = MONTH_WORDS[word];
    named = true;
    if (mod === 'next' && mi <= now.getMonth()) yr += 1;
    if ((mod === 'last' || mod === 'previous') && mi >= now.getMonth()) yr -= 1;
  } else if (rel && rel[2] === 'month') {
    const d = rel[1] === 'next' ? 1 : rel[1] === 'last' || rel[1] === 'previous' ? -1 : 0;
    const t = now.getFullYear() * 12 + now.getMonth() + d;
    yr = Math.floor(t / 12); mi = t % 12; named = d !== 0;
  }
  if (yearMatch) yr = parseInt(yearMatch[1], 10);
  let year = yr;
  if (rel && rel[2] === 'year') year = now.getFullYear() + (rel[1] === 'next' ? 1 : rel[1] === 'last' || rel[1] === 'previous' ? -1 : 0);
  if (yearMatch) year = parseInt(yearMatch[1], 10);
  const isNow = mi === now.getMonth() && yr === now.getFullYear();
  return { mi, yr, year, named, isNow, key: mk(mi, yr), label: `${MONTHS[mi]} ${yr}`, short: isNow ? 'this month' : MONTHS[mi] };
}

// ------------------------------------------------------------------ data readers
function savingsFor(ctx, key) {
  return (ctx.savingsGoals || []).map((g) => {
    const m = (g.monthsList || []).find((x) => x.monthKey === key);
    return m ? { name: g.name, amount: num(m.amount), paid: !!m.paid } : null;
  }).filter(Boolean);
}

function loansFor(ctx, mi, yr, onlyCat) {
  const out = { 15: [], 30: [], unpaid: 0, total: 0, paid: 0 };
  ['15th', '30th'].forEach((cutoff) => {
    (ctx.loanCategories || []).forEach((cat) => {
      if (onlyCat && cat !== onlyCat) return;
      const r = ctx.getRowAmounts(ctx.loanTableData[cat], `${yr}-${MONTHS[mi]}-${cutoff}`);
      if (r.total > 0) {
        out[cutoff === '15th' ? 15 : 30].push({ label: ctx.loanLabel(cat), total: r.total, paid: r.paid, unpaid: r.unpaid });
        out.total += r.total; out.paid += r.paid; out.unpaid += r.unpaid;
      }
    });
  });
  return out;
}

function utilitiesFor(ctx, key) {
  const saved = (ctx.utilityBills || {})[key] || {};
  const names = [...UTILITY_ORDER, ...Object.keys(saved).filter((n) => !UTILITY_ORDER.includes(n))];
  return names.map((n) => ({ name: n, amount: num(saved[n]?.amount), paid: !!saved[n]?.paid }));
}

function expensesFor(ctx, key) {
  return ((ctx.monthlyExpenses || {})[key] || []).filter((e) => (e.category || '').trim() || num(e.amount));
}

function attendanceFor(ctx, mi, yr) {
  const last = new Date(yr, mi + 1, 0).getDate();
  const s = { present: 0, late: 0, out: 0, off: 0, hours: 0 };
  for (let d = 1; d <= last; d++) {
    const dow = new Date(yr, mi, d).getDay();
    const rec = (ctx.attendanceRecords || {})[`${yr}-${pad(mi + 1)}-${pad(d)}`];
    if (!rec) continue;
    if (dow === 0 || dow === 6) continue; // weekends are not working days
    if (rec.status === 'Present') s.present += 1;
    else if (rec.status === 'Late') s.late += 1;
    else if (rec.status === 'Out of Shift') s.out += 1;
    else if (rec.status === 'Holiday' || rec.status === 'Leave' || rec.holidayOrLeave) s.off += 1;
  }
  s.hours = (s.present + s.late) * 8;
  const now = ctx.now;
  const past = yr < now.getFullYear() || (yr === now.getFullYear() && mi < now.getMonth());
  const rate = past ? (ctx.historicalRates || {})[`${yr}-${pad(mi + 1)}-${pad(last)}`] || ctx.usdToPhpRate : ctx.usdToPhpRate;
  s.usd = s.hours * HOURLY_USD;
  s.rate = rate;
  s.php = Math.round(s.hours * HOURLY_USD * rate);
  return s;
}

// ------------------------------------------------------------------ voice
const OPENERS = ['Nya, on it!', 'Ooh, easy one!', 'Paws up, let me peek~', 'Tail swish... got it!', 'Sniff sniff... found it!', 'Kutitap reporting in!'];
const COSY_ENDS = ['Twinkle twinkle, you got this!', 'Meow-velous budgeting, friend!', 'Purr-fect, keep it up!', 'Star Coins are watching you, nya~', 'Tiny paws, big savings!'];
const end = () => pick(COSY_ENDS);
const open = () => pick(OPENERS);

// ------------------------------------------------------------------ answers
function aSavings(q, ctx, w) {
  const hasMonth = w.named || /this month|due|put|pay|deposit|contribut/.test(q);
  if (!hasMonth && /total|overall|progress|all|saved|how much/.test(q)) return aSavingsOverall(ctx);
  const items = savingsFor(ctx, w.key);
  if (!items.length) {
    return `${open()} No honey pot deposits for ${w.label}! Nothing to put in, so your paws are free~ ${(ctx.savingsGoals || []).length ? '' : '(You have no savings goals yet, want to plant one?)'}`.trim();
  }
  const total = items.reduce((s, i) => s + i.amount, 0);
  const left = items.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);
  const lines = items.map((i) => `- ${i.name}: ${peso(i.amount)} ${i.paid ? '(paid!)' : '(not yet)'}`).join('\n');
  const tail = left === 0 ? `All paid for ${w.short}! My tail is doing a happy wiggle!` : `Still to put in: ${peso(left)} (of ${peso(total)}). ${end()}`;
  return `${open()} Honey pot deposits for ${w.label}:\n${lines}\n${tail}`;
}

function aSavingsOverall(ctx) {
  const goals = ctx.savingsGoals || [];
  if (!goals.length) return 'Your honey pot is empty, nya! Add a savings goal and I will cheer for it every day~';
  const goal = goals.reduce((s, g) => s + num(g.goalAmount), 0);
  const saved = goals.reduce((s, g) => s + (g.monthsList || []).reduce((t, m) => t + (m.paid ? num(m.amount) : 0), 0), 0);
  const pct = goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0;
  return `Honey pot check! ${goals.length} goal${goals.length === 1 ? '' : 's'}, ${peso(saved)} saved out of ${peso(goal)} (${pct}%). Left to go: ${peso(Math.max(0, goal - saved))}. ${end()}`;
}

function aLoans(q, ctx, w) {
  let onlyCat = null;
  const names = { spaylater: 'SPayLater', sloan: 'SLoan', billease: 'Billease', maya: 'Maya', 'home credit': 'Atome', homecredit: 'Atome', atome: 'AtomeNew', tiktok: 'TikTokPayLater' };
  Object.keys(names).forEach((k) => { if (q.includes(k)) onlyCat = names[k]; });
  const r = loansFor(ctx, w.mi, w.yr, onlyCat);
  const what = onlyCat ? ctx.loanLabel(onlyCat) : 'loans';
  if (r.total === 0) return `${open()} No ${what} due in ${w.label}. Zero! My whiskers are tingling with joy~`;
  const last = new Date(w.yr, w.mi + 1, 0).getDate();
  const l30 = w.mi === 1 ? `${last}th` : '30th';
  const block = (title, rows) => (rows.length ? `${title}\n${rows.map((x) => `- ${x.label}: ${peso(x.unpaid)} ${x.unpaid === 0 ? '(paid!)' : x.paid > 0 ? `(${peso(x.paid)} already paid)` : ''}`.trim()).join('\n')}\n` : '');
  const text = block('15th cutoff:', r[15]) + block(`${l30} cutoff:`, r[30]);
  const tail = r.unpaid === 0 ? `Everything is paid for ${w.short}! Gold star for you!` : `Still due: ${peso(r.unpaid)}${r.paid > 0 ? ` (you already paid ${peso(r.paid)})` : ''}. ${end()}`;
  return `${open()} ${onlyCat ? ctx.loanLabel(onlyCat) : 'Loans'} due in ${w.label}:\n${text}${tail}`;
}

function aSalary(q, ctx, w) {
  const inc = (ctx.incomes || {})[w.key] || {};
  const expected = num(inc.expected);
  const actual = num(inc.actual);
  const lines = [];
  if (expected) {
    lines.push(`Expected income for ${w.label}: ${peso(expected)} (synced from last month's attendance).`);
    if (actual) lines.push(`Actual so far: ${peso(actual)} (${actual - expected >= 0 ? '+' : '-'}${peso(Math.abs(actual - expected))} vs expected).`);
    else lines.push('You have not logged the actual income yet, nya.');
  } else {
    lines.push(`No expected income for ${w.label} yet, because last month has no worked days on record.`);
  }
  const a = attendanceFor(ctx, w.mi, w.yr);
  if (a.hours > 0) {
    const nx = new Date(w.yr, w.mi + 1, 1);
    lines.push(`Earned so far in ${MONTHS[w.mi]}: ${a.present + a.late} shift days = ${a.hours} hours = $${a.usd.toFixed(2)}, about ${peso(a.php)} at ₱${a.rate.toFixed(2)}/USD. That arrives as ${MONTHS[nx.getMonth()]}'s expected income.`);
  } else if (!expected) {
    lines.push(`And no shifts logged for ${MONTHS[w.mi]} yet. Time in and let's get that bag!`);
  }
  return `${open()} Salary talk!\n${lines.join('\n')}\n${end()}`;
}

function aUtilities(q, ctx, w) {
  let items = utilitiesFor(ctx, w.key);
  const filters = [['meralco', 'Meralco'], ['electric', 'Meralco'], ['pldt', 'PLDT WiFi'], ['wifi', 'PLDT WiFi'], ['internet', 'PLDT WiFi'], ['maynilad', 'Maynilad'], ['water', 'Maynilad'], ['pag-ibig', 'PAG-IBIG House'], ['pagibig', 'PAG-IBIG House'], ['house', 'PAG-IBIG House']];
  const f = filters.find(([k]) => q.includes(k));
  if (f) items = items.filter((i) => i.name === f[1]);
  const total = items.reduce((s, i) => s + i.amount, 0);
  if (!total) return `${open()} No ${f ? f[1] : 'utility bill'} amounts for ${w.label} yet. Nothing to pay, or maybe you forgot to log it, nya?`;
  const left = items.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);
  const lines = items.filter((i) => i.amount).map((i) => `- ${i.name}: ${peso(i.amount)} ${i.paid ? '(paid!)' : '(not yet)'}`).join('\n');
  return `${open()} Bills for ${w.label}:\n${lines}\nTotal ${peso(total)}${left ? `, still to pay ${peso(left)}.` : ', all paid! Purr-fect!'}`;
}

function aExpenses(q, ctx, w) {
  const items = expensesFor(ctx, w.key);
  if (!items.length) return `${open()} No expenses logged for ${w.label}. Either you are a saving master or the receipts are hiding, nya~`;
  const total = items.reduce((s, i) => s + num(i.amount), 0);
  const lines = items.map((i) => `- ${(i.category || 'No name').trim()}: ${peso(i.amount)} ${i.paid ? '(paid!)' : '(not yet)'}`).join('\n');
  const left = items.filter((i) => !i.paid).reduce((s, i) => s + num(i.amount), 0);
  return `${open()} Expenses for ${w.label}:\n${lines}\nTotal ${peso(total)}${left ? `, unpaid ${peso(left)}.` : ', all paid!'}`;
}

function aSummary(q, ctx, w) {
  const util = utilitiesFor(ctx, w.key).reduce((s, i) => s + i.amount, 0);
  const sav = savingsFor(ctx, w.key).reduce((s, i) => s + i.amount, 0);
  const exp = expensesFor(ctx, w.key).reduce((s, i) => s + num(i.amount), 0);
  const loans = loansFor(ctx, w.mi, w.yr).unpaid;
  const due = util + sav + exp + loans;
  const actual = num(((ctx.incomes || {})[w.key] || {}).actual);
  const lines = [`- Utility bills: ${peso(util)}`, `- Loans (unpaid): ${peso(loans)}`, `- Savings: ${peso(sav)}`, `- Expenses: ${peso(exp)}`];
  const rest = actual ? `Actual income ${peso(actual)}, so ${actual - due >= 0 ? `you keep ${peso(actual - due)} after everything` : `you are ${peso(due - actual)} short`}.` : 'No actual income logged yet, so I cannot count what is left.';
  return `${open()} Money map for ${w.label}:\n${lines.join('\n')}\nTotal due: ${peso(due)}.\n${rest}`;
}

function aAttendance(q, ctx, w) {
  const a = attendanceFor(ctx, w.mi, w.yr);
  const days = a.present + a.late + a.out + a.off;
  if (!days) return `${open()} No attendance logged for ${w.label}. Punch in with your ID pass and I'll count it!`;
  const shift = ctx.dstOn ? '10 PM - 7 AM' : '11 PM - 8 AM';
  return `${open()} Attendance for ${w.label}:\n- Present: ${a.present}\n- Late: ${a.late}\n- Out of shift: ${a.out}\n- Holiday/leave: ${a.off}\nWorked hours: ${a.hours}. Shift is ${shift} (DST ${ctx.dstOn ? 'on' : 'off'}).`;
}

function aCoins(q, ctx) {
  const r = ctx.rounds || { daily: 0, bonus: 0 };
  const lines = [`You have ${ctx.coins || 0} Star Coins.`, `Claw rounds: ${r.daily} daily + ${r.bonus} bonus.`];
  if (ctx.basketCount) lines.push(`Your harvest basket holds ${ctx.basketCount} crop${ctx.basketCount === 1 ? '' : 's'}, Bun Bun is waiting to buy them!`);
  return `${open()} Treasure check!\n${lines.join('\n')}`;
}

function aAnnual(q, ctx, w) {
  const y = w.named ? w.yr : w.year;
  let income = 0, dues = 0, unpaidLoans = 0;
  MONTHS.forEach((m, i) => {
    const key = `${m}-${y}`;
    income += num(((ctx.incomes || {})[key] || {}).actual);
    dues += utilitiesFor(ctx, key).reduce((s, u) => s + u.amount, 0);
    dues += expensesFor(ctx, key).reduce((s, e) => s + num(e.amount), 0);
    const l = loansFor(ctx, i, y);
    dues += l.total; unpaidLoans += l.unpaid;
  });
  return `${open()} ${y} at a glance:\n- Actual income: ${peso(income)}\n- Dues & expenses: ${peso(dues)}\n- Loans still unpaid: ${peso(unpaidLoans)}\n${aSavingsOverall(ctx)}`;
}

const HELP = (lead = true) => `${lead ? `${open()} ` : ''}Ask me anything about your tracker! Try:\n- "What savings do I put this November?"\n- "What loans are due this December?"\n- "What is my expected salary this month?"\n- "How much is Meralco?" or "total due this month"\n- "How many hours did I work?" or "how many Star Coins do I have?"`;

// ------------------------------------------------------------------ greetings
export function greetingFor(ctx) {
  const h = (ctx.now || new Date()).getHours();
  const tod = h < 5 ? 'Up so late, night owl?' : h < 12 ? 'Good morning, sunshine!' : h < 18 ? 'Good afternoon, superstar!' : 'Good evening, moonbeam!';
  const name = ctx.userName ? `, ${ctx.userName}` : '';
  return pick([
    `Nya-hello${name}! ${tod} I'm Kutitap, your Kash Kasama. Ask me anything about your money!`,
    `Psst${name}! *tail swish* ${tod} Your tracker is my favorite toy. What do you want to know?`,
    `Meow! ${tod} Kutitap here, fully charged with Star Coins and gossip about your budget. Ask away${name ? `, ${ctx.userName}` : ''}!`,
    `Ooh, a visitor${name}! ${tod} I peeked at all your numbers already (don't tell Bun Bun). What shall we check?`,
    `Boop! ${tod} Kutitap at your service${name}. Savings, loans, salary... I know it all, nya~`,
  ]);
}

export const SUGGESTIONS = ['Savings this month', 'Loans due next month', 'Expected salary', 'Total due this month'];

// ------------------------------------------------------------------ router
export function answerLocal(question, ctx) {
  const q = ` ${question.toLowerCase().replace(/[?!.,]+/g, ' ').replace(/\s+/g, ' ').trim()} `.trim();
  const now = ctx.now || new Date();
  const w = parseWhen(q, now);
  const has = (re) => re.test(q);

  if (!q) return pick(['Meow? Say something, nya!', 'Psst, the keyboard is right there~']);
  if (has(/^(hi|hello|hey|yo|hiya|sup|good (morning|afternoon|evening))\b/) && q.split(' ').length <= 4) return greetingFor(ctx);
  if (has(/\b(thanks|thank you|salamat|ty|thx)\b/)) return pick(['Anytime, nya! Tiny paws are always ready.', 'You are welcome! Now go be rich, I believe in you~', 'Aww, *purrs loudly*. Ask me more!']);
  if (q === 'help' || has(/\b(who are you|what can you|what do you do|commands|how do you work)\b/)) return HELP();
  if (has(/\b(how are you|how r u|hows it going|mood|feeling|hungry)\b/)) return pick(['I am purr-fectly fluffy! Paid bills make me happy, so keep them coming~', 'Doing great, nya! Ask me about your money and I get even happier.']);

  const loanName = /spaylater|sloan|billease|maya|home credit|homecredit|atome|tiktok/;
  if (has(loanName) || has(/\b(loan|loans|utang|installment|installments|cutoff|cut off|paylater)\b/)) return aLoans(q, ctx, w);
  if (has(/\b(saving|savings|save|honey|goal|goals|ipon|contribution|deposit)\b/)) return aSavings(q, ctx, w);
  if (has(/\b(salary|sweldo|paycheck|payday|income|earn|earned|earning|earnings|expected|wage|sahod|kita)\b/) && !has(/\bexpenses?\b/)) return aSalary(q, ctx, w);
  if (has(/\b(bill|bills|utility|utilities|meralco|pldt|maynilad|pag-?ibig|wifi|electric|electricity|water|internet|house)\b/)) return aUtilities(q, ctx, w);
  if (has(/\b(expense|expenses|spend|spent|spending|gastos|grocery|groceries)\b/)) return aExpenses(q, ctx, w);
  if (has(/\b(attendance|present|late|absent|hours|shift|time in|timed in|worked|work|dst|leave|holiday)\b/)) return aAttendance(q, ctx, w);
  if (has(/\b(annual|yearly|year|ytd)\b/)) return aAnnual(q, ctx, w);
  if (has(/\b(coin|coins|claw|round|rounds|pantry|basket|harvest|star)\b/)) return aCoins(q, ctx);
  if (has(/\b(due|owe|pay|total|remaining|left|balance|budget|afford|sobra|how much)\b/)) return aSummary(q, ctx, w);

  return pick([
    `Hmm, my whiskers can't find that in your tracker, nya! ${HELP(false)}`,
    `*tilts head* I only know what's inside your tracker. ${HELP(false)}`,
  ]);
}

export function askKutitap(question, ctx) {
  // A real AI call could go here (return its text); answerLocal() is the offline fallback.
  return answerLocal(question, ctx);
}
