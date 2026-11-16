import React, { useEffect, useRef } from 'react';
import teemoUrl from './assets/farm/teemo.png';
import chestUrl from './assets/farm/chest.png';
import starUrl from './assets/ui/emoji-star.png';
import './AttendanceQuest.css';

// "Month Defeated!" screen. Pure display: all numbers come from computeQuest().
export default function MonthVictoryModal({ open, onClose, monthName, year, quest, incomeText }) {
  const btn = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => btn.current && btn.current.focus(), 50);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  if (!open || !quest) return null;
  const confetti = Array.from({ length: 26 }, (_, i) => i);
  const colors = ['#f0589a', '#ffd700', '#9be58a', '#8fd3ff', '#c9a7ff'];
  return (
    <div className="aq-back" onClick={onClose} role="presentation">
      <div className="aq-modal" role="dialog" aria-modal="true" aria-label={`${monthName} defeated`} onClick={(e) => e.stopPropagation()} style={{ '--px': 'panel' }}>
        <div className="aq-confetti" aria-hidden="true">
          {confetti.map((i) => (
            <span key={i} style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 9) * 0.22}s`, animationDuration: `${2.6 + (i % 5) * 0.35}s` }} />
          ))}
        </div>
        <div className="aq-hero">
          <span className="aq-sprite aq-dance" style={{ backgroundImage: `url(${teemoUrl})` }} aria-hidden="true" />
          <span className="aq-chest-open" style={{ backgroundImage: `url(${chestUrl})` }} aria-hidden="true" />
        </div>
        <h2 className="aq-title">{monthName} Defeated!</h2>
        <p className="aq-sub">You've completed Level {quest.level} • Chapter {quest.chapter}!</p>
        <div className="aq-loot">
          <span className="aq-loot-label">Loot</span>
          <span className="aq-loot-amt">You won {incomeText} coins for {monthName}!</span>
        </div>
        <div className="aq-stars" aria-label={`${quest.stars} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <img key={n} src={starUrl} alt="" className={`aq-star ${n <= quest.stars ? 'on' : 'off'}`} style={{ animationDelay: `${0.25 + n * 0.18}s` }} />
          ))}
        </div>
        <div className="aq-rank">{quest.rank}</div>
        <div className="aq-rate">Attendance {quest.rate}%</div>
        <div className="aq-pills">
          <span className="aq-pill p">Present {quest.present}</span>
          <span className="aq-pill l">Late {quest.late}</span>
          <span className="aq-pill a">Absent {quest.absent}</span>
          {quest.excused > 0 && <span className="aq-pill x">Leave or holiday {quest.excused}</span>}
        </div>
        <button ref={btn} type="button" className="aq-claim" style={{ '--px': 'pill' }} onClick={onClose}>Claim & Close</button>
      </div>
    </div>
  );
}
