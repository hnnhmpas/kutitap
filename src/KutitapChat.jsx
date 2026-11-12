// KUTITAP CHAT: a small support-style chat box beside the chat button. Ask Kutitap anything that is in the tracker.
//  - Minimize (the dash) hides the box but keeps the conversation. Close (the X) ends the chat and deletes it.
//  - The conversation survives a page refresh but is gone once the tab/window is closed (see chatSession.js).
import React, { useEffect, useRef, useState } from 'react';
import './KutitapChat.css';
import kutitapFace from './assets/ui/kutitap-chat-face.png';
import bunnyFace from './assets/pixel/bunny.png';
import { greetingFor, SUGGESTIONS } from './kutitapChatBrain';
import { askKutitap } from './kutitapAI';
import { loadChatSession, saveChatSession, clearChatSession } from './chatSession';

const CLOSE_MS = 240;

function ChatWindow({ shown, msgs, typing, draft, setDraft, send, onMinimize, onEnd }) {
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, typing, shown]);
  useEffect(() => {
    if (!shown) return undefined;
    const t = setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 200);
    return () => clearTimeout(t);
  }, [shown]);

  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onMinimize(); } };

  return (
    <div className={`kchat${shown ? ' kchat-in' : ''}`} role="dialog" aria-label="Chat with Kutitap" onKeyDown={onKey}>
      <div className="kchat-head">
        <span className="kchat-ava head"><img src={kutitapFace} alt="" draggable="false" /></span>
        <span className="kchat-title"><span className="kchat-name">Kutitap</span><span className="kchat-sub">Your Kash Kasama</span></span>
        <button type="button" className="kchat-hbtn kchat-min" onClick={onMinimize} aria-label="Minimize chat" title="Minimize (keeps this chat)"><i /></button>
        <button type="button" className="kchat-hbtn kchat-x" onClick={onEnd} aria-label="Close and delete chat" title="Close (deletes this chat)"><i /></button>
      </div>
      <div className="kchat-body" ref={bodyRef} aria-live="polite">
        {msgs.map((m) => (
          <div key={m.id} className={`kchat-row ${m.from === 'u' ? 'me' : 'bot'}`}>
            <span className="kchat-ava"><img src={m.from === 'u' ? bunnyFace : kutitapFace} alt="" draggable="false" /></span>
            <div className="kchat-bubble">{m.text}</div>
          </div>
        ))}
        {typing && (
          <div className="kchat-row bot">
            <span className="kchat-ava"><img src={kutitapFace} alt="" draggable="false" /></span>
            <div className="kchat-bubble dots" aria-label="Kutitap is typing"><i /><i /><i /></div>
          </div>
        )}
        {msgs.length === 1 && !typing && (
          <div className="kchat-chips">
            {SUGGESTIONS.map((s) => <button key={s} type="button" className="kchat-chip" onClick={() => send(s)}>{s}</button>)}
          </div>
        )}
      </div>
      <form className="kchat-foot" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
        <input ref={inputRef} className="kchat-input" value={draft} maxLength={200} onChange={(e) => setDraft(e.target.value)} placeholder="Ask Kutitap..." aria-label="Message" autoComplete="off" />
        <button type="submit" className="kchat-send" disabled={!draft.trim() || typing}>Send</button>
      </form>
    </div>
  );
}

export default function KutitapChat({ open, onMinimize, onEnd, onSessionChange, getCtx }) {
  const [msgs, setMsgs] = useState(loadChatSession); // null = no conversation yet
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const idRef = useRef(null);
  const epoch = useRef(0);   // bumps when the chat is ended, so a late reply is dropped
  const timers = useRef([]);
  const lastMsgs = useRef([]);

  if (idRef.current === null) idRef.current = (msgs ? Math.max(0, ...msgs.map((m) => m.id || 0)) : 0) + 1;
  if (msgs) lastMsgs.current = msgs;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // keep the tab-only copy in sync and tell the app whether a conversation exists
  useEffect(() => { saveChatSession(msgs); if (onSessionChange) onSessionChange(!!msgs); }, [msgs]); // eslint-disable-line react-hooks/exhaustive-deps

  // opening with no conversation starts one with a fresh greeting
  useEffect(() => {
    if (open && !msgs) setMsgs([{ id: idRef.current++, from: 'k', text: greetingFor(getCtx()) }]);
  }, [open, msgs]); // eslint-disable-line react-hooks/exhaustive-deps

  // smooth open / close
  useEffect(() => {
    if (open) {
      setMounted(true);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setShown(true)); });
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), CLOSE_MS);
    return () => clearTimeout(t);
  }, [open]);

  const send = (raw) => {
    const q = (raw || '').trim();
    if (!q || typing) return;
    const ep = epoch.current;
    setMsgs((m) => [...(m || []), { id: idRef.current++, from: 'u', text: q }]);
    setDraft('');
    setTyping(true);
    const t = setTimeout(async () => {
      let reply;
      try { reply = await Promise.resolve(askKutitap(q, getCtx())); } catch (e) { reply = 'Oops, I tripped over my own tail! Ask me again, nya?'; }
      if (ep !== epoch.current) return;
      setTyping(false);
      setMsgs((m) => [...(m || []), { id: idRef.current++, from: 'k', text: String(reply) }]);
    }, 450 + Math.random() * 450);
    timers.current.push(t);
  };

  const end = () => {
    epoch.current += 1;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTyping(false);
    setDraft('');
    setMsgs(null);
    clearChatSession();
    onEnd();
  };

  if (!mounted) return null;
  return <ChatWindow shown={shown} msgs={msgs || lastMsgs.current} typing={typing} draft={draft} setDraft={setDraft} send={send} onMinimize={onMinimize} onEnd={end} />;
}
