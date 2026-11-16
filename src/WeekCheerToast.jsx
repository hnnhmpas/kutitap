import React, { useEffect } from 'react';
import faceUrl from './assets/ui/kutitap-chat-face.png';
import './AttendanceQuest.css';

// Small cheerful toast shown when a time-in lands on the last shift of a week. Click, Esc, or wait 8 s to dismiss.
export default function WeekCheerToast({ cheer, onClose }) {
  useEffect(() => {
    if (!cheer) return undefined;
    const t = setTimeout(onClose, 8000);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [cheer, onClose]);
  if (!cheer) return null;
  return (
    <div className="aq-toast" role="status" aria-live="polite" style={{ '--px': 'panel' }} onClick={onClose} title="Click to close">
      <span className="aq-toast-face" style={{ backgroundImage: `url(${faceUrl})` }} aria-hidden="true" />
      <div>
        <div className="aq-toast-tag">Week complete!</div>
        <div className="aq-toast-msg">{cheer.text}</div>
      </div>
    </div>
  );
}
