// Runs once a day (see vercel.json). Vercel adds `Authorization: Bearer <CRON_SECRET>` to its own cron calls.
import { timingSafeEqual } from 'node:crypto';
import { runReminders } from './_lib/runner.js';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET || '';
  const got = String(req.headers.authorization || '');
  const want = `Bearer ${secret}`;
  const ok = secret.length >= 16 && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  try {
    const r = await runReminders();
    const sent = r.results.filter((x) => x.action === 'sent').length;
    console.log(`reminders ${r.today}: sent ${sent}`);           // no loan names or amounts are logged
    return res.status(200).json({ today: r.today, sent, errors: r.results.filter((x) => x.action === 'error').length });
  } catch (e) {
    console.error('reminders failed:', e.message);
    return res.status(500).json({ error: 'failed' });
  }
}
