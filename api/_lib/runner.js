// The daily job: decides which emails are due today (Manila time), sends them, keeps the on-time streak,
// sends the one-off "Boss defeated" email, and writes the sent logs.
import { createHash } from 'node:crypto';
import { readServiceAccount, signingKey, readDoc, mutate, writeLog } from './firestore.js';
import { FIRST, FOLLOW, OVERDUE, BOSS, render, pickTemplate } from './templates.js';
import { buildEmail } from './emailHtml.js';
import { signToken } from './token.js';
import { manilaToday, addDays, isYmd, prettyDate } from './dates.js';

export const RECIPIENT = 'hannahalvarezpascaran@gmail.com';
export const SENDER_NAME = 'Kutitap - Your Kash Kasama';
const LABELS = { Atome: 'Home Credit', AtomeNew: 'Atome' };
export const tabLabel = (cat) => LABELS[cat] || cat;
export const peso = (n) => '₱' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const siteUrl = (env) => (env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + env.VERCEL_PROJECT_PRODUCTION_URL : '')).replace(/\/+$/, '');
const POOLS = { first: FIRST, follow: FOLLOW, overdue: OVERDUE, boss: BOSS };
const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 16);
export const logIdFor = (id, due, kind) => 'l_' + sha(`${id}|${due}|${kind}`);

export function loanInfo(loans, it) {
  const c = loans && loans[it.cat];
  if (!c) return { ok: false, amount: 0, paid: false };
  const inCol = Array.isArray(c.columns) && c.columns.includes(it.col);
  const amount = parseFloat(c.cells?.[it.rowKey]?.[it.col]) || 0;
  return { ok: inCol && amount > 0, amount, paid: !!c.paidCells?.[it.rowKey]?.[it.col] };
}
export function cutoffText(rowKey) { // '2026-November-15th'
  const [y, m, c] = String(rowKey).split('-');
  return `${m} ${c} cutoff, ${y}`;
}

export async function sendMail({ env, subject, html, text, fetchImpl = fetch }) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
  const address = env.MAIL_FROM_ADDRESS || 'onboarding@resend.dev';
  const r = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${SENDER_NAME} <${address}>`, to: [RECIPIENT], subject, html, text }),
  });
  if (!r.ok) throw new Error('email failed ' + r.status);
}

// logs are a nice-to-have: a failed log write must never stop an email or the run
export async function safeLog(sa, env, id, fields) {
  try { await writeLog(sa, id, fields, env); } catch (e) { console.error('log write failed:', e.message); }
}

const norm = (s) => {
  const o = s && typeof s === 'object' ? s : {};
  o.items = o.items && typeof o.items === 'object' ? o.items : {};
  o.used = { first: [], follow: [], overdue: [], boss: [], ...(o.used || {}) };
  o.streak = o.streak && typeof o.streak === 'object' ? o.streak : { count: 0 };
  o.boss = o.boss && typeof o.boss === 'object' ? o.boss : {};
  return o;
};
export const updateState = (sa, env, fn) => mutate(sa, (data) => { const s = norm(data.kutitap_reminder_state); fn(s); return [{ path: 'kutitap_reminder_state', value: s }]; }, env);

// "Boss defeated": every installment of a multi-part loan (a column with 2+ entries) is Paid -> one celebratory email, once.
export async function maybeBoss({ sa, env = process.env, cat, col, mail = sendMail, rand = Math.random, now = new Date() }) {
  const { data } = await readDoc(sa, env);
  const state = norm(data.kutitap_reminder_state);
  const key = `${cat}~${col}`;
  if (state.boss[key]) return null;
  const c = data.kutitap_loans?.[cat];
  if (!c || !Array.isArray(c.columns) || !c.columns.includes(col)) return null;
  const parts = Object.entries(c.cells || {}).map(([rowKey, row]) => ({ rowKey, amount: parseFloat(row?.[col]) || 0 })).filter((p) => p.amount > 0);
  if (parts.length < 2 || !parts.every((p) => c.paidCells?.[p.rowKey]?.[col])) return null;
  const total = parts.reduce((a, p) => a + p.amount, 0);
  const base = siteUrl(env);
  const pick = pickTemplate(BOSS, state.used.boss, rand);
  const d = { name: col, tab: tabLabel(cat), totalText: peso(total), countText: `${parts.length} installments, all Paid` };
  const r = render(BOSS[pick.index], { name: col, tab: d.tab, total: d.totalText, count: String(parts.length) });
  const { html, text } = buildEmail({ kind: 'boss', d, r, imgBase: base, streak: state.streak.count || 0 });
  await mail({ env, subject: r.subject, html, text });
  await updateState(sa, env, (s) => { s.boss[key] = now.toISOString(); s.used.boss = pick.used; });
  await safeLog(sa, env, 'b_' + sha(key), { ts: now.toISOString(), itemId: key, name: col, tab: d.tab, cat, kind: 'boss', status: 'sent', amount: total, due: '', tpl: pick.index + 1 });
  return { name: col, total, parts: parts.length, template: pick.index + 1 };
}

export async function runReminders({ env = process.env, now = new Date(), mail = sendMail, rand = Math.random } = {}) {
  const sa = readServiceAccount(env);
  const key = signingKey(sa);
  const today = manilaToday(now);
  const base = siteUrl(env);
  if (!base) throw new Error('SITE_URL is not set');
  const { data } = await readDoc(sa, env);
  const cfg = (data.kutitap_loan_reminders && data.kutitap_loan_reminders.items) || {};
  const loans = data.kutitap_loans || {};
  const S = norm(JSON.parse(JSON.stringify(data.kutitap_reminder_state || {})));
  const out = [];
  const touched = new Set(); const replaced = new Set();
  const flush = async () => {
    if (!touched.size && !flush.global) return;
    await updateState(sa, env, (cur) => {
      for (const id of touched) cur.items[id] = replaced.has(id) ? { ...S.items[id] } : { ...(cur.items[id] || {}), ...S.items[id] };
      cur.used = { ...cur.used, first: S.used.first, follow: S.used.follow, overdue: S.used.overdue };
      cur.streak = { ...S.streak };
    });
    touched.clear(); replaced.clear(); flush.global = false;
  };

  // oldest due date first, so the streak is counted in the order things happened
  const valid = Object.entries(cfg).filter(([, it]) => it && it.enabled && isYmd(it.due) && it.cat && it.rowKey && it.col)
    .sort((a, b) => a[1].due.localeCompare(b[1].due));

  // pass 1: refresh each item's state, then settle the on-time streak
  const info = {};
  for (const [id, it] of valid) {
    info[id] = loanInfo(loans, it);
    const had = S.items[id];
    const fresh = !had || had.due !== it.due;                      // a new due date starts the schedule fresh
    const st = fresh ? { due: it.due } : had;
    const skip = info[id].paid ? 'paid' : info[id].ok ? '' : 'missing';
    if (fresh || (st.skip || '') !== skip) { st.skip = skip; S.items[id] = st; touched.add(id); if (fresh) replaced.add(id); }
    S.items[id] = st;
    if (st.settled || skip === 'missing') continue;
    if (it.setAt && it.setAt > it.due) { st.settled = 'ignored'; touched.add(id); continue; }   // set up after its due date: not counted
    if (skip === 'paid') {
      const paidOn = isYmd(it.paidOn) ? it.paidOn : st.paidAt ? manilaToday(new Date(st.paidAt)) : today;
      if (paidOn <= it.due) { st.settled = 'ontime'; S.streak.count = (S.streak.count || 0) + 1; }
      else { st.settled = 'late'; S.streak.count = 0; }
      touched.add(id); flush.global = true;
    } else if (today > it.due) {
      st.settled = 'missed'; S.streak.count = 0; touched.add(id); flush.global = true;
    }
  }
  await flush();

  // pass 2: send what is due today (or log that it was cancelled because the loan is Paid)
  for (const [id, it] of valid) {
    const st = S.items[id]; const inf = info[id];
    const slots = [['first', addDays(it.due, -2), 'firstSent'], ['follow', it.due, 'followSent'], ['overdue', addDays(it.due, 1), 'overdueSent']];
    for (const [kind, day, sentKey] of slots) {
      if (today !== day || st[sentKey]) continue;
      const lid = logIdFor(id, it.due, kind);
      const tab = tabLabel(it.cat);
      if (st.skip) {
        st.cancelLogged = { ...(st.cancelLogged || {}) };
        if (!st.cancelLogged[kind]) {
          st.cancelLogged[kind] = true; touched.add(id);
          await safeLog(sa, env, lid, { ts: now.toISOString(), itemId: id, name: it.col, tab, cat: it.cat, kind, status: 'cancelled', reason: st.skip, amount: inf.amount, due: it.due, tpl: 0 });
          out.push({ id, action: 'cancelled', kind, why: st.skip });
        }
        continue;
      }
      const pool = POOLS[kind];
      const pick = pickTemplate(pool, S.used[kind], rand);
      const d = { name: it.col, amountText: peso(inf.amount), tab, dueText: prettyDate(it.due), cutoffText: cutoffText(it.rowKey) };
      const r = render(pool[pick.index], { name: d.name, amount: d.amountText, tab, due: d.dueText });
      const exp = Date.parse(it.due + 'T00:00:00Z') + 20 * 86400000;
      const mk = (a) => `${base}/api/reminder-action?t=${signToken({ c: it.cat, r: it.rowKey, o: it.col, a, k: kind, d: it.due, l: lid, e: exp }, key)}`;
      const { html, text } = buildEmail({ kind, d, r, links: { paid: mk('paid'), again: mk('again') }, imgBase: base, streak: S.streak.count || 0 });
      try { await mail({ env, subject: r.subject, html, text }); }
      catch (e) { out.push({ id, action: 'error', kind, error: e.message }); continue; }
      S.used[kind] = pick.used; st[sentKey] = now.toISOString(); st[kind + 'Tpl'] = pick.index + 1;
      touched.add(id); flush.global = true;
      await flush();
      await safeLog(sa, env, lid, { ts: now.toISOString(), itemId: id, name: it.col, tab, cat: it.cat, kind, status: 'sent', amount: inf.amount, due: it.due, tpl: pick.index + 1 });
      out.push({ id, action: 'sent', kind, template: pick.index + 1, subject: r.subject });
    }
  }
  await flush();

  // pass 3: loans whose every installment is now Paid
  const seen = new Set();
  for (const [, it] of valid) {
    const k = `${it.cat}~${it.col}`;
    if (seen.has(k)) continue; seen.add(k);
    try { const b = await maybeBoss({ sa, env, cat: it.cat, col: it.col, mail, rand, now }); if (b) out.push({ id: k, action: 'sent', kind: 'boss', template: b.template }); }
    catch (e) { out.push({ id: k, action: 'error', kind: 'boss', error: e.message }); }
  }
  return { today, streak: S.streak.count || 0, results: out };
}
