// Sticky-pedia: constants + helpers for the floating notes.
//
// Note schema (saved in Firebase under "kutitap_notes" as an array, max 5):
// {
//   id: string,
//   content: string,           // plain text, max 159 chars (used for the list snippet and the counter)
//   formatting: string,        // the same text as sanitized html: only <b> <i> <u> <s> <br>
//   color: 'yellow' | 'cyan' | 'green' | 'magenta' | 'orange',
//   lastUpdated: number,       // ms timestamp, changes when the text or the color changes
//   isOpen: boolean,           // is the floating note window showing
//   position: { x, y },        // window position in px
//   size: { w, h },            // window size in px
// }
export const MAX_NOTES = 5;
export const MAX_CHARS = 159;

// Notes list window = the Claw Machine window (420 x ~829 px); a note starts at 50% of it.
export const LIST_W = 420;
export const LIST_H = 829;
export const NOTE_W = Math.round(LIST_W * 0.5);
export const NOTE_H = Math.round(LIST_H * 0.5);
export const NOTE_MIN = 0.5; // a note can shrink to 50% of its default size...
export const NOTE_MAX = 1.5; // ...and grow to 150%

export const COLORS = [
  { id: 'yellow', name: 'Retro yellow', body: '#FFEE9A', head: '#F5CB45' },
  { id: 'cyan', name: 'Arcade cyan', body: '#B4F0F8', head: '#52CCE2' },
  { id: 'green', name: 'Pixel green', body: '#C4F2A8', head: '#7DD65A' },
  { id: 'magenta', name: 'Soft magenta', body: '#FFC0E0', head: '#F57FBC' },
  { id: 'orange', name: 'Classic orange', body: '#FFD3A0', head: '#F7A04B' },
];
export const colorOf = (id) => COLORS.find((c) => c.id === id) || COLORS[0];

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = (n) => String(n).padStart(2, '0');
export const stamp = (t) => {
  const d = new Date(t || Date.now());
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Keeps only bold / italic / underline / strikethrough / line breaks. Returns the safe html and its plain text.
export function cleanRich(raw) {
  const doc = new DOMParser().parseFromString(`<body>${raw || ''}</body>`, 'text/html');
  let html = '';
  let text = '';
  const tagsFor = (el) => {
    const tags = [];
    const st = el.style || {};
    const td = st.textDecorationLine || st.textDecoration || '';
    if (el.tagName === 'B' || el.tagName === 'STRONG' || st.fontWeight === 'bold' || parseInt(st.fontWeight, 10) >= 600) tags.push('b');
    if (el.tagName === 'I' || el.tagName === 'EM' || st.fontStyle === 'italic') tags.push('i');
    if (el.tagName === 'U' || td.includes('underline')) tags.push('u');
    if (el.tagName === 'S' || el.tagName === 'STRIKE' || el.tagName === 'DEL' || td.includes('line-through')) tags.push('s');
    return tags;
  };
  const walk = (node, tags) => {
    node.childNodes.forEach((ch) => {
      if (ch.nodeType === 3) {
        const t = ch.nodeValue.replace(/\u00a0/g, ' ');
        if (!t) return;
        html += tags.reduceRight((acc, tag) => `<${tag}>${acc}</${tag}>`, escapeHtml(t));
        text += t;
      } else if (ch.nodeType === 1) {
        if (ch.tagName === 'BR') { html += '<br>'; text += '\n'; return; }
        if ((ch.tagName === 'DIV' || ch.tagName === 'P') && text && !text.endsWith('\n')) { html += '<br>'; text += '\n'; }
        walk(ch, tags.concat(tagsFor(ch)));
      }
    });
  };
  walk(doc.body, []);
  // browsers keep one extra <br> at the end of the editor: it is not part of the note
  if (html.endsWith('<br>')) { html = html.slice(0, -4); text = text.slice(0, -1); }
  return { html, text };
}

// html for the editor (a trailing line break needs one extra <br> to show the empty last line)
export const editorHtml = (note) => {
  const html = note.formatting || escapeHtml(note.content || '').replace(/\n/g, '<br>');
  return html.endsWith('<br>') ? `${html}<br>` : html;
};

export const snippet = (note) => {
  const t = (note.content || '').replace(/\s+/g, ' ').trim();
  if (!t) return 'Empty note';
  const words = t.split(' ').slice(0, 9).join(' ');
  return words.length < t.length ? `${words}...` : words;
};

export const cleanNotes = (raw) => (Array.isArray(raw) ? raw : []).filter((n) => n && n.id).slice(0, MAX_NOTES);

export const newNote = (count, vw, vh) => {
  const x = clamp(Math.round(vw / 2 - NOTE_W / 2) + 26 * count, 8, Math.max(8, vw - NOTE_W - 8));
  const y = clamp(70 + 30 * count, 8, Math.max(8, vh - NOTE_H - 8));
  return {
    id: `n_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    content: '',
    formatting: '',
    color: COLORS[count % COLORS.length].id,
    lastUpdated: Date.now(),
    isOpen: true,
    position: { x, y },
    size: { w: NOTE_W, h: NOTE_H },
  };
};
