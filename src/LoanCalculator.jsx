import React, { useState, useEffect, useMemo } from 'react';
import { Calculator as CalculatorIcon, X, Minus, Info } from 'lucide-react';
import './LoanCalculator.css';

// Loan Calculator (Loans tab popup). Pure what-if maths: it only READS the existing loans and never writes anything to them.
const peso = (n) => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return `${v < 0 ? '-' : ''}₱${Math.abs(v).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
};
const num = (s) => { const n = parseFloat(String(s).replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
const MAX_MONTHS = 60;

export default function LoanCalculator({ loanTableData, loanCategories, loanLabel, months, getCutoff30Label, getRowAmounts, availableYears, defaultYear, defaultMonthIndex, open, onMinimize, onClose, onDraftChange }) {
  const [amount, setAmount] = useState('');
  const [repayment, setRepayment] = useState('');
  const [category, setCategory] = useState(loanCategories[0]);
  const [cutoffs, setCutoffs] = useState(['15th']);
  const [startMonth, setStartMonth] = useState(defaultMonthIndex);
  const [startYear, setStartYear] = useState(defaultYear);
  const [count, setCount] = useState('');

  // Escape and tapping outside only minimize, so nothing typed is lost
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onMinimize(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onMinimize]);

  const n = Math.floor(num(count));
  const startAbs = startYear * 12 + startMonth;
  const endAbs = startAbs + Math.max(n, 1) - 1;
  const endMonth = ((endAbs % 12) + 12) % 12;
  const endYear = Math.floor(endAbs / 12);

  // "How many months" and "When does it end" describe the same thing, so changing one updates the other
  const changeEnd = (m, y) => {
    const diff = y * 12 + m - startAbs + 1;
    setCount(diff >= 1 ? String(Math.min(diff, MAX_MONTHS)) : '1');
  };
  const changeStart = (m, y) => {
    setStartMonth(m); setStartYear(y);
  };
  const endYears = availableYears.includes(endYear) ? availableYears : [...availableYears, endYear].sort((a, b) => a - b);

  const amt = num(amount);
  const pay = num(repayment);
  // pick one or both cutoffs; at least one stays on
  const toggleCutoff = (c) => setCutoffs((prev) => (prev.includes(c) ? (prev.length > 1 ? prev.filter((x) => x !== c) : prev) : [...prev, c]));
  const perMonth = cutoffs.length;
  const valid = amt > 0 && pay > 0 && n >= 1 && n <= MAX_MONTHS;

  const result = useMemo(() => {
    if (!valid) return null;
    const total = Math.round(pay * n * perMonth * 100) / 100;
    const interest = Math.round((total - amt) * 100) / 100;
    // payable (still unpaid) amount of one cutoff across every loan tab: same figure the Loans cards show
    const existing = (m, y, cut) => loanCategories.reduce((s, cat) => {
      const d = loanTableData[cat];
      return d ? s + getRowAmounts(d, `${y}-${months[m]}-${cut}`).unpaid : s;
    }, 0);
    const rows = Array.from({ length: n }, (_, i) => {
      const abs = startAbs + i;
      const m = ((abs % 12) + 12) % 12;
      const y = Math.floor(abs / 12);
      const cuts = ['15th', '30th'].map((c) => {
        const before = existing(m, y, c);
        const add = cutoffs.includes(c) ? pay : 0;
        return { c, label: c === '15th' ? '15th' : `${getCutoff30Label(months[m], y)}th`, before, add, after: before + add };
      });
      return { m, y, cuts, before: cuts[0].before + cuts[1].before, after: cuts[0].after + cuts[1].after };
    });
    return { total, interest, rate: amt > 0 ? (interest / amt) * 100 : 0, rows };
  }, [valid, amt, pay, n, startAbs, cutoffs, perMonth, loanTableData, loanCategories, months, getRowAmounts, getCutoff30Label]);

  const hasDraft = !!(amount || repayment || count);
  useEffect(() => { if (onDraftChange) onDraftChange(hasDraft); }, [hasDraft, onDraftChange]);

  const reset = () => { setAmount(''); setRepayment(''); setCount(''); setCutoffs(['15th']); setCategory(loanCategories[0]); setStartMonth(defaultMonthIndex); setStartYear(defaultYear); };

  // Close = throw the calculation away; minimize = hide it but keep everything (state stays while the app is open)
  const closeAndClear = () => { reset(); onClose(); };

  return (
    <div className="lc-overlay" style={{ display: open ? 'flex' : 'none' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onMinimize(); }}>
      <div className="lc-panel" style={{ '--px': 'panel' }} role="dialog" aria-modal="true" aria-label="Loan Calculator">
        <div className="lc-head">
          <div className="lc-title kutitap-title"><CalculatorIcon style={{ width: 20, height: 20 }} /> Loan Calculator</div>
          <div className="lc-xs">
            <button className="lc-x" onClick={onMinimize} aria-label="Minimize" title="Minimize (keeps your numbers)"><Minus style={{ width: 14, height: 14 }} /></button>
            <button className="lc-x" onClick={closeAndClear} aria-label="Close" title="Close (clears your numbers)"><X style={{ width: 14, height: 14 }} /></button>
          </div>
        </div>
        <div className="lc-note"><Info style={{ width: 14, height: 14, flexShrink: 0 }} /> Just a computation. Nothing here is added to your Loans tab. Minimize keeps your numbers until you refresh or close the app.</div>

        <div className="lc-body">
          <div className="lc-form">
            <label className="lc-f"><span>Loan amount</span>
              <input inputMode="decimal" placeholder="5000" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ '--px': 'pill' }} />
            </label>
            <label className="lc-f"><span>{perMonth > 1 ? 'Each repayment (per cutoff)' : 'How much each repayment'}</span>
              <input inputMode="decimal" placeholder="1100" value={repayment} onChange={(e) => setRepayment(e.target.value)} style={{ '--px': 'pill' }} />
            </label>
            <label className="lc-f"><span>How many months</span>
              <input inputMode="numeric" placeholder="5" value={count} onChange={(e) => setCount(e.target.value.replace(/[^\d]/g, '').slice(0, 2))} style={{ '--px': 'pill' }} />
            </label>
            <label className="lc-f"><span>Under which loan</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ '--px': 'pill' }}>
                {loanCategories.map((c) => <option key={c} value={c}>{loanLabel(c)}</option>)}
              </select>
            </label>
            <div className="lc-f lc-wide"><span>Start</span>
              <div className="lc-pair">
                <select aria-label="Start month" value={startMonth} onChange={(e) => changeStart(parseInt(e.target.value), startYear)} style={{ '--px': 'pill' }}>
                  {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select aria-label="Start year" value={startYear} onChange={(e) => changeStart(startMonth, parseInt(e.target.value))} style={{ '--px': 'pill' }}>
                  {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="lc-f lc-wide"><span>End</span>
              <div className="lc-pair">
                <select aria-label="End month" value={endMonth} onChange={(e) => changeEnd(parseInt(e.target.value), endYear)} style={{ '--px': 'pill' }}>
                  {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select aria-label="End year" value={endYear} onChange={(e) => changeEnd(endMonth, parseInt(e.target.value))} style={{ '--px': 'pill' }}>
                  {endYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="lc-f lc-wide"><span>Repayment falls on (pick one or both)</span>
              <div className="lc-seg">
                {['15th', '30th'].map((c) => (
                  <button key={c} type="button" className={cutoffs.includes(c) ? 'on' : ''} aria-pressed={cutoffs.includes(c)} onClick={() => toggleCutoff(c)} style={{ '--px': 'pill' }}>{c} cutoff</button>
                ))}
              </div>
            </div>
          </div>

          {!valid ? (
            <div className="lc-empty">Fill in the amount, repayment and months to see the total, the interest and how it stacks on your current loans.</div>
          ) : (
            <div className="lc-results">
              <div className="lc-tiles">
                <div className="lc-tile" style={{ '--px': 'card' }}><div className="lc-k">Total you will pay</div><div className="lc-v">{peso(result.total)}</div><div className="lc-s">{n * perMonth} x {peso(pay)}{perMonth > 1 ? ` (${perMonth} a month)` : ''}</div></div>
                <div className="lc-tile" style={{ '--px': 'card' }}><div className="lc-k">{result.interest < 0 ? 'Below loan amount' : 'Interest'}</div><div className={`lc-v ${result.interest > 0 ? 'hot' : ''}`}>{peso(Math.abs(result.interest))}</div><div className="lc-s">{result.interest > 0 ? `${result.rate.toFixed(1)}% of the loan` : result.interest === 0 ? 'No interest' : 'Repayments are lower than the amount'}</div></div>
                <div className="lc-tile" style={{ '--px': 'card' }}><div className="lc-k">Loan</div><div className="lc-v sm">{loanLabel(category)}</div><div className="lc-s">{months[startMonth].slice(0, 3)} {startYear} to {months[endMonth].slice(0, 3)} {endYear}</div></div>
              </div>

              <div className="lc-sub kutitap-title">If you go ahead</div>
              <div className="lc-rows">
                {result.rows.map((r) => (
                  <div className="lc-row" key={`${r.y}-${r.m}`}>
                    <div className="lc-row-h"><span>{months[r.m]} {r.y}</span><span>{r.before === r.after ? peso(r.after) : `${peso(r.before)} to ${peso(r.after)}`}</span></div>
                    {r.cuts.map((c) => (
                      <div className={`lc-line ${c.add ? 'add' : ''}`} key={c.c}>
                        <span className="lc-cut">{c.label} cutoff</span>
                        <span className="lc-eq">{c.add ? <>{peso(c.before)} + <b>{peso(c.add)}</b> = <b>{peso(c.after)}</b></> : peso(c.before)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="lc-foot">Existing amounts are what is still unpaid on the Loans tab for each cutoff.</div>
            </div>
          )}
        </div>

        <div className="lc-actions">
          <button className="lc-btn alt" onClick={reset} style={{ '--px': 'pill' }}>Reset</button>
          <button className="lc-btn alt" onClick={onMinimize} style={{ '--px': 'pill' }}>Minimize</button>
          <button className="lc-btn" onClick={closeAndClear} style={{ '--px': 'pill' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
