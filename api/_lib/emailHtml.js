// Quest-envelope email. Table layout + inline CSS so Gmail renders it; matches the tracker's cream / pink / green pixel look.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const INK = '#4a1d36', CREAM = '#fff3d4', PAPER = '#fffdf3', BUTTER = '#ffe9a8', PINK = '#f0589a', ACCENT = '#c2306b', MUTED = '#8a5a74', MINT = '#9be58a', GREEN = '#6fd25a';
const FONT = "'Courier New',Courier,monospace";

const btn = (href, label, bg, color) => `
<td align="center" style="padding:6px 6px 6px 0">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${INK};padding:0 4px 4px 0">
    <a href="${esc(href)}" target="_blank" style="display:block;background:${bg};color:${color};border:3px solid ${INK};padding:11px 22px;font-family:${FONT};font-size:15px;font-weight:bold;text-decoration:none;letter-spacing:.5px">${esc(label)}</a>
  </td></tr></table>
</td>`;

const row = (label, value, strong) => `
<tr>
  <td style="padding:8px 12px;border-bottom:2px dashed #e8c76e;font-family:${FONT};font-size:12px;color:${MUTED};width:38%;vertical-align:top">${esc(label)}</td>
  <td style="padding:8px 12px;border-bottom:2px dashed #e8c76e;font-family:${FONT};font-size:${strong ? 18 : 15}px;color:${strong ? ACCENT : INK};font-weight:bold;vertical-align:top">${esc(value)}</td>
</tr>`;

// kind: 'first' | 'follow'.  d: { name, amountText, tab, dueText, cutoffText }.  r: rendered template { title, body, sign }
export function buildEmail({ kind, d, r, links, imgBase }) {
  const first = kind === 'first';
  const badge = first ? 'First reminder · due in 2 days' : 'Final reminder · due today';
  const buttons = first
    ? btn(links.paid, 'Paid', MINT, INK) + btn(links.again, 'Remind me again', PINK, '#ffffff')
    : btn(links.paid, 'Paid', MINT, INK);
  const pre = `${d.name}: ${d.amountText} due ${d.dueText}`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.title)}</title></head>
<body style="margin:0;padding:0;background:#8fdc6e">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#8fdc6e"><tr><td align="center" style="padding:28px 12px">
 <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px"><tr><td style="background:${INK};padding:0 8px 8px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};border:4px solid ${INK}">
   <tr><td style="background:${PINK};padding:10px 16px;border-bottom:4px solid ${INK}">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
       <td style="font-family:${FONT};font-size:13px;color:#ffffff;font-weight:bold;letter-spacing:1px">Kutitap - Your Kash Kasama</td>
       <td align="right" style="font-family:${FONT};font-size:12px;color:#ffffff">Quest board</td>
     </tr></table>
   </td></tr>
   <tr><td align="center" style="padding:22px 20px 6px">
     <img src="${esc(imgBase)}/email/envelope.png" width="144" height="96" alt="Quest envelope" style="display:block;border:0;width:144px;height:96px">
     <div style="margin-top:12px;display:inline-block;background:${BUTTER};border:3px solid ${INK};padding:4px 12px;font-family:${FONT};font-size:12px;color:${INK};font-weight:bold">${esc(badge)}</div>
   </td></tr>
   <tr><td align="center" style="padding:10px 24px 4px;font-family:${FONT};font-size:25px;line-height:30px;color:${ACCENT};font-weight:bold">${esc(r.title)}</td></tr>
   <tr><td style="padding:8px 28px 16px;font-family:${FONT};font-size:15px;line-height:23px;color:${INK}">${esc(r.body)}</td></tr>
   <tr><td style="padding:0 24px 8px">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};border:3px solid ${INK}">
       <tr><td colspan="2" style="background:${INK};padding:6px 12px;font-family:${FONT};font-size:12px;color:${BUTTER};font-weight:bold;letter-spacing:1px">Quest details</td></tr>
       ${row('Quest (loan)', d.name, false)}
       ${row('Amount due', d.amountText, true)}
       ${row('Guild (sub-tab)', d.tab, false)}
       ${row('Due date', d.dueText, false)}
       <tr><td style="padding:8px 12px;font-family:${FONT};font-size:12px;color:${MUTED};vertical-align:top">Tracker row</td><td style="padding:8px 12px;font-family:${FONT};font-size:13px;color:${INK};vertical-align:top">${esc(d.cutoffText)}</td></tr>
     </table>
   </td></tr>
   <tr><td align="center" style="padding:14px 24px 4px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${buttons}</tr></table></td></tr>
   <tr><td align="center" style="padding:4px 24px 14px;font-family:${FONT};font-size:11px;color:${MUTED}">${first ? 'Tap Paid if you already settled it. Remind me again keeps the follow-up on the due date.' : 'Tap Paid once you have settled it.'}</td></tr>
   <tr><td style="padding:0 24px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:3px dashed #e8c76e"><tr>
     <td width="64" style="padding-top:14px"><img src="${esc(imgBase)}/email/kutitap-face.png" width="70" height="65" alt="Kutitap" style="display:block;border:0;width:70px;height:65px"></td>
     <td style="padding:14px 0 0 12px;font-family:${FONT};font-size:13px;color:${INK};line-height:19px">${esc(r.sign)}</td>
   </tr></table></td></tr>
   <tr><td style="background:${BUTTER};border-top:4px solid ${INK};padding:9px 16px;font-family:${FONT};font-size:11px;color:${MUTED};text-align:center">Turn reminders off anytime in the app: Loans tab, Email Reminders.</td></tr>
  </table>
 </td></tr></table>
</td></tr></table>
</body></html>`;
  const text = [
    r.title, '', r.body, '',
    `Quest (loan): ${d.name}`, `Amount due: ${d.amountText}`, `Guild (sub-tab): ${d.tab}`, `Due date: ${d.dueText}`, `Tracker row: ${d.cutoffText}`, '',
    `Paid: ${links.paid}`, ...(first ? [`Remind me again: ${links.again}`] : []), '', r.sign,
  ].join('\n');
  return { html, text };
}

// small themed page shown after tapping an email button
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
