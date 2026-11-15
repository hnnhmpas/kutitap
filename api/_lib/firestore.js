// Tiny Firestore REST client (no npm packages). Uses a Firebase service account, which works on the free Spark plan.
import { createSign, createHash } from 'node:crypto';

const b64u = (b) => Buffer.from(b).toString('base64url');

export function readServiceAccount(env = process.env) {
  const raw = env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  let sa;
  try { sa = JSON.parse(raw); } catch { throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON'); }
  if (!sa.client_email || !sa.private_key) throw new Error('FIREBASE_SERVICE_ACCOUNT is missing client_email / private_key');
  sa.private_key = String(sa.private_key).replace(/\\n/g, '\n');
  return sa;
}

// secret used to sign the email buttons; derived from the service account key so no extra setting is needed
export function signingKey(sa) {
  return createHash('sha256').update('kutitap-reminder|' + sa.private_key).digest();
}

let tokenCache = { value: '', exp: 0 };
async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.value && tokenCache.exp - 60 > now) return tokenCache.value;
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }),
  });
  if (!r.ok) throw new Error('google token failed ' + r.status);
  const j = await r.json();
  tokenCache = { value: j.access_token, exp: now + (j.expires_in || 3600) };
  return tokenCache.value;
}

// ---- Firestore typed values <-> plain JS ----
export function fromFs(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFs);
  if ('mapValue' in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = fromFs(x); return o; }
  return null;
}
export function toFs(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(toFs) } };
  const fields = {};
  for (const [k, v] of Object.entries(x)) if (v !== undefined) fields[k] = toFs(v);
  return { mapValue: { fields } };
}
// field path segment, quoted when it has anything but letters, digits and underscore
export const seg = (s) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? s : '`' + String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`');

const docUrl = (sa, env) => {
  const pid = env.FIREBASE_PROJECT_ID || sa.project_id;
  return `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/financeTracker/user_data`;
};

// read the tracker document -> { data: {key: value}, updateTime }
export async function readDoc(sa, env = process.env) {
  const t = await accessToken(sa);
  const r = await fetch(docUrl(sa, env), { headers: { Authorization: `Bearer ${t}` } });
  if (r.status === 404) return { data: {}, updateTime: null };
  if (!r.ok) throw new Error('firestore read failed ' + r.status);
  const j = await r.json();
  const data = {};
  for (const [k, v] of Object.entries(j.fields || {})) data[k] = fromFs(v);
  return { data, updateTime: j.updateTime };
}

// write only the given field paths. writes = [{ path: 'kutitap_reminder_state' | 'a.`b c`.d', value }]
// `updateTime` makes the write fail (409) if someone else changed the document meanwhile.
export async function writePaths(sa, writes, updateTime, env = process.env) {
  const t = await accessToken(sa);
  const fields = {};
  const mask = [];
  for (const { path, value } of writes) {
    mask.push(path);
    // build the nested typed value that matches the path (segments are already quoted)
    const parts = path.match(/`(?:\\.|[^`])*`|[^.]+/g).map((p) => (p.startsWith('`') ? p.slice(1, -1).replace(/\\(.)/g, '$1') : p));
    let node = fields;
    parts.forEach((p, i) => {
      if (i === parts.length - 1) node[p] = toFs(value);
      else { node[p] = node[p] || { mapValue: { fields: {} } }; node = node[p].mapValue.fields; }
    });
  }
  const qs = mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&')
    + (updateTime ? '&currentDocument.updateTime=' + encodeURIComponent(updateTime) : '');
  const r = await fetch(`${docUrl(sa, env)}?${qs}`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }),
  });
  if (r.status === 409 || r.status === 400 && (await r.clone().text()).includes('FAILED_PRECONDITION')) { const e = new Error('conflict'); e.conflict = true; throw e; }
  if (!r.ok) throw new Error('firestore write failed ' + r.status);
}

// read -> compute writes -> write, retrying when the document changed in between
export async function mutate(sa, compute, env = process.env, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const { data, updateTime } = await readDoc(sa, env);
    const writes = await compute(data);
    if (!writes || !writes.length) return data;
    try { await writePaths(sa, writes, updateTime, env); return data; }
    catch (e) { if (!e.conflict || i === tries - 1) throw e; }
  }
}

// Reminder log documents: financeTracker/user_data/reminderLogs/<id>. Only the fields given are written (others kept).
export async function writeLog(sa, id, fields, env = process.env) {
  const t = await accessToken(sa);
  const pid = env.FIREBASE_PROJECT_ID || sa.project_id;
  const url = `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/financeTracker/user_data/reminderLogs/${encodeURIComponent(id)}`;
  const mask = Object.keys(fields).map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const body = { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toFs(v)])) };
  const r = await fetch(`${url}?${mask}`, { method: 'PATCH', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('log write failed ' + r.status);
}
