// Builds the printable "Independent Contractor Invoice" (Letter, 612 x 792 pt) so it matches the
// Boostability Google Sheets invoice template: Roboto, #2d3744 bars, #fdbe5a header, #283592 labels.
// Coordinates are in points and were measured from the template's own PDF export.
const ROBOTO_LINK = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap">';

export const buildInvoiceHtml = ({ monthName, year, weeks, totalHours, payText, fontCss = '', fontLink = ROBOTO_LINK }) => {
  const A = (cls, top, html, extra = '') => `<div class="a ${cls}" style="top:${top}pt;${extra}">${html}</div>`;
  const box = (top, h) => `<div class="a bx" style="top:${top}pt;height:${h}pt"></div>`;
  const labels = [
    [111.4, 'INVOICE TO:'], [121.7, '<span style="margin-right:1.6pt">INVOICE DATE:</span>'], [153.8, 'NAME:'], [165.4, 'PHONE NUMBER:'], [177.1, 'EMAIL:'], [188.8, 'ADDRESS:'],
    [233.6, 'HOURLY RATE ($USD) :'], [245.2, 'BANK NAME:'], [256.9, 'ACCOUNT NAME:'], [268.6, 'ACCOUNT NUMBER:'], [280.3, 'SWIFT NUMBER:'],
  ];
  const values = [
    [111.4, 'Boostability'], [121.7, `${monthName}-${year}`], [153.8, 'Hannah Mae Pascaran'], [165.4, '09950281082'], [177.1, 'hannahmae.pascaran@gmail.com'],
    [186.6, 'Block 14 Lot 15 Daphne Road Molino<br>Parkhomes Queen\'s Row West Bacoor City<br>4102, Cavite Philippines'],
    [233.2, '$7.50'], [245.2, 'GoTyme Bank'], [256.9, 'Hannah Mae Pascaran'], [268.6, '010680295154'], [280.3, 'GOTYPHM2XXX'],
    [294.1, '21st Floor Giga Tower, Bridgetowne, C5<br>Road, Brgy Ugong Norte, E. Rodriguez Jr.<br>Ave 1110 Quezon City, Philippines'],
  ];
  const boxes = [[118.8, 10.7], [161, 11.8], [172.8, 11.7], [184.5, 24.7], [240.8, 11.7], [252.5, 11.7], [264.2, 11.6], [275.8, 11.7], [287.5, 29.3]];
  const cols = [[134.8, 142.4], [277.2, 137.8], [415, 62.2]];
  const rowH = 16.6;
  const rows = Array.from({ length: 7 }, (_, i) => weeks[i] || null);
  const cell = (c, top, h, cls, html, st = '') => `<div class="a ce ${cls}" style="left:${cols[c][0]}pt;width:${cols[c][1]}pt;top:${top}pt;height:${h}pt;${st}">${html}</div>`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Hannah Mae Pascaran - ${monthName}, ${year} Invoice</title>
${fontLink}
<style>
${fontCss}
@page { size: 612pt 792pt; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 612pt; height: 792pt; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: Roboto, Arial, Helvetica, sans-serif; font-size: 6.3pt; line-height: 7.4pt; color: #666; position: relative; overflow: hidden; }
.a { position: absolute; white-space: nowrap; margin-top: .7pt; }
.a[style*="background"], .a[style*="border:"], .bx { margin-top: 0; }
.l { right: 401pt; text-align: right; font-weight: 700; }
.v { left: 216pt; }
.bx { left: 214pt; width: 123.5pt; background: #f3f3f3; border: .5pt solid #ccc; }
.bk { border-color: #000; }
.sec { left: 136.2pt; font-weight: 700; color: #283592; }
.ce { display: flex; align-items: center; justify-content: center; text-align: center; }
.th { font-weight: 700; color: #2a3990; font-size: 6.9pt; line-height: 8.1pt; }
.tt { right: 199pt; text-align: right; font-weight: 700; color: #283592; font-size: 7.5pt; line-height: 8.8pt; }
.tv { left: 415pt; width: 62.2pt; text-align: center; font-weight: 700; font-size: 7.55pt; line-height: 8.8pt; color: #cc0000; }
</style></head>
<body>
${A('', 53.5, 'INDEPENDENT CONTRACTOR INVOICE', 'left:111pt;width:390pt;height:41.7pt;background:#2d3744;color:#fff;font-weight:700;font-size:8.8pt;line-height:45pt;text-align:center')}
${boxes.map(([t, h]) => box(t, h)).join('')}
${labels.map(([t, s]) => A('l', t, s)).join('')}
${A('l', 289.9, 'ADDRESS ASSOCIATED<br><span style="position:relative;left:1.5pt">WITH ACCOUNT:</span>')}
${values.map(([t, s]) => A('v', t, s)).join('')}
${A('sec', 141.7, 'CONTRACTOR INFORMATION')}
${A('sec', 223.0, 'PAYMENT INFORMATION')}
<div class="a" style="left:134.2pt;top:326.5pt;width:343.6pt;height:185.3pt;border:.5pt solid #ccc"></div>
<div class="a" style="left:134.8pt;top:327pt;width:342.4pt;height:48pt;background:#fdbe5a"></div>
${cell(0, 327, 48, 'th', 'WORK PERFORMED')}${cell(1, 327, 48, 'th', 'DATES WORKED')}${cell(2, 327, 48, 'th', 'NUMBER<br>OF HOURS<br>WORKED')}
<div class="a" style="left:134.8pt;top:375pt;width:342.4pt;height:20pt;background:#2d3744"></div>
${cell(0, 375, 20, '', 'EXAMPLE<br>Sales Call', 'color:#fff;padding-top:1.4pt')}${cell(1, 375, 20, '', 'EXAMPLE<br>Jan 5th - Jan 9th 2024', 'color:#fff;padding-top:1.4pt')}${cell(2, 375, 20, '', 'EXAMPLE<br>40', 'color:#fff;padding-top:1.4pt')}
${rows.map((w, i) => {
    const top = 395 + i * rowH;
    return `<div class="a" style="left:134.8pt;top:${top}pt;width:342.4pt;height:${rowH}pt;background:${i % 2 ? '#f3f3f3' : '#fff'}"></div>` +
      (w ? cell(0, top, rowH, '', w.workPerformed, 'padding-top:1.4pt') + cell(1, top, rowH, '', w.datesWorked, 'padding-top:1.4pt') + cell(2, top, rowH, '', w.hours, 'padding-top:1.4pt') : '');
  }).join('')}
${A('l', 526.5, 'Notes:', 'font-weight:400')}
<div class="a bx bk" style="top:520.5pt;height:17.5pt"></div>
${A('l', 560.6, 'Reason for Other Amount:', 'font-weight:400')}
<div class="a bx bk" style="top:554.5pt;height:17.5pt"></div>
${A('tt', 529.1, 'TOTAL HOURS')}${A('tt', 546.1, 'PAY FOR HOURS WORKED')}${A('tt', 563.1, 'OTHER AMOUNT')}
${A('tv', 529.1, String(totalHours), 'color:#fdbe5a')}${A('tv', 546.1, payText)}${A('tv', 563.1, '$0.00')}
<div class="a" style="left:111pt;top:581.2pt;width:390pt;height:20pt;background:#2d3744;border:.5pt solid #999"></div>
${A('tt', 587.3, 'TOTAL PAYMENT OWED', 'color:#fff;font-size:8.62pt;line-height:10.3pt')}
${A('tv', 587.3, payText, 'color:#fdbe5a;font-size:8.8pt;line-height:10.3pt')}
${A('', 609.9, '<b>Payment Schedule:</b><br>Your payment will be processed by the 5th business day of each month. It may take an additional few days to appear in<br>your account, depending on your bank.<br><br><b>Monthly Invoices:</b><br>Please submit a detailed invoice by 5pm MST on the first business day of the following month in order for payment to be<br>processed by the 5th business day.<br><br><b>Early Invoices:</b><br>Invoices submitted before the end of the month will not be accepted.', 'left:136.2pt')}
${A('', 696.8, 'Email your invoice (using your Boostability email address) to ap@boostability.com and<br>Cc the Team Lead you work with for their review', 'left:111pt;width:390pt;text-align:center;font-weight:700;color:#283592')}
<div class="a" style="left:414.5pt;top:714.8pt;width:86.5pt;height:23.7pt;border:.5pt solid #ccc"></div>
<script>
  const go = () => window.print();
  (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve()).then(() => setTimeout(go, 150));
</script>
</body></html>`;
};
