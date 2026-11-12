// The chat lives in this browser TAB only (sessionStorage): it survives a refresh, and it is wiped automatically
// when the tab or window is closed. It is never sent to Firebase and never written to localStorage.
export const CHAT_SESSION_KEY = 'kutitap_chat_session';
export const CHAT_OPEN_KEY = 'kutitap_chat_open';

export function loadChatSession() {
  try {
    const j = JSON.parse(sessionStorage.getItem(CHAT_SESSION_KEY) || 'null');
    if (Array.isArray(j) && j.length && j.every((m) => m && typeof m.text === 'string' && (m.from === 'u' || m.from === 'k'))) return j.slice(-80);
  } catch (e) { /* ignore */ }
  return null;
}
export function saveChatSession(msgs) {
  try { if (msgs && msgs.length) sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(msgs.slice(-80))); else sessionStorage.removeItem(CHAT_SESSION_KEY); } catch (e) { /* ignore */ }
}
export function readChatOpen() {
  try { return sessionStorage.getItem(CHAT_OPEN_KEY) === '1'; } catch (e) { return false; }
}
export function saveChatOpen(open) {
  try { sessionStorage.setItem(CHAT_OPEN_KEY, open ? '1' : '0'); } catch (e) { /* ignore */ }
}
export function clearChatSession() {
  try { sessionStorage.removeItem(CHAT_SESSION_KEY); sessionStorage.removeItem(CHAT_OPEN_KEY); } catch (e) { /* ignore */ }
}
