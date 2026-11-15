// Quest-envelope email. Table layout + inline CSS so Gmail renders it; matches the tracker's cream / pink / green pixel look.
// kinds: first | follow | overdue (red alert theme) | boss (victory)
const FONT = "'Courier New',Courier,monospace";
const THEMES = {
  normal:  { ink: '#4a1d36', cream: '#fff3d4', paper: '#fffdf3', butter: '#ffe9a8', head: '#f0589a', accent: '#c2306b', muted: '#8a5a74', dash: '#e8c76e', outer: '#8fdc6e', env: 'envelope.png', btnA: '#9be58a', btnB: '#f0589a' },
  alert:   { ink: '#5a0a16', cream: '#fff0ef', paper: '#fffafa', butter: '#ffd6d6', head: '#c4122f', accent: '#c4122f', muted: '#8a3a46', dash: '#ef9a9f', outer: '#f08a8a', env: 'envelope-red.png', btnA: '#9be58a', btnB: '#c4122f' },
  victory: { ink: '#1f4a2c', cream: '#f4ffe9', paper: '#fbfff5', butter: '#fff0a8', head: '#2f9e5b', accent: '#1f7a4a', muted: '#4f7a5a', dash: '#a9d98a', outer: '#8fdc6e', env: 'trophy.png', btnA: '#9be58a', btnB: '#f0589a' },
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildEmail({ kind, d, r, links = {}, imgBase, streak = 0 }) {
  const theme = kind === 'overdue' ? 'alert' : kind === 'boss' ? 'victory' : 'normal';
  const T = THEMES[theme];
  const btn = (href, label, bg, color) => `
<td align="center" style="padding:6px 6px 6px 0">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${T.ink};padding:0 4px 4px 0">
    <a href="${esc(href)}" target="_blank" style="display:block;background:${bg};color:${color};border:3px solid ${T.ink};padding:11px 22px;font-family:${FONT};font-size:15px;font-weight:bold;text-decoration:none;letter-spacing:.5px">${esc(label)}</a>
  </td></tr></table>
</td>`;
  const row = (label, value, strong) => `
<tr>
  <td style="padding:8px 12px;border-bottom:2px dashed ${T.dash};font-family:${FONT};font-size:12px;color:${T.muted};width:38%;vertical-align:top">${esc(label)}</td>
  <td style="padding:8px 12px;border-bottom:2px dashed ${T.dash};font-family:${FONT};font-size:${strong ? 18 : 15}px;color:${strong ? T.accent : T.ink};font-weight:bold;vertical-align:top">${esc(value)}</td>
</tr>`;

  const badge = { first: 'First reminder · due in 2 days', follow: 'Final reminder · due today', overdue: 'Red alert · 1 day overdue', boss: 'Boss defeated · loan cleared' }[kind];
  const buttons = kind === 'first' ? btn(links.paid, 'Paid', T.btnA, T.ink) + btn(links.again, 'Remind me again', T.btnB, '#ffffff')
    : kind === 'boss' ? '' : btn(links.paid, 'Paid', T.btnA, T.ink);
  const hint = { first: 'Tap Paid if you already settled it. Remind me again keeps the follow-up on the due date.', follow: 'Tap Paid once you have settled it.', overdue: 'Tap Paid once you have settled it. Kutitap will stop the alerts.', boss: '' }[kind];
  const rows = kind === 'boss'
    ? row('Quest (loan)', d.name, false) + row('Total cleared', d.totalText, true) + row('Guild (sub-tab)', d.tab, false)
      + `<tr><td style="padding:8px 12px;font-family:${FONT};font-size:12px;color:${T.muted};vertical-align:top">Installments</td><td style="padding:8px 12px;font-family:${FONT};font-size:13px;color:${T.ink};vertical-align:top">${esc(d.countText)}</td></tr>`
    : row('Quest (loan)', d.name, false) + row('Amount due', d.amountText, true) + row('Guild (sub-tab)', d.tab, false) + row('Due date', d.dueText, false)
      + `<tr><td style="padding:8px 12px;font-family:${FONT};font-size:12px;color:${T.muted};vertical-align:top">Tracker row</td><td style="padding:8px 12px;font-family:${FONT};font-size:13px;color:${T.ink};vertical-align:top">${esc(d.cutoffText)}</td></tr>`;
  const streakBadge = streak >= 2
    ? `<tr><td align="center" style="padding:0 24px 14px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${T.ink};padding:0 3px 3px 0"><div style="background:${T.butter};border:3px solid ${T.ink};padding:5px 12px;font-family:${FONT};font-size:12px;font-weight:bold;color:${T.ink}">&#128293; ${streak}-Quest On-Time Streak</div></td></tr></table></td></tr>` : '';
  const dims = kind === 'boss' ? 'width="112" height="112" style="display:block;border:0;width:112px;height:112px"' : 'width="144" height="96" style="display:block;border:0;width:144px;height:96px"';
  const pre = kind === 'boss' ? `${d.name} cleared: ${d.totalText}` : `${d.name}: ${d.amountText} due ${d.dueText}`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.title)}</title></head>
<body style="margin:0;padding:0;background:${T.outer}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.outer}"><tr><td align="center" style="padding:28px 12px">
 <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px"><tr><td style="background:${T.ink};padding:0 8px 8px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.cream};border:4px solid ${T.ink}">
   <tr><td style="background:${T.head};padding:10px 16px;border-bottom:4px solid ${T.ink}">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
       <td style="font-family:${FONT};font-size:13px;color:#ffffff;font-weight:bold;letter-spacing:1px">Kutitap - Your Kash Kasama</td>
       <td align="right" style="font-family:${FONT};font-size:12px;color:#ffffff">${kind === 'overdue' ? 'Red alert' : kind === 'boss' ? 'Victory' : 'Quest board'}</td>
     </tr></table>
   </td></tr>
   <tr><td align="center" style="padding:22px 20px 6px">
     <img src="${esc(imgBase)}/email/${T.env}" ${dims} alt="Quest envelope">
     <div style="margin-top:12px;display:inline-block;background:${T.butter};border:3px solid ${T.ink};padding:4px 12px;font-family:${FONT};font-size:12px;color:${T.ink};font-weight:bold">${esc(badge)}</div>
   </td></tr>
   <tr><td align="center" style="padding:10px 24px 4px;font-family:${FONT};font-size:25px;line-height:30px;color:${T.accent};font-weight:bold">${esc(r.title)}</td></tr>
   <tr><td style="padding:8px 28px 16px;font-family:${FONT};font-size:15px;line-height:23px;color:${T.ink}">${esc(r.body)}</td></tr>
   <tr><td style="padding:0 24px 8px">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.paper};border:3px solid ${T.ink}">
       <tr><td colspan="2" style="background:${T.ink};padding:6px 12px;font-family:${FONT};font-size:12px;color:${T.butter};font-weight:bold;letter-spacing:1px">${kind === 'boss' ? 'Victory report' : 'Quest details'}</td></tr>
       ${rows}
     </table>
   </td></tr>
   ${buttons ? `<tr><td align="center" style="padding:14px 24px 4px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${buttons}</tr></table></td></tr>
   <tr><td align="center" style="padding:4px 24px 14px;font-family:${FONT};font-size:11px;color:${T.muted}">${esc(hint)}</td></tr>` : '<tr><td style="padding:6px"></td></tr>'}
   ${streakBadge}
   <tr><td style="padding:0 24px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:3px dashed ${T.dash}"><tr>
     <td width="64" style="padding-top:14px"><img src="${esc(imgBase)}/email/kutitap-face.png" width="70" height="65" alt="Kutitap" style="display:block;border:0;width:70px;height:65px"></td>
     <td style="padding:14px 0 0 12px;font-family:${FONT};font-size:13px;color:${T.ink};line-height:19px">${esc(r.sign)}</td>
   </tr></table></td></tr>
   <tr><td style="background:${T.butter};border-top:4px solid ${T.ink};padding:9px 16px;font-family:${FONT};font-size:11px;color:${T.muted};text-align:center">Turn reminders off anytime in the app: Loans tab, Email Reminders.</td></tr>
  </table>
 </td></tr></table>
</td></tr></table>
</body></html>`;
  const text = [
    r.title, '', r.body, '',
    ...(kind === 'boss'
      ? [`Quest (loan): ${d.name}`, `Total cleared: ${d.totalText}`, `Guild (sub-tab): ${d.tab}`, `Installments: ${d.countText}`]
      : [`Quest (loan): ${d.name}`, `Amount due: ${d.amountText}`, `Guild (sub-tab): ${d.tab}`, `Due date: ${d.dueText}`, `Tracker row: ${d.cutoffText}`, '', `Paid: ${links.paid}`, ...(kind === 'first' ? [`Remind me again: ${links.again}`] : [])]),
    ...(streak >= 2 ? ['', `${streak}-Quest On-Time Streak`] : []), '', r.sign,
  ].join('\n');
  return { html, text };
}

// small themed page shown after tapping an email button
const INK = '#4a1d36', CREAM = '#fff3d4', MINT = '#9be58a', ACCENT = '#c2306b';
export function pageHtml({ title, message, tone = 'ok', form }) {
  const color = tone === 'ok' ? '#1f7a4a' : tone === 'warn' ? ACCENT : ACCENT;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#8fdc6e;font-family:'Pixelify Sans','Courier New',monospace;color:${INK}}
.c{background:${INK};padding:0 8px 8px 0;margin:16px;max-width:420px;width:100%}.i{background:${CREAM};border:4px solid ${INK};padding:26px 22px;text-align:center}
h1{font-size:24px;margin:10px 0 8px;color:${color}}p{font-size:16px;line-height:1.45;margin:0 0 14px}img{width:110px;height:73px;image-rendering:pixelated}
button{font:inherit;font-size:17px;background:${MINT};color:${INK};border:3px solid ${INK};box-shadow:4px 4px 0 ${INK};padding:10px 26px;cursor:pointer}</style></head>
<body><div class="c"><div class="i"><img src="/email/envelope.png" alt=""><h1>${esc(title)}</h1><p>${esc(message)}</p>${form || ''}</div></div></body></html>`;
}
