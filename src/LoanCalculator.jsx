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

// same look as the other pop-ups (e.g. Add New Savings Goal)
const lbl = { fontSize: '12px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: '4px' };
const inp = { width: '100%', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '13px', color: 'var(--ink)' };
const sel = { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', padding: '10px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' };
const yearSel = { ...sel, flex: 'none', width: '80px' };
const iconBtn = { backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--px-accent)', fontWeight: 800 };
const chip = (on) => ({ padding: '10px 20px', borderRadius: 0, '--px': 'pill', fontWeight: 800, fontSize: '13px', cursor: 'pointer', backgroundColor: on ? 'var(--px-pink)' : '#FFFFFF', color: on ? '#FFFFFF' : 'var(--ink)', boxShadow: on ? '0 4px 15px rgba(223,177,91,0.4)' : '0 2px 8px rgba(0,0,0,0.04)' });
const tile = { backgroundColor: '#FFFFFF', padding: '14px', borderRadius: 0, '--px': 'card', textAlign: 'center', boxShadow: '0 4px 12px rgba(223,177,91,0.08)', minWidth: 0 };
const tileK = { fontSize: '10px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', marginBottom: '4px' };
const tileV = { fontSize: '16px', fontWeight: 800, color: 'var(--ink)', overflowWrap: 'anywhere' };
const tileS = { fontSize: '10px', fontWeight: 700, color: 'var(--px-muted)', marginTop: '2px' };

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
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(92,58,33,0.3)', backdropFilter: 'blur(4px)', display: open ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onMinimize(); }}>
      <div className="lc-panel" style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '24px 30px', boxShadow: '0 25px 50px rgba(223,177,91,0.3)' }} role="dialog" aria-modal="true" aria-label="Loan Calculator">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed var(--px-sun)', paddingBottom: '12px' }}>
          <div className="kutitap-title" style={{ fontSize: '18px', color: 'var(--px-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}><CalculatorIcon style={{ width: '18px', height: '18px' }} /> Loan Calculator</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onMinimize} aria-label="Minimize" title="Minimize (keeps your numbers)" style={iconBtn}><Minus style={{ width: '16px', height: '16px' }} /></button>
            <button onClick={closeAndClear} aria-label="Close" title="Close (clears your numbers)" style={iconBtn}><X style={{ width: '16px', height: '16px' }} /></button>
          </div>
        </div>

        <div className="lc-body">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--px-muted)' }}>
            <Info style={{ width: '14px', height: '14px', flexShrink: 0 }} /> Just a computation. Nothing here is added to your Loans tab. Minimize keeps your numbers until you refresh or close the app.
          </div>

          <div className="lc-grid">
            <div><label style={lbl}>Loan Amount (₱)</label><input type="text" inputMode="decimal" placeholder="e.g. 5000" value={amount} onChange={(e) => setAmount(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>{perMonth > 1 ? 'Each Repayment, per cutoff (₱)' : 'Each Repayment (₱)'}</label><input type="text" inputMode="decimal" placeholder="e.g. 1100" value={repayment} onChange={(e) => setRepayment(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>How Many Months</label><input type="text" inputMode="numeric" placeholder="e.g. 5" value={count} onChange={(e) => setCount(e.target.value.replace(/[^\d]/g, '').slice(0, 2))} style={inp} /></div>
            <div><label style={lbl}>Under Which Loan</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...sel, width: '100%', padding: '12px 10px' }}>
                {loanCategories.map((c) => <option key={c} value={c}>{loanLabel(c)}</option>)}
              </select>
            </div>
          </div>

          <div className="lc-grid wide">
            <div><label style={lbl}>Start Date</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select aria-label="Start month" value={startMonth} onChange={(e) => changeStart(parseInt(e.target.value), startYear)} style={sel}>{months.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
                <select aria-label="Start year" value={startYear} onChange={(e) => changeStart(startMonth, parseInt(e.target.value))} style={yearSel}>{availableYears.map((y) => <option key={y} value={y}>{y}</option>)}</select>
              </div>
            </div>
            <div><label style={lbl}>End Date</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select aria-label="End month" value={endMonth} onChange={(e) => changeEnd(parseInt(e.target.value), endYear)} style={sel}>{months.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
                <select aria-label="End year" value={endYear} onChange={(e) => changeEnd(endMonth, parseInt(e.target.value))} style={yearSel}>{endYears.map((y) => <option key={y} value={y}>{y}</option>)}</select>
              </div>
            </div>
          </div>

          <div>
            <label style={lbl}>Repayment Falls On (pick one or both)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {['15th', '30th'].map((c) => (
                <button key={c} type="button" aria-pressed={cutoffs.includes(c)} onClick={() => toggleCutoff(c)} style={chip(cutoffs.includes(c))}>{c} Cutoff</button>
              ))}
            </div>
          </div>

          {!valid ? (
            <div className="lc-empty">Fill in the amount, repayment and months to see the total, the interest and how it stacks on your current loans.</div>
          ) : (
            <div className="lc-results">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div style={tile}><div style={tileK}>Total You Will Pay</div><div style={tileV}>{peso(result.total)}</div><div style={tileS}>{n * perMonth} x {peso(pay)}{perMonth > 1 ? ` (${perMonth} a month)` : ''}</div></div>
                <div style={tile}><div style={tileK}>{result.interest < 0 ? 'Below Loan Amount' : 'Interest'}</div><div style={{ ...tileV, color: result.interest > 0 ? 'var(--px-accent)' : 'var(--ink)' }}>{peso(Math.abs(result.interest))}</div><div style={tileS}>{result.interest > 0 ? `${result.rate.toFixed(1)}% of the loan` : result.interest === 0 ? 'No interest' : 'Repayments are lower than the amount'}</div></div>
                <div style={tile}><div style={tileK}>Loan</div><div style={tileV}>{loanLabel(category)}</div><div style={tileS}>{months[startMonth].slice(0, 3)} {startYear} to {months[endMonth].slice(0, 3)} {endYear}</div></div>
              </div>

              <div className="kutitap-title" style={{ fontSize: '16px', color: 'var(--px-accent)' }}>If You Go Ahead</div>
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
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--px-muted)' }}>Existing amounts are what is still unpaid on the Loans tab for each cutoff.</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px', paddingBottom: '8px' }}>
          <button onClick={reset} style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', padding: '10px 20px', fontWeight: 800, fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>Reset</button>
          <button onClick={closeAndClear} style={{ backgroundColor: 'var(--px-pink)', borderRadius: 0, '--px': 'pill', padding: '10px 24px', fontWeight: 800, fontSize: '13px', color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 4px 15px rgba(223,177,91,0.3)' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
