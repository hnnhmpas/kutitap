// Kutitap chat entry point. Sends the question + a small calculated summary to YOUR secured Vercel function (/api/ask),
// together with your Firebase sign-in token. The AI key never touches the browser.
// If anything fails (offline, local dev, limit reached) the built-in keyword brain answers instead.
import { auth } from './firebase';
import { answerLocal } from './kutitapChatBrain';
import { buildDigest, pickYears, manilaToday, sanitizeRate } from './kutitapDigest';

// The AI is OFF until you add VITE_AI_CHAT=on to .env (and the Vercel settings). Until then Kutitap uses the free keyword brain.
const AI_ON = import.meta.env.VITE_AI_CHAT === 'on';

export async function askKutitap(question, ctx) {
  const local = () => answerLocal(question, ctx);
  if (!AI_ON) return local();
  try {
    const user = auth.currentUser;
    if (!user) return local();
    const token = await user.getIdToken();
    const todayISO = manilaToday();
    const digest = buildDigest(ctx.data, { todayISO, years: pickYears(question, todayISO), rate: sanitizeRate(ctx.usdToPhpRate) });
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question, digest }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    let json = null;
    try { json = await res.json(); } catch (e) { json = null; }
    if (res.ok && json && typeof json.answer === 'string' && json.answer.trim()) return json.answer;
    if (res.status === 429) return `Whoa, tiny paws need a breather! Ask again in a few seconds. For now:\n${local()}`;
    return local();
  } catch (err) {
    return local();
  }
}
