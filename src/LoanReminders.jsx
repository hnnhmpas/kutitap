import React, { useState, useEffect } from 'react';
import { Mail, ChevronLeft, ChevronDown, Sparkles } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import './LoanReminders.css';

// Email Reminders view (Loans tab). Config lives in `kutitap_loan_reminders` (written here, never deleted: opting out sets enabled:false).
// What the daily email job did lives in `kutitap_reminder_state` (written only by the server, read-only here).
const pad = (n) => String(n).padStart(2, '0');
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const addDays = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (ymd) => { const [, m, d] = ymd.split('-').map(Number); return `${MON[m - 1]} ${d}`; };
const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const KIND = { first: '2-Day Advance', follow: 'Due Date', overdue: 'Overdue', boss: 'Boss Defeated', digest: 'Cutoff Digest' };
const STATUS = { sent: 'Sent', paid: 'Clicked Paid', snoozed: 'Snoozed', cancelled: 'Cancelled' };
const fmtTs = (ts) => { const d = new Date(ts); return Number.isNaN(+d) ? '' : d.toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); };
export const reminderId = (cat, rowKey, col) => [cat, rowKey, col].join('~').replace(/[^\w ~-]/g, '_');

export default function LoanReminders({ loanTableData, loanCategories, loanLabel, months, getCutoff30Label, availableYears, year: startYear, reminders, setReminders, reminderState, onBack }) {
  const [year, setYear] = useState(startYear);
  const [tab, setTab] = useState('all');
  const [hidePaid, setHidePaid] = useState(false);
  const [bulkDue, setBulkDue] = useState('');
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState(null);
  const [logsErr, setLogsErr] = useState(false);
  // Sent logs: written only by the server job; read here (latest 100) while the drawer is open
  useEffect(() => {
    if (!logsOpen) return undefined;
    setLogsErr(false);
    const q = query(collection(db, 'financeTracker', 'user_data', 'reminderLogs'), orderBy('ts', 'desc'), limit(100));
    return onSnapshot(q, (snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setLogsErr(true));
  }, [logsOpen]);
  const streak = (reminderState && reminderState.streak && reminderState.streak.count) || 0;
  const today = localToday();
  const items = (reminders && reminders.items) || {};
  const states = (reminderState && reminderState.items) || {};

  // every loan entry with an amount, in tab order then calendar order
  const all = [];
  loanCategories.forEach((cat) => {
    const c = loanTableData[cat];
    if (!c || !Array.isArray(c.columns)) return;
    months.forEach((m, mi) => ['15th', '30th'].forEach((cut) => {
      const rowKey = `${year}-${m}-${cut}`;
      c.columns.forEach((col) => {
        const amount = parseFloat(c.cells?.[rowKey]?.[col]) || 0;
        if (!amount) return;
        const day = cut === '15th' ? 15 : Math.min(30, new Date(year, mi + 1, 0).getDate());
        all.push({ id: reminderId(cat, rowKey, col), cat, rowKey, col, amount, paid: !!c.paidCells?.[rowKey]?.[col], cutLabel: `${m.slice(0, 3)} ${cut === '15th' ? '15th' : getCutoff30Label(m, year) + 'th'}`, defaultDue: `${year}-${pad(mi + 1)}-${pad(day)}` });
      });
    }));
  });
  const shown = all.filter((e) => (tab === 'all' || e.cat === tab) && !(hidePaid && e.paid));
  const countOf = (cat) => all.filter((e) => cat === 'all' || e.cat === cat).length;
  const onCount = all.filter((e) => items[e.id]?.enabled && !e.paid).length;

  const put = (list) => setReminders((prev) => {
    const base = prev && typeof prev === 'object' ? prev : {};
    const next = { ...(base.items || {}) };
    list.forEach(({ e, patch }) => { next[e.id] = { ...(next[e.id] || {}), cat: e.cat, rowKey: e.rowKey, col: e.col, ...patch }; });
    return { ...base, v: 1, items: next };
  });
  const turnOn = (e) => ({ e, patch: { enabled: true, due: isYmd(items[e.id]?.due) ? items[e.id].due : e.defaultDue, setAt: items[e.id]?.setAt || today } });
  const toggle = (e) => (items[e.id]?.enabled ? put([{ e, patch: { enabled: false } }]) : put([turnOn(e)]));
  const setDue = (e, due) => put([{ e, patch: { due, setAt: today } }]);
  const selectAll = () => put(shown.filter((e) => !e.paid && !items[e.id]?.enabled).map(turnOn));
  const clearAll = () => put(shown.filter((e) => items[e.id]?.enabled).map((e) => ({ e, patch: { enabled: false } })));
  const applyBulk = () => { if (!isYmd(bulkDue)) return; put(shown.filter((e) => items[e.id]?.enabled && !e.paid).map((e) => ({ e, patch: { due: bulkDue, setAt: today } }))); };

  const statusOf = (e) => {
    const it = items[e.id];
    if (e.paid) return { tone: 'done', text: it?.enabled ? 'Paid: reminders cancelled' : 'Paid' };
    if (!it?.enabled) return { tone: 'off', text: 'Reminders off' };
    if (!isYmd(it.due)) return { tone: 'warn', text: 'Pick a due date' };
    const st = states[e.id] && states[e.id].due === it.due ? states[e.id] : {};
    const first = addDays(it.due, -2);
    const a = st.firstSent ? 'sent' : first < today ? 'skipped' : `on ${short(first)}`;
    const b = st.followSent ? 'sent' : it.due < today ? 'passed' : `on ${short(it.due)}`;
    return { tone: 'on', text: `2 days before: ${a}`, text2: `Due date: ${b}` };
  };

  const chip = (key, label) => (
    <button key={key} type="button" className={`lr-chip${tab === key ? ' on' : ''}`} onClick={() => setTab(key)}>{label} <span className="lr-chip-n">{countOf(key)}</span></button>
  );
  const groups = loanCategories.map((cat) => ({ cat, rows: shown.filter((e) => e.cat === cat) })).filter((g) => g.rows.length);

  return (
    <div className="lr-wrap">
      <div className="lr-head" style={{ '--px': 'panel' }}>
        <button type="button" className="lr-back" onClick={onBack} style={{ '--px': 'pill' }}><ChevronLeft style={{ width: 16, height: 16 }} /> Back to loans</button>
        <div className="lr-title"><Mail style={{ width: 22, height: 22 }} /> Email Reminders</div>
        <div className="lr-desc">Tick the loans you want to be reminded about and set a due date for each. You get an email 2 days before and another on the due date. Nothing is sent once a loan is marked Paid. The due date here is only for the emails; your 15th and 30th rows stay as they are.</div>
        <div className="lr-meta">
          <div className="lr-count">{onCount} {onCount === 1 ? 'loan' : 'loans'} with reminders on</div>
          <div className="lr-count">On-time streak: {streak}{streak >= 2 ? ' quests' : streak === 1 ? ' quest' : ''}</div>
          <button type="button" className="lr-btn alt" style={{ '--px': 'pill' }} aria-expanded={logsOpen} onClick={() => setLogsOpen((o) => !o)}>
            Sent logs <ChevronDown style={{ width: 14, height: 14, verticalAlign: 'middle', transform: logsOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
        </div>
      </div>

      {logsOpen && (
        <div className="lr-logs" style={{ '--px': 'panel' }}>
          <div className="lr-logs-h">Sent logs <span>latest 100</span></div>
          {logsErr && <div className="lr-empty">Could not load the logs. Check that the reminderLogs rule was added in Firestore.</div>}
          {!logsErr && logs === null && <div className="lr-empty">Loading...</div>}
          {!logsErr && logs && logs.length === 0 && <div className="lr-empty"><Sparkles style={{ width: 16, height: 16 }} /> No reminders yet. They show up here after the daily job runs.</div>}
          {!logsErr && logs && logs.length > 0 && (
            <div className="lr-log-table" role="table">
              <div className="lr-log-row head" role="row"><span>Quest</span><span>Type</span><span>Date and time</span><span>Status</span></div>
              {logs.map((l) => (
                <div key={l.id} className="lr-log-row" role="row">
                  <span className="lr-log-q"><span>{l.name}</span><small>{l.tab}{l.due ? ` · due ${short(l.due)}` : ''}</small></span>
                  <span>{KIND[l.kind] || l.kind}</span>
                  <span>{fmtTs(l.ts)}</span>
                  <span><b className={`lr-pill ${l.status}`}>{STATUS[l.status] || l.status}</b>{l.status === 'cancelled' && l.reason === 'paid' ? <small className="lr-why">already Paid</small> : null}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="lr-bar" style={{ '--px': 'panel' }}>
        <div className="lr-chips">{chip('all', 'All loans')}{loanCategories.map((c) => chip(c, loanLabel(c)))}</div>
        <div className="lr-tools">
          <label className="lr-field">Year
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ '--px': 'pill' }}>{availableYears.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          </label>
          <label className="lr-check"><input type="checkbox" checked={hidePaid} onChange={(e) => setHidePaid(e.target.checked)} /> Hide paid</label>
          <button type="button" className="lr-btn" style={{ '--px': 'pill' }} onClick={selectAll}>Select all shown</button>
          <button type="button" className="lr-btn alt" style={{ '--px': 'pill' }} onClick={clearAll}>Opt out all shown</button>
          <span className="lr-bulk">
            <input type="date" aria-label="Due date for all ticked loans" value={bulkDue} onChange={(e) => setBulkDue(e.target.value)} style={{ '--px': 'pill' }} />
            <button type="button" className="lr-btn" style={{ '--px': 'pill' }} disabled={!isYmd(bulkDue)} onClick={applyBulk}>Set due date for ticked</button>
          </span>
        </div>
      </div>

      <div className="lr-list" style={{ '--px': 'panel' }}>
        {groups.length === 0 && (
          <div className="lr-empty"><Sparkles style={{ width: 16, height: 16 }} /> No loan entries to show for {year}. Add amounts in the loan sub-tabs first.</div>
        )}
        {groups.map(({ cat, rows }) => (
          <div key={cat} className="lr-group">
            <div className="lr-group-h">{loanLabel(cat)} <span>{rows.length} {rows.length === 1 ? 'loan' : 'loans'}</span></div>
            {rows.map((e) => {
              const it = items[e.id]; const on = !!it?.enabled && !e.paid; const s = statusOf(e);
              return (
                <div key={e.id} className={`lr-row${e.paid ? ' paid' : ''}${on ? ' on' : ''}`}>
                  <input type="checkbox" className="lr-box" aria-label={`Email reminders for ${e.col}, ${loanLabel(cat)}, ${e.cutLabel}`} checked={on} disabled={e.paid} onChange={() => toggle(e)} />
                  <div className="lr-name"><div className="lr-loan">{e.col}</div><div className="lr-sub">{loanLabel(cat)} · {e.cutLabel} row</div></div>
                  <div className="lr-amt">₱{e.amount.toLocaleString()}</div>
                  <input type="date" className="lr-date" aria-label={`Reminder due date for ${e.col}, ${e.cutLabel}`} value={isYmd(it?.due) ? it.due : ''} disabled={!on} onChange={(ev) => setDue(e, ev.target.value)} style={{ '--px': 'pill' }} />
                  <div className={`lr-status ${s.tone}`}><div>{s.text}</div>{s.text2 && <div>{s.text2}</div>}</div>
                  {on ? <button type="button" className="lr-btn alt sm" style={{ '--px': 'pill' }} onClick={() => toggle(e)}>Opt out</button> : <span className="lr-gap" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
