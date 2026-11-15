// Handles the buttons inside the reminder emails. Links are signed and expire; "Paid" asks for one confirming tap
// (so an email scanner opening the link can never mark a loan paid by itself).
import { readServiceAccount, signingKey, mutate, seg } from './_lib/firestore.js';
import { verifyToken } from './_lib/token.js';
import { loanInfo, maybeBoss, safeLog } from './_lib/runner.js';
import { pageHtml } from './_lib/emailHtml.js';

const send = (res, code, html) => { res.status(code).setHeader('Content-Type', 'text/html; charset=utf-8').setHeader('Cache-Control', 'no-store').send(html); };

export default async function handler(req, res) {
  let sa;
  try { sa = readServiceAccount(); } catch { return send(res, 500, pageHtml({ title: 'Not set up yet', message: 'The reminder service is not configured.', tone: 'warn' })); }
  const t = String(req.query?.t || '');
  const p = verifyToken(t, signingKey(sa));
  if (!p || !['paid', 'again'].includes(p.a) || !p.c || !p.r || !p.o) {
    return send(res, 400, pageHtml({ title: 'This link does not work', message: 'It may have expired or been changed. Open the Kutitap app to update your loan.', tone: 'warn' }));
  }
  const id = [p.c, p.r, p.o].join('~').replace(/[^\w ~-]/g, '_');
  // find the matching reminder id saved by the app so the state lines up
  const stamp = new Date().toISOString();

  if (p.a === 'again') {
    try {
      await mutate(sa, (data) => {
        const key = Object.keys(data.kutitap_loan_reminders?.items || {}).find((k) => { const i = data.kutitap_loan_reminders.items[k]; return i.cat === p.c && i.rowKey === p.r && i.col === p.o; }) || id;
        const s = data.kutitap_reminder_state || {}; s.items = s.items || {}; s.used = s.used || { first: [], follow: [] };
        s.items[key] = { ...(s.items[key] || {}), again: stamp };
        return [{ path: 'kutitap_reminder_state', value: s }];
      });
    } catch { return send(res, 500, pageHtml({ title: 'Something went wrong', message: 'Please try the button again in a moment.', tone: 'warn' })); }
    if (p.l) await safeLog(sa, process.env, p.l, { status: 'snoozed', updatedAt: stamp });
    return send(res, 200, pageHtml({ title: 'Quest accepted!', message: 'Kutitap will remind you again on the due date.' }));
  }

  // paid
  if (req.method !== 'POST') {
    const form = `<form method="POST" action="/api/reminder-action?t=${encodeURIComponent(t)}"><button type="submit">Yes, mark as paid</button></form>`;
    return send(res, 200, pageHtml({ title: 'Mark this quest as paid?', message: `${p.o} will be marked Paid in your tracker and the follow-up email is cancelled.`, form }));
  }
  try {
    let missing = false;
    await mutate(sa, (data) => {
      const loans = data.kutitap_loans || {};
      const info = loanInfo(loans, { cat: p.c, rowKey: p.r, col: p.o });
      if (!info.ok) { missing = true; return []; }
      const key = Object.keys(data.kutitap_loan_reminders?.items || {}).find((k) => { const i = data.kutitap_loan_reminders.items[k]; return i.cat === p.c && i.rowKey === p.r && i.col === p.o; }) || id;
      const s = data.kutitap_reminder_state || {}; s.items = s.items || {}; s.used = s.used || { first: [], follow: [] };
      s.items[key] = { ...(s.items[key] || {}), skip: 'paid', paidVia: 'email', paidAt: stamp };
      return [
        { path: `kutitap_loans.${seg(p.c)}.paidCells.${seg(p.r)}.${seg(p.o)}`, value: true },
        { path: 'kutitap_reminder_state', value: s },
      ];
    });
    if (missing) return send(res, 404, pageHtml({ title: 'Quest not found', message: 'That loan entry is no longer in the tracker.', tone: 'warn' }));
  } catch { return send(res, 500, pageHtml({ title: 'Something went wrong', message: 'Please try the button again in a moment.', tone: 'warn' })); }
  if (p.l) await safeLog(sa, process.env, p.l, { status: 'paid', updatedAt: stamp });
  let boss = null;
  try { boss = await maybeBoss({ sa, cat: p.c, col: p.o }); } catch (e) { console.error('boss email failed:', e.message); }
  return send(res, 200, pageHtml({ title: boss ? 'Boss defeated!' : 'Quest complete!', message: boss ? 'Final installment paid. Marked as Paid in your tracker, and a victory email is on its way.' : 'Marked as Paid in your tracker. No more reminders for this loan.' }));
}
