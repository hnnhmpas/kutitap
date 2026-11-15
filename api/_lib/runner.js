// The daily job: decides which reminder emails are due today (Manila time), sends them, records what was sent.
import { readServiceAccount, signingKey, readDoc, mutate } from './firestore.js';
import { FIRST, FOLLOW, render, pickTemplate } from './templates.js';
import { buildEmail } from './emailHtml.js';
import { signToken } from './token.js';
import { manilaToday, addDays, isYmd, prettyDate } from './dates.js';

export const RECIPIENT = 'hannahalvarezpascaran@gmail.com';
export const SENDER_NAME = 'Kutitap - Your Kash Kasama';
const LABELS = { Atome: 'Home Credit', AtomeNew: 'Atome' };
export const tabLabel = (cat) => LABELS[cat] || cat;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const peso = (n) => '₱' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const siteUrl = (env) => (env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + env.VERCEL_PROJECT_PRODUCTION_URL : '')).replace(/\/+$/, '');

// current state of one reminder item against the saved loans
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

// merge one item's state changes (and the rotation lists) into the saved reminder state, re-reading first so nothing is lost
const commit = (sa, env, id, patch, usedPatch, replace = false) => mutate(sa, (data) => {
  const s = data.kutitap_reminder_state && typeof data.kutitap_reminder_state === 'object' ? data.kutitap_reminder_state : {};
  s.items = s.items || {}; s.used = s.used || { first: [], follow: [] };
  s.items[id] = replace ? { ...patch } : { ...(s.items[id] || {}), ...patch };
  if (usedPatch) s.used = { ...s.used, ...usedPatch };
  return [{ path: 'kutitap_reminder_state', value: s }];
}, env);

export async function runReminders({ env = process.env, now = new Date(), mail = sendMail, rand = Math.random } = {}) {
  const sa = readServiceAccount(env);
  const key = signingKey(sa);
  const today = manilaToday(now);
  const base = siteUrl(env);
  if (!base) throw new Error('SITE_URL is not set');
  const { data } = await readDoc(sa, env);
  const items = (data.kutitap_loan_reminders && data.kutitap_loan_reminders.items) || {};
  const loans = data.kutitap_loans || {};
  const state = data.kutitap_reminder_state || {};
  const used = { first: [...(state.used?.first || [])], follow: [...(state.used?.follow || [])] };
  const out = [];

  for (const [id, it] of Object.entries(items)) {
    if (!it || !it.enabled || !isYmd(it.due) || !it.cat || !it.rowKey || !it.col) continue;
    const info = loanInfo(loans, it);
    let st = state.items?.[id];
    if (!st || st.due !== it.due) st = { due: it.due };            // a new due date starts the schedule fresh
    const skip = info.paid ? 'paid' : info.ok ? '' : 'missing';
    const fresh = !state.items?.[id] || state.items[id].due !== it.due;
    if (fresh || (st.skip || '') !== skip) {
      await commit(sa, env, id, { ...st, skip }, null, fresh);    // remember why a loan is not being reminded (Paid -> cancelled)
      st = { ...st, skip };
    }
    if (skip) { out.push({ id, action: 'cancelled', why: skip }); continue; }

    for (const kind of ['first', 'follow']) {
      const day = kind === 'first' ? addDays(it.due, -2) : it.due;
      const sentKey = kind === 'first' ? 'firstSent' : 'followSent';
      if (today !== day || st[sentKey]) continue;
      const pool = kind === 'first' ? FIRST : FOLLOW;
      const pick = pickTemplate(pool, used[kind], rand);
      const d = { name: it.col, amountText: peso(info.amount), tab: tabLabel(it.cat), dueText: prettyDate(it.due), cutoffText: cutoffText(it.rowKey) };
      const r = render(pool[pick.index], { name: d.name, amount: d.amountText, tab: d.tab, due: d.dueText });
      const exp = Date.parse(it.due + 'T00:00:00Z') + 20 * 86400000;
      const mk = (a) => `${base}/api/reminder-action?t=${signToken({ c: it.cat, r: it.rowKey, o: it.col, a, k: kind, d: it.due, e: exp }, key)}`;
      const links = { paid: mk('paid'), again: mk('again') };
      const { html, text } = buildEmail({ kind, d, r, links, imgBase: base });
      try {
        await mail({ env, subject: r.subject, html, text });
      } catch (e) { out.push({ id, action: 'error', kind, error: e.message }); continue; }
      used[kind] = pick.used;
      st = { ...st, [sentKey]: now.toISOString(), [kind === 'first' ? 'firstTpl' : 'followTpl']: pick.index + 1 };
      await commit(sa, env, id, st, { [kind]: pick.used });
      out.push({ id, action: 'sent', kind, template: pick.index + 1, subject: r.subject });
    }
  }
  return { today, results: out };
}
