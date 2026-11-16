import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import teemoUrl from './assets/farm/teemo.png';
import toolsUrl from './assets/farm/tools.png';
import chestUrl from './assets/farm/chest.png';
import grassUrl from './assets/farm/grass.png';
import dirtUrl from './assets/farm/dirt.png';
import fencesUrl from './assets/farm/fences.png';
import natureUrl from './assets/farm/nature.png';
import starUrl from './assets/ui/emoji-star.png';
import xUrl from './assets/ui/emoji-x.png';
import MonthVictoryModal from './MonthVictoryModal.jsx';
import { computeQuest } from './attendanceQuest.js';
import './AttendanceQuest.css';

// Monthly quest scene for the Attendance tab, drawn straight on the page like the farm (no box).
// One "world pixel" = S screen pixels. Back layer (ground, fence, trees, path) -> markers -> Kutitap -> front layer (lower grass details),
// so everything lower on the screen is drawn in front of everything higher up.
const HD = 80, FENCE_Y = 14, TREE_BASE = 38, PATH_Y = 34, FEET_Y = 51, LABEL_Y = 66, DECO_Y = 76;
const NAT = { oak: [17, 27, 30, 36], pine: [53, 32, 22, 32], bush1: [177, 17, 15, 14], bush2: [193, 17, 15, 14], mushW: [178, 68, 12, 11], mushR: [193, 67, 14, 11], mushB: [177, 35, 14, 12], rock: [273, 22, 11, 8] };
const IMG_URLS = [grassUrl, dirtUrl, fencesUrl, natureUrl];

function useImages(urls) {
  const [imgs, setImgs] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.all(urls.map((u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = u; }))).then((r) => { if (alive) setImgs(r); });
    return () => { alive = false; };
  }, [urls]);
  return imgs;
}

const hash = (i, j) => (Math.imul(i + 11, 73856093) ^ Math.imul(j + 7, 19349663)) >>> 0;

function drawScene(back, front, imgs, Wd, S, avoidX) {
  const [grass, dirt, fences, nature] = imgs;
  const prep = (cv) => { cv.width = Wd * S; cv.height = HD * S; const c = cv.getContext('2d'); if (!c) return null; c.imageSmoothingEnabled = false; c.setTransform(S, 0, 0, S, 0, 0); return c; };
  const b = prep(back), f = prep(front);
  if (!b || !f) return;
  const tile = (c, im, sx, sy, x, y) => c.drawImage(im, sx * 16, sy * 16, 16, 16, x, y, 16, 16);
  const put = (c, key, cx, baseY) => { const [sx, sy, w, h] = NAT[key]; c.drawImage(nature, sx, sy, w, h, Math.round(cx - w / 2), baseY - h, w, h); };
  // 1) grass ground
  for (let j = 0, y = 12; y < HD; j++, y += 16) {
    for (let i = 0, x = 0; x < Wd; i++, x += 16) {
      tile(b, grass, 1, 1, x, y);
      const h = hash(i, j) % 14;
      if (h === 0) tile(b, grass, 0, 5, x, y); else if (h === 1) tile(b, grass, 1, 5, x, y); else if (h === 2) tile(b, grass, 2, 5, x, y); else if (h === 3) tile(b, grass, 5, 5, x, y);
    }
  }
  // 2) fence along the back
  const last = Math.floor((Wd - 24) / 16) * 16 + 8;
  for (let x = 8; x <= last; x += 16) b.drawImage(fences, (x === 8 ? 1 : x === last ? 3 : 2) * 16, 48, 16, 16, x, FENCE_Y, 16, 16);
  // 3) trees and bushes stand on the upper grass, behind the path
  const at = (p) => Math.round(Wd * p);
  put(b, 'oak', at(0.09), TREE_BASE);
  put(b, 'bush1', at(0.3), TREE_BASE - 1);
  put(b, 'pine', at(0.58), TREE_BASE + 1);
  put(b, 'bush2', at(0.84), TREE_BASE - 1);
  // 4) the dirt path: grass-edged top row + bottom row
  for (let i = 0, x = 0; x < Wd; i++, x += 16) {
    tile(b, dirt, [5, 6, 7][hash(i, 1) % 3], 5, x, PATH_Y);
    tile(b, dirt, [5, 6][hash(i, 2) % 2], 6, x, PATH_Y + 16);
  }
  // 5) lower-grass details, in front of the path (nudged away from the week labels)
  const away = (x) => { let v = x; for (let k = 0; k < 3; k++) { const near = avoidX.find((a) => Math.abs(a - v) < 20); if (near === undefined) break; v = near + 22; } return Math.min(Wd - 40, v); };
  put(f, 'mushW', away(at(0.2)), DECO_Y + 2);
  put(f, 'mushB', away(at(0.47)), DECO_Y + 2);
  put(f, 'mushR', away(at(0.74)), DECO_Y + 3);
}

export default function AttendanceProgressBar({ year, monthIndex, monthName, records, workingDays, estimatedSalaryPHP }) {
  const quest = useMemo(() => computeQuest({ year, monthIndex, records, workingDays }), [year, monthIndex, records, workingDays]);
  const [open, setOpen] = useState(false);
  const prev = useRef({ key: `${year}-${monthIndex}`, complete: quest.complete });
  // pop the victory screen only when the final shift gets filled while this month is on screen (never on load or month switch)
  useEffect(() => {
    const key = `${year}-${monthIndex}`;
    if (prev.current.key !== key) { prev.current = { key, complete: quest.complete }; setOpen(false); return; }
    if (quest.complete && !prev.current.complete) setOpen(true);
    prev.current.complete = quest.complete;
  }, [year, monthIndex, quest.complete]);

  // size of the scene: 3x on wide screens, 2x on narrow ones
  const laneRef = useRef(null);
  const [dims, setDims] = useState({ w: 900, S: 3 });
  useEffect(() => {
    const el = laneRef.current;
    if (!el) return undefined;
    const measure = () => { const w = Math.floor(el.clientWidth) || 900; setDims((d) => (d.w === w ? d : { w, S: w >= 620 ? 3 : 2 })); };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el); else window.addEventListener('resize', measure);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', measure); };
  }, []);
  const { w, S } = dims;
  const Wd = Math.ceil(w / S);
  const imgs = useImages(IMG_URLS);
  const backRef = useRef(null), frontRef = useRef(null);

  const spr = 16 * S, chestW = 16 * S + 4 * S;
  const runW = Math.max(1, w - spr - chestW);                       // distance Kutitap can walk
  const xAt = (day) => spr / 2 + (day / quest.endDay) * runW;        // centre of Kutitap when standing on `day`
  const labelXs = useMemo(() => quest.weeks.slice(0, -1).map((k) => Math.round(xAt(k.endDay) / S)).concat([Wd - 10]), [quest.weeks, quest.endDay, w, S, Wd]); // eslint-disable-line
  useEffect(() => {
    if (imgs && backRef.current && frontRef.current) drawScene(backRef.current, frontRef.current, imgs, Wd, S, labelXs);
  }, [imgs, Wd, S, labelXs]);

  const pct = Math.round(quest.progress * 1000) / 10;
  const incomeText = `₱${Number(estimatedSalaryPHP || 0).toLocaleString()}`;
  const walkerLeft = quest.complete ? runW : (pct / 100) * runW;
  const mk = 9 * S;                                                   // marker icon size
  return (
    <section className="aq" aria-label={`${monthName} ${year} attendance quest, Level ${quest.level} Chapter ${quest.chapter}. ${quest.weeksDone} of ${quest.weeks.length} weeks complete.`}>
      <div className="aq-lane" ref={laneRef} style={{ '--S': S, height: HD * S }}>
        <div className="aq-clip" aria-hidden="true">
          <canvas ref={backRef} className="aq-canvas" style={{ width: Wd * S, height: HD * S }} />
        </div>

        {/* week checkpoints: an X until the week's last shift is filled, then a star */}
        {quest.weeks.slice(0, -1).map((k) => (
          <React.Fragment key={k.n}>
            <img className={`aq-mark ${k.done ? 'done' : ''}`} src={k.done ? starUrl : xUrl} alt="" role="img" aria-label={k.done ? `Week ${k.n} complete` : `Week ${k.n} not finished yet`}
              style={{ left: xAt(k.endDay) - mk / 2, top: 54 * S - mk / 2, width: mk, height: mk }} />
            <span className={`aq-wk ${k.done ? 'done' : ''}`} style={{ left: xAt(k.endDay), top: LABEL_Y * S }}>{S < 3 ? `W${k.n}` : `Week ${k.n}`}</span>
          </React.Fragment>
        ))}
        <span className={`aq-wk ${quest.complete ? 'done' : ''}`} style={{ left: Math.min(w - 10 * S, w - 26), top: LABEL_Y * S }}>{S < 3 ? `W${quest.weeks.length}` : `Week ${quest.weeks.length}`}</span>
        <span className={`aq-chest ${quest.complete ? 'open' : ''}`} role="img" aria-label={quest.complete ? 'Treasure chest opened' : 'Treasure chest at the end of the month'}
          style={{ right: 2 * S, top: (54 - (quest.complete ? 20 : 16)) * S, width: 16 * S, height: (quest.complete ? 20 : 16) * S, backgroundImage: `url(${chestUrl})`,
            backgroundSize: `${240 * S}px ${96 * S}px`, backgroundPosition: quest.complete ? `${-112 * S}px ${-60 * S}px` : `${-16 * S}px ${-16 * S}px` }} />

        <div className="aq-walker" style={{ left: walkerLeft, top: (FEET_Y + 1 - 16) * S, width: spr, height: spr }}>
          <span className="aq-badge">Day {quest.latestDay} / {quest.endDay}</span>
          <span className="aq-shadow" aria-hidden="true" />
          <span className={`aq-sprite ${quest.complete ? 'aq-cheer' : 'aq-walk'}`} style={{ backgroundImage: `url(${teemoUrl})` }} role="img" aria-label="Kutitap walking along the month" />
          {!quest.complete && <span className="aq-axe" style={{ backgroundImage: `url(${toolsUrl})` }} aria-hidden="true" />}
        </div>

        <div className="aq-clip aq-front" aria-hidden="true">
          <canvas ref={frontRef} className="aq-canvas" style={{ width: Wd * S, height: HD * S }} />
        </div>
        {quest.complete && (
          <button type="button" className="aq-replay" style={{ '--px': 'pill' }} onClick={() => setOpen(true)}><Sparkles style={{ width: 16, height: 16 }} /> Replay victory</button>
        )}
      </div>

      <MonthVictoryModal open={open} onClose={() => setOpen(false)} monthName={monthName} year={year} quest={quest} incomeText={incomeText} />
    </section>
  );
}
