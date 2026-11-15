import { createHmac, timingSafeEqual } from 'node:crypto';

// signed, expiring links for the email buttons: payload.signature (base64url)
export function signToken(payload, key) {
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const s = createHmac('sha256', key).update(p).digest('base64url');
  return `${p}.${s}`;
}
export function verifyToken(token, key, nowMs = Date.now()) {
  if (typeof token !== 'string' || token.length > 2000 || !token.includes('.')) return null;
  const [p, s] = token.split('.');
  const good = createHmac('sha256', key).update(p).digest('base64url');
  const a = Buffer.from(s || ''); const b = Buffer.from(good);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const o = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (!o || typeof o.e !== 'number' || o.e < nowMs) return null;
    return o;
  } catch { return null; }
}
