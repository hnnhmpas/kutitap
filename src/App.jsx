import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  CreditCard,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  LogOut,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Sparkles,
  Clock,
  Star,
  X,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Pencil,
  Volume2,
  VolumeX
} from 'lucide-react';
import './pixel-theme.css';

// Firebase imports
import { db } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Pixel sprites (sliced from the badge sheet)
import spApple from './assets/pixel/apple.png';
import spClover from './assets/pixel/clover.png';
import spFlower from './assets/pixel/flower.png';
import spStrawberry from './assets/pixel/strawberry.png';
import spPudding from './assets/pixel/pudding.png';
import spDango from './assets/pixel/dango.png';
import spToast from './assets/pixel/toast.png';
import spStamp from './assets/pixel/stamp.png';
import spBunny from './assets/pixel/bunny.png';
import spTama from './assets/pixel/tama.png';

// Claw machine prizes (strawberry dessert sheet)
import dsStrawberry from './assets/pixel/dessert-strawberry.png';
import dsCupcake from './assets/pixel/dessert-cupcake.png';
import dsDonut from './assets/pixel/dessert-donut.png';
import dsCakeSlice from './assets/pixel/dessert-cakeslice.png';
import dsMacaron from './assets/pixel/dessert-macaron.png';
import dsTart from './assets/pixel/dessert-tart.png';
import dsShortcake from './assets/pixel/dessert-shortcake.png';
import dsRollCake from './assets/pixel/dessert-rollcake.png';

// Bill Buddy cat + meadow scenery
import catHappy from './assets/pixel/cat-happy.png';
import catSad from './assets/pixel/cat-sad.png';
import catSleep from './assets/pixel/cat-sleep.png';
import catWalkDown from './assets/pixel/cat-walk-down.png';
import catWalkLeft from './assets/pixel/cat-walk-left.png';
import catWalkRight from './assets/pixel/cat-walk-right.png';
import scTree from './assets/pixel/scene-tree.png';
import scBush from './assets/pixel/scene-bush.png';
import scFlowerY from './assets/pixel/scene-flower-yellow.png';
import scFlowerP from './assets/pixel/scene-flower-pink.png';
import scFlowerB from './assets/pixel/scene-flower-blue.png';
import scMush from './assets/pixel/scene-mush.png';
import spHeart from './assets/pixel/heart.png';

const NAV_SPRITES = {
  dashboard: spTama,
  'income-expense': spToast,
  savings: spPudding,
  loans: spStamp,
  attendance: spClover
};
const Sprite = ({ src, className = '' }) => (
  <img src={src} alt="" draggable={false} className={`px-sprite ${className}`} />
);

// Loans table sizing (sticky header height + minimum width of each amount column)
const LOAN_HEAD_H = 46;
const LOAN_COL_W = 140;

// Firebase-backed state hook (syncs live to Firestore document)
// - valueRef always holds the newest value, so quick back-to-back updates never build on a stale copy
// - updates made before the first snapshot arrives are queued and applied ON TOP of the loaded data
//   (previously they were written over it, which wiped saved entries such as November's Actual Income)
// - echoes of our own pending writes are ignored, so typing/toggling never gets overwritten by an older copy
function useFirebaseSync(key, initialValue) {
  const [storedValue, setStoredValue] = useState(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const valueRef = useRef(initialValue);
  const loadedRef = useRef(false);
  const pendingRef = useRef([]);

  const persist = async (valueToStore) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
      const docRef = doc(db, "financeTracker", "user_data");
      await setDoc(docRef, { [key]: valueToStore }, { merge: true });
    } catch (error) {
      console.warn("Error updating Firebase/LocalStorage", error);
    }
  };

  const applyUpdate = (update) => {
    const valueToStore = update instanceof Function ? update(valueRef.current) : update;
    valueRef.current = valueToStore;
    setStoredValue(valueToStore);
    return valueToStore;
  };

  useEffect(() => {
    const docRef = doc(db, "financeTracker", "user_data");

    const loadFromLocal = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          valueRef.current = JSON.parse(item);
          setStoredValue(valueRef.current);
        }
      } catch (e) {}
    };

    const finishLoad = () => {
      if (!loadedRef.current) {
        loadedRef.current = true;
        const pending = pendingRef.current;
        pendingRef.current = [];
        if (pending.length > 0) {
          const before = valueRef.current;
          let last = before;
          pending.forEach((update) => { last = applyUpdate(update); });
          if (last !== before) persist(last);
        }
      }
      setIsLoaded(true);
    };

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      // our own write echoing back: local state is already up to date
      if (loadedRef.current && docSnap.metadata && docSnap.metadata.hasPendingWrites) return;
      if (docSnap.exists() && docSnap.data()[key] !== undefined) {
        valueRef.current = docSnap.data()[key];
        setStoredValue(docSnap.data()[key]);
      } else {
        loadFromLocal();
      }
      finishLoad();
    }, (error) => {
      console.warn("Firestore sync fallback to local storage:", error);
      loadFromLocal();
      finishLoad();
    });

    // safety net: if Firestore never answers, fall back to this device's copy so the app stays usable
    const fallbackTimer = setTimeout(() => {
      if (!loadedRef.current) { loadFromLocal(); finishLoad(); }
    }, 4000);

    return () => { clearTimeout(fallbackTimer); unsubscribe(); };
  }, [key]);

  const setValue = async (value) => {
    if (!loadedRef.current) {
      pendingRef.current.push(value);
      return;
    }
    const before = valueRef.current;
    const valueToStore = applyUpdate(value);
    if (valueToStore === before && value instanceof Function) return; // nothing changed, nothing to save
    await persist(valueToStore);
  };

  return [storedValue, setValue];
}

// 8-bit blips + pixel sparkles on every press. Purely cosmetic; has its own mute toggle.
function PixelFX() {
  const [muted, setMuted] = useState(() => {
    try { return window.localStorage.getItem('kutitap_sfx') === 'off'; } catch (e) { return false; }
  });
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const audioRef = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tone = (notes, vol = 0.035) => {
      if (mutedRef.current) return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = audioRef.current || (audioRef.current = new Ctx());
        if (ctx.state === 'suspended') ctx.resume();
        let t = ctx.currentTime;
        notes.forEach(([freq, dur]) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(vol, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(g); g.connect(ctx.destination);
          o.start(t); o.stop(t + dur);
          t += dur * 0.9;
        });
      } catch (e) {}
    };
    const burst = (x, y, n, colors) => {
      if (reduce) return;
      for (let i = 0; i < n; i++) {
        const p = document.createElement('div');
        const size = 4 + Math.floor(Math.random() * 3) * 2;
        p.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${colors[i % colors.length]};box-shadow:0 0 0 2px #4a1d36;pointer-events:none;z-index:99999`;
        document.body.appendChild(p);
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
        const d = 24 + Math.random() * 30;
        const dx = Math.cos(ang) * d;
        const dy = Math.sin(ang) * d;
        const anim = p.animate(
          [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${dx}px,${dy - 14}px)`, opacity: 1, offset: 0.7 }, { transform: `translate(${dx}px,${dy + 10}px)`, opacity: 0 }],
          { duration: 520, easing: 'steps(6)' }
        );
        anim.onfinish = () => p.remove();
      }
    };
    const onDown = (e) => {
      const el = e.target.closest && e.target.closest('button, select, h2.kutitap-title');
      if (!el || el.disabled) return;
      const label = (el.textContent || '').trim();
      if (label === 'Not Paid') {
        tone([[660, 0.06], [880, 0.06], [1320, 0.14]]);
        burst(e.clientX, e.clientY, 12, ['#ffd86b', '#fff3d4', '#f0589a']);
      } else if (label === 'Paid') {
        tone([[330, 0.08], [220, 0.12]]);
        burst(e.clientX, e.clientY, 4, ['#8a5a74', '#ffe9a8']);
      } else {
        tone([[520, 0.05], [780, 0.07]]);
        burst(e.clientX, e.clientY, 6, ['#f0589a', '#ffd86b', '#9be58a']);
      }
    };
    const onDbl = (e) => {
      const el = e.target.closest && e.target.closest('[data-paid]');
      if (!el) return;
      if (el.getAttribute('data-paid') === 'true') {
        tone([[330, 0.08], [220, 0.12]]);
        burst(e.clientX, e.clientY, 4, ['#8a5a74', '#ffe9a8']);
      } else {
        tone([[660, 0.06], [880, 0.06], [1320, 0.14]]);
        burst(e.clientX, e.clientY, 12, ['#ffd86b', '#9be58a', '#f0589a']);
      }
    };
    let lastKey = 0;
    const onInput = (e) => {
      const now = performance.now();
      if (now - lastKey < 45 || !(e.target && e.target.matches && e.target.matches('input'))) return;
      lastKey = now;
      tone([[900 + Math.random() * 250, 0.025]], 0.015);
    };
    const onSfx = (e) => {
      const d = e.detail || {};
      const cx = d.x !== undefined ? d.x : window.innerWidth / 2;
      const cy = d.y !== undefined ? d.y : window.innerHeight / 2;
      if (d.type === 'drop') tone([[300, 0.05], [240, 0.06], [180, 0.08]]);
      else if (d.type === 'grab') tone([[200, 0.05], [260, 0.06]]);
      else if (d.type === 'miss') tone([[300, 0.1], [220, 0.12], [160, 0.2]]);
      else if (d.type === 'win') {
        tone([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.2]]);
        burst(cx, cy, 16, ['#ffd86b', '#f0589a', '#9be58a', '#fff3d4']);
      } else if (d.type === 'cat') {
        tone([[784, 0.07], [988, 0.07], [1175, 0.07], [1568, 0.22]]);
        burst(cx, cy, 16, ['#f0589a', '#ffd86b', '#fff3d4']);
      }
    };
    window.addEventListener('kutitap-sfx', onSfx);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('dblclick', onDbl, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('input', onInput, true);
      window.removeEventListener('kutitap-sfx', onSfx);
      document.removeEventListener('dblclick', onDbl, true);
    };
  }, []);

  return (
    <button
      type="button"
      className="px-sfx"
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      title={muted ? 'Sound off' : 'Sound on'}
      onClick={() => {
        const next = !muted;
        setMuted(next);
        try { window.localStorage.setItem('kutitap_sfx', next ? 'off' : 'on'); } catch (e) {}
      }}
    >
      {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pixel meter (segmented bar) used by the dashboard table
// ---------------------------------------------------------------------------
function PixelMeter({ pct, tone = 'pink', segments = 12 }) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const on = Math.round((safe / 100) * segments);
  return (
    <div className={`px-meter px-meter-${tone}`} role="progressbar" aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: segments }).map((_, i) => (
        <span key={i} className={i < on ? 'on' : ''} style={{ '--i': i }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bill Buddy: the cat on the Income & Expense tab.
// Purely presentational: it only receives how many "Not Paid" boxes are left.
// ---------------------------------------------------------------------------
function PixelCat({ unpaid, total, monthName }) {
  const paid = total - unpaid;
  const allPaid = total > 0 && unpaid === 0;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const mood = total === 0 ? 'sleep' : allPaid ? 'happy' : paid > 0 ? 'ok' : 'sad';

  // little victory dance the moment the last box flips to Paid
  const [cheer, setCheer] = useState(false);
  const wasAllPaid = useRef(allPaid);
  useEffect(() => {
    let timer;
    if (allPaid && !wasAllPaid.current) {
      setCheer(true);
      window.dispatchEvent(new CustomEvent('kutitap-sfx', { detail: { type: 'cat' } }));
      timer = setTimeout(() => setCheer(false), 2600);
    }
    wasAllPaid.current = allPaid;
    return () => clearTimeout(timer);
  }, [allPaid]);

  const message = {
    sleep: 'Nothing to pay yet. Kitty is napping...',
    sad: `${unpaid} unpaid box${unpaid === 1 ? '' : 'es'}! Kitty is worried...`,
    ok: `${unpaid} more to go! Kitty is getting hopeful...`,
    happy: 'Every box is paid! Kitty is so happy!'
  }[mood];

  return (
    <div style={{ background: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '16px', textAlign: 'center', width: '100%', flexShrink: 0, boxShadow: '0 8px 25px rgba(223,177,91,0.15)' }}>
      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Sprite src={spHeart} className="px-heart-icon" /> Bill Buddy · {monthName}
      </div>

      <div className={`px-meadow px-meadow-${mood}`}>
        <img className="px-sprite px-scene px-scene-tree" src={scTree} alt="" />
        <img className="px-sprite px-scene px-scene-bush" src={scBush} alt="" />
        <img className="px-sprite px-scene px-scene-fy" src={scFlowerY} alt="" />
        <img className="px-sprite px-scene px-scene-fp" src={scFlowerP} alt="" />
        <img className="px-sprite px-scene px-scene-fb" src={scFlowerB} alt="" />
        <img className="px-sprite px-scene px-scene-mush" src={scMush} alt="" />

        {mood === 'sleep' && (
          <>
            <img className="px-sprite px-cat-sleep" src={catSleep} alt="Sleeping kitty" />
            <span className="px-zzz px-zzz-1">z</span>
            <span className="px-zzz px-zzz-2">Z</span>
          </>
        )}
        {mood === 'sad' && (
          <>
            <img className="px-sprite px-cat px-cat-sad" src={catSad} alt="Worried kitty" />
            <span className="px-sweat" />
          </>
        )}
        {mood === 'ok' && <div className="px-sprite px-cat px-cat-fidget" role="img" aria-label="Hopeful kitty" style={{ backgroundImage: `url(${catWalkDown})` }} />}
        {mood === 'happy' && cheer && <img className="px-sprite px-cat px-cat-cheer" src={catHappy} alt="Happy kitty" />}
        {mood === 'happy' && !cheer && (
          <>
            <div className="px-sprite px-walker px-walk-r" role="img" aria-label="Happy kitty" style={{ backgroundImage: `url(${catWalkRight})` }} />
            <div className="px-sprite px-walker px-walk-l" aria-hidden="true" style={{ backgroundImage: `url(${catWalkLeft})` }} />
          </>
        )}
        {mood === 'happy' && [8, 24, 40, 58, 74, 88].map((left, i) => (
          <img key={left} className="px-sprite px-heart" src={spHeart} alt="" style={{ left: `${left}%`, animationDelay: `${i * 0.35}s` }} />
        ))}
      </div>

      <div className="px-cat-bubble" aria-live="polite">{message}</div>
      <div className="px-cat-hud">
        <span>Happiness</span>
        <PixelMeter pct={pct} tone={allPaid ? 'green' : 'pink'} segments={10} />
        <span>{paid}/{total} paid</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Claw machine (dashboard). Self-contained: it only touches its own state and
// remembers the prizes you collected in localStorage (device only).
// ---------------------------------------------------------------------------
const CLAW_W = 360;
const CLAW_H = 440;
const CLAW_PRIZE = 54;
const CLAW_FLOOR = 12;
const CLAW_RAIL = 12;
const CLAW_HEAD = 40;
const CLAW_REST = 24;
const CLAW_MIN_X = 30;
const CLAW_MAX_X = 330;
const CLAW_CHUTE_X = 46;
const CLAW_SPEED = 170;
const CLAW_TRIES = 5;
const CLAW_PRIZES = [
  { name: 'Strawberry', src: dsStrawberry },
  { name: 'Cupcake', src: dsCupcake },
  { name: 'Donut', src: dsDonut },
  { name: 'Cake Slice', src: dsCakeSlice },
  { name: 'Macaron', src: dsMacaron },
  { name: 'Berry Tart', src: dsTart },
  { name: 'Shortcake', src: dsShortcake },
  { name: 'Roll Cake', src: dsRollCake }
];
let clawUid = 0;
const clawClamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const clawWait = (ms) => new Promise((r) => setTimeout(r, ms));

function makeClawPrizes() {
  const list = [];
  [132, 170, 208, 246, 284, 322].forEach((cx) => {
    const n = 1 + Math.floor(Math.random() * 3);
    for (let r = 0; r < n; r++) {
      list.push({
        id: `cp${clawUid++}`,
        kind: Math.floor(Math.random() * CLAW_PRIZES.length),
        x: cx + (Math.random() * 8 - 4),
        bottom: CLAW_FLOOR + r * 36 + Math.random() * 3,
        rot: Math.random() * 20 - 10
      });
    }
  });
  return list;
}

function ClawMachine() {
  const [prizes, setPrizes] = useState(makeClawPrizes);
  const [tries, setTries] = useState(CLAW_TRIES);
  const [roundWins, setRoundWins] = useState(0);
  const [won, setWon] = useState(() => {
    try {
      const v = JSON.parse(window.localStorage.getItem('kutitap_claw_prizes') || '[]');
      return Array.isArray(v) ? v.filter((k) => Number.isInteger(k) && k >= 0 && k < CLAW_PRIZES.length) : [];
    } catch (e) { return []; }
  });
  const [clawX, setClawX] = useState(180);
  const [rope, setRope] = useState(CLAW_REST);
  const [open, setOpen] = useState(true);
  const [carried, setCarried] = useState(null);
  const [auto, setAuto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('Line it up, then press Drop!');
  const [flash, setFlash] = useState(null);
  const [scale, setScale] = useState(1);

  const xRef = useRef(180);
  const dirRef = useRef(0);
  const busyRef = useRef(false);
  const alive = useRef(true);
  const prizesRef = useRef(prizes);
  const dropRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => { prizesRef.current = prizes; }, [prizes]);
  useEffect(() => {
    try { window.localStorage.setItem('kutitap_claw_prizes', JSON.stringify(won)); } catch (e) { /* ignore */ }
  }, [won]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // scale the fixed-size stage to the panel width
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1.3, e.contentRect.width / CLAW_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // smooth left/right movement
  useEffect(() => {
    let raf;
    let last = performance.now();
    const tick = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (dirRef.current && !busyRef.current) {
        const nx = clawClamp(xRef.current + dirRef.current * CLAW_SPEED * dt, CLAW_MIN_X, CLAW_MAX_X);
        if (nx !== xRef.current) { xRef.current = nx; setClawX(nx); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const over = !busy && (tries <= 0 || prizes.length === 0);
  const sfx = (type, extra = {}) => window.dispatchEvent(new CustomEvent('kutitap-sfx', { detail: { type, ...extra } }));

  async function drop() {
    if (busyRef.current || tries <= 0 || prizesRef.current.length === 0) return;
    busyRef.current = true;
    dirRef.current = 0;
    setBusy(true);
    setTries((t) => t - 1);
    setMsg('Going down...');
    sfx('drop');

    const step = async (ms) => { await clawWait(ms); return alive.current; };
    const x = xRef.current;
    const hit = prizesRef.current
      .map((p) => ({ p, top: CLAW_H - p.bottom - CLAW_PRIZE, dx: Math.abs(p.x - x) }))
      .filter((c) => c.dx < 30)
      .sort((a, b) => a.top - b.top || a.dx - b.dx)[0];
    const ropeTarget = hit
      ? Math.max(CLAW_REST, hit.top + 14 - (CLAW_RAIL + CLAW_HEAD))
      : CLAW_H - CLAW_RAIL - CLAW_HEAD - CLAW_FLOOR - 2;

    setOpen(true);
    if (!(await step(250))) return;
    setRope(ropeTarget);
    if (!(await step(1050))) return;
    setOpen(false);
    sfx('grab');
    if (!(await step(550))) return;

    const chance = hit ? (hit.dx <= 8 ? 0.92 : hit.dx <= 16 ? 0.65 : 0.3) : 0;
    const got = hit && Math.random() < chance ? hit.p : null;
    if (got) {
      setPrizes((ps) => ps.filter((p) => p.id !== got.id));
      setCarried(got);
      setMsg('Got one! Hold on...');
    } else {
      setMsg('Missed! Line it up closer.');
      sfx('miss');
    }
    setRope(CLAW_REST);

    let kept = got;
    if (got) {
      const slip = Math.random() < (hit.dx <= 8 ? 0.12 : 0.3);
      if (!(await step(450))) return;
      if (slip) {
        const midBottom = CLAW_H - ((ropeTarget + CLAW_REST) / 2 + CLAW_RAIL + CLAW_HEAD) - CLAW_PRIZE / 2;
        setCarried(null);
        setPrizes((ps) => [...ps, { ...got, bottom: midBottom }]);
        setMsg('Oh no, it slipped!');
        sfx('miss');
        kept = null;
        await clawWait(30);
        setPrizes((ps) => ps.map((p) => (p.id === got.id ? { ...p, bottom: got.bottom } : p)));
      }
      if (!(await step(550))) return;
    } else if (!(await step(1000))) return;

    if (!(await step(300))) return;
    setAuto(true);
    xRef.current = CLAW_CHUTE_X;
    setClawX(CLAW_CHUTE_X);
    if (!(await step(1150))) return;

    setOpen(true);
    if (kept) {
      const kind = kept.kind;
      setCarried(null);
      setPrizes((ps) => [...ps, { ...kept, x: CLAW_CHUTE_X, bottom: CLAW_H - 62 - CLAW_PRIZE, rot: 0 }]);
      await clawWait(30);
      setPrizes((ps) => ps.map((p) => (p.id === kept.id ? { ...p, bottom: CLAW_FLOOR + 14 } : p)));
      if (!(await step(750))) return;
      setPrizes((ps) => ps.filter((p) => p.id !== kept.id));
      setWon((w) => [...w, kind]);
      setRoundWins((n) => n + 1);
      const name = CLAW_PRIZES[kind].name;
      setMsg(`You won a ${name}!`);
      setFlash(name);
      sfx('win');
      setTimeout(() => setFlash(null), 1700);
    } else if (!(await step(300))) return;

    if (!(await step(350))) return;
    setOpen(false);
    setAuto(false);
    busyRef.current = false;
    setBusy(false);
  }
  dropRef.current = drop;

  function reset() {
    setPrizes(makeClawPrizes());
    setTries(CLAW_TRIES);
    setRoundWins(0);
    setCarried(null);
    setRope(CLAW_REST);
    setOpen(true);
    setAuto(false);
    xRef.current = 180;
    setClawX(180);
    setMsg('Line it up, then press Drop!');
  }

  const onKeyDown = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') { dirRef.current = -1; e.preventDefault(); }
    else if (k === 'arrowright' || k === 'd') { dirRef.current = 1; e.preventDefault(); }
    else if ((k === ' ' || k === 'enter') && e.target.tagName === 'BUTTON') { /* the focused button handles it */ }
    else if (k === ' ' || k === 'enter' || k === 'arrowdown') { e.preventDefault(); if (!e.repeat) dropRef.current && dropRef.current(); }
  };
  const onKeyUp = (e) => {
    const k = e.key.toLowerCase();
    if (((k === 'arrowleft' || k === 'a') && dirRef.current === -1) || ((k === 'arrowright' || k === 'd') && dirRef.current === 1)) dirRef.current = 0;
  };
  const stop = () => { dirRef.current = 0; };
  const hold = (d) => ({
    onPointerDown: (e) => { e.preventDefault(); dirRef.current = d; },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop
  });

  const glide = auto ? 'left 1.1s ease-in-out' : 'none';
  const locked = busy || over;
  const counts = CLAW_PRIZES.map((_, i) => won.filter((k) => k === i).length);
  const collected = counts.filter((c) => c > 0).length;
  const btn = { borderRadius: 0, '--px': 'pill', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: locked ? 'not-allowed' : 'pointer', touchAction: 'none', fontWeight: 800, fontSize: '15px', opacity: locked ? 0.5 : 1 };

  return (
    <div
      className="claw-cabinet"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={stop}
      style={{ backgroundColor: 'var(--px-pink)', borderRadius: 0, '--px': 'panel', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)' }}
    >
      <div className="claw-marquee">
        <span className="claw-title">Claw Catch</span>
        <span className="claw-lives" aria-label={`${tries} tries left`}>
          {Array.from({ length: CLAW_TRIES }).map((_, i) => (
            <img key={i} src={spHeart} alt="" className={`px-sprite claw-heart${i < tries ? '' : ' off'}`} />
          ))}
        </span>
      </div>
      <div className="claw-bulbs" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="claw-bulb" style={{ animationDelay: `${(i % 4) * 0.25}s` }} />
        ))}
      </div>

      <div ref={wrapRef} className="claw-glass" style={{ height: CLAW_H * scale }}>
        <div className="claw-stage" style={{ width: CLAW_W, height: CLAW_H, transform: `scale(${scale})` }}>
          <div className="claw-floor" />
          <div className="claw-rail" />
          <div className="claw-carriage" style={{ left: clawX, transition: glide }} />

          <div className="claw-chute-back" />
          <div className="claw-chute-lip"><span>PRIZE</span></div>

          {prizes.map((p) => (
            <div key={p.id} className="claw-prize" style={{ left: p.x - CLAW_PRIZE / 2, bottom: p.bottom, transform: `rotate(${p.rot}deg)` }}>
              <img className="px-sprite" src={CLAW_PRIZES[p.kind].src} alt="" style={{ width: CLAW_PRIZE, height: CLAW_PRIZE }} />
            </div>
          ))}

          <div className="claw-unit" style={{ left: clawX, top: CLAW_RAIL, transition: glide }}>
            <div className="claw-rope" style={{ height: rope }} />
            <div className="claw-head" style={{ height: CLAW_HEAD }}>
              {carried && (
                <img className="px-sprite claw-carried" src={CLAW_PRIZES[carried.kind].src} alt="" style={{ width: CLAW_PRIZE, height: CLAW_PRIZE }} />
              )}
              <div className="claw-hub" />
              {[1, -1].map((side) => (
                <div key={side} className="claw-arm" style={{ transform: `rotate(${side * (open ? 36 : 10)}deg)` }} />
              ))}
            </div>
          </div>

          {flash && <div className="claw-flash">You won a {flash}!</div>}

          {over && (
            <div className="claw-end">
              <div className="claw-end-card">
                <div className="claw-end-title">{prizes.length === 0 ? 'Machine cleared!' : 'Out of tries!'}</div>
                <div className="claw-end-sub">
                  {roundWins === 0 ? 'No prizes this round.' : `You won ${roundWins} prize${roundWins > 1 ? 's' : ''} this round.`}
                </div>
                <button
                  onClick={reset}
                  style={{ backgroundColor: 'var(--px-pink)', color: '#FFFFFF', borderRadius: 0, '--px': 'pill', padding: '10px 18px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', marginTop: '12px' }}
                >
                  Play again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="claw-msg" aria-live="polite">{msg}</div>

      <div className="claw-controls">
        <button {...hold(-1)} disabled={locked} aria-label="Move claw left" style={{ ...btn, backgroundColor: 'var(--px-sun)', color: 'var(--ink)' }}>
          <ChevronLeft style={{ width: '24px', height: '24px' }} />
        </button>
        <button onClick={drop} disabled={locked} style={{ ...btn, backgroundColor: 'var(--px-butter)', color: 'var(--px-accent)', fontSize: '16px' }}>
          <ChevronDown style={{ width: '20px', height: '20px' }} /> Drop
        </button>
        <button {...hold(1)} disabled={locked} aria-label="Move claw right" style={{ ...btn, backgroundColor: 'var(--px-sun)', color: 'var(--ink)' }}>
          <ChevronRight style={{ width: '24px', height: '24px' }} />
        </button>
      </div>
      <div className="claw-hint">Click the machine, then use ← → and Space</div>

      <div className="claw-collection-wrap">
        <div className="claw-coll-label">Collection {collected}/{CLAW_PRIZES.length}</div>
        <div className="claw-collection">
          {CLAW_PRIZES.map((pz, i) => (
            <div key={pz.name} className={`claw-slot${counts[i] ? ' got' : ''}`} title={counts[i] ? `${pz.name} x${counts[i]}` : '???'}>
              <img className="px-sprite" src={pz.src} alt={counts[i] ? pz.name : 'Not won yet'} />
              {counts[i] > 1 && <b>x{counts[i]}</b>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useFirebaseSync('kutitap_activeTab', 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useFirebaseSync('kutitap_sidebarOpen', true);

  // Month & Year State
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const currentKey = `${months[currentMonthIndex]}-${currentYear}`;

  // Live USD to PHP exchange rate state
  const [usdToPhpRate, setUsdToPhpRate] = useState(56.50);
  const [rateTrend, setRateTrend] = useState('up');
  const [historicalRates, setHistoricalRates] = useState({});

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.PHP) {
          const newRate = data.rates.PHP;
          setUsdToPhpRate(prev => {
            if (newRate > prev) setRateTrend('up');
            else if (newRate < prev) setRateTrend('down');
            return newRate;
          });
        }
      })
      .catch(() => setUsdToPhpRate(56.50));
  }, []);

  // Persistent States - Backed by Firebase Firestore
  const [incomes, setIncomes] = useFirebaseSync('kutitap_incomes', {});
  const currentIncome = incomes[currentKey] || { expected: '', actual: '' };

  const handleIncomeChange = (field, value) => {
    setIncomes(prev => ({
      ...prev,
      [currentKey]: { ...currentIncome, [field]: value }
    }));
  };

  const [utilityBills, setUtilityBills] = useFirebaseSync('kutitap_utilities', {});
  const defaultUtilities = {
    'PAG-IBIG House': { amount: '', paid: false },
    'PLDT WiFi': { amount: '', paid: false },
    'Meralco': { amount: '', paid: false },
    'Maynilad': { amount: '', paid: false }
  };
  const utilityOrder = Object.keys(defaultUtilities);
  const utilityRank = (name) => { const i = utilityOrder.indexOf(name); return i === -1 ? utilityOrder.length : i; };
  const currentUtilityBills = Object.fromEntries(
    Object.entries(utilityBills[currentKey] || defaultUtilities).sort(([a], [b]) => utilityRank(a) - utilityRank(b))
  );

  const handleUtilityAmountChange = (billName, value) => {
    setUtilityBills(prev => ({
      ...prev,
      [currentKey]: {
        ...(prev[currentKey] || defaultUtilities),
        [billName]: { ...(prev[currentKey]?.[billName] || defaultUtilities[billName]), amount: value }
      }
    }));
  };

  const handleUtilityTogglePaid = (billName) => {
    setUtilityBills(prev => ({
      ...prev,
      [currentKey]: {
        ...(prev[currentKey] || defaultUtilities),
        [billName]: { ...(prev[currentKey]?.[billName] || defaultUtilities[billName]), paid: !(prev[currentKey]?.[billName]?.paid) }
      }
    }));
  };

  // 'Atome' is the key of the existing entries (now shown as "Home Credit"); 'AtomeNew' is the new Atome tab
  const loanCategories = ['SPayLater', 'SLoan', 'Billease', 'Maya', 'Atome', 'AtomeNew', 'TikTokPayLater'];
  const loanLabels = { Atome: 'Home Credit', AtomeNew: 'Atome' };
  const loanLabel = (cat) => loanLabels[cat] || cat;
  const [activeLoanCategory, setActiveLoanCategory] = useState('SPayLater');
  
  const [dashMonthIndex, setDashMonthIndex] = useState(() => new Date().getMonth());
  const [dashYear, setDashYear] = useState(() => new Date().getFullYear());
  const [isDashMonthPickerOpen, setIsDashMonthPickerOpen] = useState(false);

  const loanTableYear = dashYear;
  const availableYears = Array.from({ length: 27 }, (_, i) => 2024 + i);

  const getCutoff30Label = (monthName, yearVal) => {
    if (monthName === 'February') {
      const isLeap = (yearVal % 4 === 0 && yearVal % 100 !== 0) || (yearVal % 400 === 0);
      return isLeap ? '29' : '28';
    }
    return '30';
  };

  const initialLoanData = {
    'SPayLater': { columns: ['Arrears', 'Combined', 'Computer'], cells: {}, paidStatus: {} },
    'SLoan': { columns: ['Principal', 'Interest'], cells: {}, paidStatus: {} },
    'Billease': { columns: ['Installment 1', 'Installment 2'], cells: {}, paidStatus: {} },
    'Maya': { columns: ['Credit', 'PayLater'], cells: {}, paidStatus: {} },
    'Atome': { columns: ['Bills', 'Card'], cells: {}, paidStatus: {} },
    'AtomeNew': { columns: ['Bills', 'Card'], cells: {}, paidStatus: {} },
    'TikTokPayLater': { columns: ['Orders'], cells: {}, paidStatus: {} }
  };
  const [loanTableData, setLoanTableData] = useFirebaseSync('kutitap_loans', initialLoanData);
  // a sub-tab that isn't in the saved data yet (e.g. the new Atome tab) starts from its defaults
  const getLoanCat = (cat) => loanTableData[cat] || initialLoanData[cat] || { columns: [], cells: {}, paidStatus: {} };

  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  const handleCellChange = (category, year, month, cutoff, colName, value) => {
    const rowKey = `${year}-${month}-${cutoff}`;
    setLoanTableData(prev => {
      const catData = prev[category] || initialLoanData[category] || { columns: [], cells: {}, paidStatus: {} };
      const rowCells = catData.cells[rowKey] || {};
      let paidCells = catData.paidCells;
      // an emptied entry has nothing left to pay, so drop its paid flag
      if (!(parseFloat(value) || 0) && paidCells?.[rowKey]?.[colName]) {
        const restRow = { ...paidCells[rowKey] };
        delete restRow[colName];
        paidCells = { ...paidCells, [rowKey]: restRow };
      }
      return {
        ...prev,
        [category]: {
          ...catData,
          ...(paidCells ? { paidCells } : {}),
          cells: { ...catData.cells, [rowKey]: { ...rowCells, [colName]: value } }
        }
      };
    });
  };

  // Paid / unpaid is now tracked per entry (cell): paidCells[rowKey][colName] = true
  const handleToggleCellPaid = (category, year, month, cutoff, colName) => {
    const rowKey = `${year}-${month}-${cutoff}`;
    setLoanTableData(prev => {
      const catData = prev[category] || initialLoanData[category] || { columns: [], cells: {}, paidStatus: {} };
      if (!(parseFloat(catData.cells[rowKey]?.[colName]) || 0)) return prev;
      const paidCells = catData.paidCells || {};
      const rowPaid = paidCells[rowKey] || {};
      return {
        ...prev,
        [category]: {
          ...catData,
          paidCells: { ...paidCells, [rowKey]: { ...rowPaid, [colName]: !rowPaid[colName] } }
        }
      };
    });
  };

  // Old data marked a whole row as paid. Convert that once into per-entry paid flags.
  useEffect(() => {
    const hasLegacy = loanCategories.some(cat => Object.values(loanTableData[cat]?.paidStatus || {}).some(Boolean));
    if (!hasLegacy) return;
    setLoanTableData(prev => {
      const next = { ...prev };
      loanCategories.forEach(cat => {
        const catData = prev[cat];
        if (!catData || !catData.paidStatus) return;
        const paidCells = { ...(catData.paidCells || {}) };
        const paidStatus = { ...catData.paidStatus };
        Object.keys(paidStatus).forEach(rowKey => {
          if (!paidStatus[rowKey]) return;
          const rowPaid = { ...(paidCells[rowKey] || {}) };
          Object.entries(catData.cells?.[rowKey] || {}).forEach(([col, v]) => {
            if ((parseFloat(v) || 0) !== 0 && rowPaid[col] === undefined) rowPaid[col] = true;
          });
          paidCells[rowKey] = rowPaid;
          delete paidStatus[rowKey];
        });
        next[cat] = { ...catData, paidCells, paidStatus };
      });
      return next;
    });
  }, [loanTableData]);

  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      alert('Please enter a valid column name.');
      return;
    }
    const colTrim = newColumnName.trim();
    setLoanTableData(prev => {
      const catData = prev[activeLoanCategory] || initialLoanData[activeLoanCategory];
      if (catData.columns.includes(colTrim)) {
        alert('Column already exists!');
        return prev;
      }
      return {
        ...prev,
        [activeLoanCategory]: { ...catData, columns: [...catData.columns, colTrim] }
      };
    });
    setNewColumnName('');
    setIsAddColumnModalOpen(false);
  };

  const handleDeleteColumn = (colName) => {
    if (window.confirm(`Are you sure you want to delete column "${colName}"?`)) {
      setLoanTableData(prev => {
        const catData = prev[activeLoanCategory] || initialLoanData[activeLoanCategory];
        const updatedColumns = catData.columns.filter(c => c !== colName);
        
        const updatedCells = {};
        Object.entries(catData.cells || {}).forEach(([rowKey, rowCells]) => {
          const newRowCells = { ...rowCells };
          delete newRowCells[colName];
          if (Object.keys(newRowCells).length > 0) {
            updatedCells[rowKey] = newRowCells;
          }
        });

        const updatedPaidCells = {};
        Object.entries(catData.paidCells || {}).forEach(([rowKey, rowPaid]) => {
          const newRowPaid = { ...rowPaid };
          delete newRowPaid[colName];
          updatedPaidCells[rowKey] = newRowPaid;
        });

        return {
          ...prev,
          [activeLoanCategory]: {
            ...catData,
            columns: updatedColumns,
            cells: updatedCells,
            paidCells: updatedPaidCells
          }
        };
      });
    }
  };

  // Amounts of one category row: total, paid part, unpaid part (paid entries are deducted from the row total)
  const getRowAmounts = (catData, rowKey) => {
    const rowCells = catData?.cells?.[rowKey] || {};
    let total = 0, paid = 0, unpaid = 0;
    Object.entries(rowCells).forEach(([col, v]) => {
      // amounts left behind by a deleted column are not on the table, so they must not be counted either
      if (catData?.columns && !catData.columns.includes(col)) return;
      const n = parseFloat(v) || 0;
      if (n === 0) return;
      total += n;
      if (catData?.paidCells?.[rowKey]?.[col]) paid += n; else unpaid += n;
    });
    return { total, paid, unpaid, allPaid: unpaid === 0 };
  };

  const getCutoffSummary = (month, year, cutoff) => {
    let totalAmt = 0;
    let isPaid = true;
    let hasEntries = false;

    loanCategories.forEach(cat => {
      const catData = loanTableData[cat];
      if (!catData) return;
      const r = getRowAmounts(catData, `${year}-${month}-${cutoff}`);
      if (r.total > 0) {
        hasEntries = true;
        totalAmt += r.unpaid; // paid entries are deducted: only what is still payable is shown
        if (!r.allPaid) isPaid = false;
      }
    });

    return { total: totalAmt, paid: hasEntries ? isPaid : false, hasEntries };
  };

  const dashMonthName = months[dashMonthIndex];
  const dash15Summary = getCutoffSummary(dashMonthName, dashYear, '15th');
  const dash30Summary = getCutoffSummary(dashMonthName, dashYear, '30th');
  const totalDashMonthLoans = dash15Summary.total + dash30Summary.total;

  const currentMonthName = months[currentMonthIndex];
  const current15Summary = getCutoffSummary(currentMonthName, currentYear, '15th');
  const current30Summary = getCutoffSummary(currentMonthName, currentYear, '30th');

  const totalConsolidatedLoansAmt = current15Summary.total + current30Summary.total;
  const isConsolidatedLoansPaid = (current15Summary.hasEntries || current30Summary.hasEntries) && 
    (current15Summary.hasEntries ? current15Summary.paid : true) && 
    (current30Summary.hasEntries ? current30Summary.paid : true);

  let yearTotalCost = 0;
  let yearTotalPaid = 0;
  let yearTotalUnpaid = 0;

  months.forEach(m => {
    ['15th', '30th'].forEach(cutoff => {
      loanCategories.forEach(cat => {
        const catData = loanTableData[cat];
        if (!catData) return;
        const r = getRowAmounts(catData, `${loanTableYear}-${m}-${cutoff}`);
        if (r.total > 0) {
          yearTotalCost += r.total;
          yearTotalPaid += r.paid;
          yearTotalUnpaid += r.unpaid;
        }
      });
    });
  });

  const [savingsGoals, setSavingsGoals] = useFirebaseSync('kutitap_savings', []);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newStartMonthIndex, setNewStartMonthIndex] = useState(7);
  const [newStartYear, setNewStartYear] = useState(2026);
  const [newEndMonthIndex, setNewEndMonthIndex] = useState(11);
  const [newEndYear, setNewEndYear] = useState(2026);

  const handleCreateSavingsGoal = () => {
    if (!newGoalName.trim() || !newGoalAmount) {
      alert('Please enter a valid goal name and amount.');
      return;
    }
    const totalAmt = parseFloat(newGoalAmount) || 0;
    const startIndex = newStartYear * 12 + newStartMonthIndex;
    const endIndex = newEndYear * 12 + newEndMonthIndex;
    const diffMonths = endIndex >= startIndex ? (endIndex - startIndex + 1) : 1;
    const monthlyAmt = Math.round(totalAmt / diffMonths);

    const generatedMonths = [];
    let currM = newStartMonthIndex;
    let currY = newStartYear;

    for (let i = 0; i < diffMonths; i++) {
      generatedMonths.push({
        monthKey: `${months[currM]}-${currY}`,
        amount: i === diffMonths - 1 ? (totalAmt - (monthlyAmt * (diffMonths - 1))) : monthlyAmt,
        paid: false
      });
      currM++;
      if (currM > 11) { currM = 0; currY++; }
    }

    const newGoal = {
      id: Date.now(),
      name: newGoalName.trim(),
      goalAmount: totalAmt,
      startMonth: months[newStartMonthIndex],
      startYear: newStartYear,
      endMonth: months[newEndMonthIndex],
      endYear: newEndYear,
      monthsList: generatedMonths
    };

    setSavingsGoals(prev => [...prev, newGoal]);
    setNewGoalName('');
    setNewGoalAmount('');
    setIsAddGoalModalOpen(false);
  };

  const handleDeleteGoal = (id) => setSavingsGoals(prev => prev.filter(g => g.id !== id));

  // Edit an existing goal
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalAmount, setEditGoalAmount] = useState('');
  const [editStartMonthIndex, setEditStartMonthIndex] = useState(0);
  const [editStartYear, setEditStartYear] = useState(2026);
  const [editEndMonthIndex, setEditEndMonthIndex] = useState(0);
  const [editEndYear, setEditEndYear] = useState(2026);

  const parseMonthKey = (key) => {
    const [mName, yStr] = (key || '').split('-');
    return { monthIndex: Math.max(0, months.indexOf(mName)), year: parseInt(yStr) || 2026 };
  };

  const handleOpenEditGoal = (goal) => {
    const first = parseMonthKey(goal.monthsList[0]?.monthKey);
    const last = parseMonthKey(goal.monthsList[goal.monthsList.length - 1]?.monthKey);
    setEditingGoalId(goal.id);
    setEditGoalName(goal.name);
    setEditGoalAmount(String(goal.goalAmount ?? ''));
    setEditStartMonthIndex(first.monthIndex);
    setEditStartYear(first.year);
    setEditEndMonthIndex(last.monthIndex);
    setEditEndYear(last.year);
  };

  const handleSaveEditedGoal = () => {
    const goal = savingsGoals.find(g => g.id === editingGoalId);
    if (!goal) { setEditingGoalId(null); return; }
    if (!editGoalName.trim() || !editGoalAmount) {
      alert('Please enter a valid goal name and amount.');
      return;
    }
    const totalAmt = parseFloat(editGoalAmount) || 0;
    const startIndex = editStartYear * 12 + editStartMonthIndex;
    const endIndex = editEndYear * 12 + editEndMonthIndex;
    const diffMonths = endIndex >= startIndex ? (endIndex - startIndex + 1) : 1;

    const newKeys = [];
    let currM = editStartMonthIndex;
    let currY = editStartYear;
    for (let i = 0; i < diffMonths; i++) {
      newKeys.push(`${months[currM]}-${currY}`);
      currM++;
      if (currM > 11) { currM = 0; currY++; }
    }

    const oldKeys = goal.monthsList.map(m => m.monthKey);
    const scheduleUnchanged = totalAmt === goal.goalAmount && newKeys.length === oldKeys.length && newKeys.every((k, i) => k === oldKeys[i]);

    let updatedGoal;
    if (scheduleUnchanged) {
      // only the name changed: leave the schedule (and any manual amounts) alone
      updatedGoal = { ...goal, name: editGoalName.trim() };
    } else {
      const paidByKey = {};
      goal.monthsList.forEach(m => { if (m.paid) paidByKey[m.monthKey] = m; });
      const droppedPaid = Object.keys(paidByKey).filter(k => !newKeys.includes(k));
      if (droppedPaid.length > 0 && !window.confirm(`${droppedPaid.length} month(s) already marked Paid fall outside the new dates and will be removed from this goal. Continue?`)) {
        return;
      }
      // months already paid keep their amount; the rest of the goal is spread over the unpaid months
      const keptPaidTotal = newKeys.reduce((sum, k) => sum + (paidByKey[k] ? (parseFloat(paidByKey[k].amount) || 0) : 0), 0);
      const unpaidKeys = newKeys.filter(k => !paidByKey[k]);
      const remaining = Math.max(0, totalAmt - keptPaidTotal);
      const each = unpaidKeys.length > 0 ? Math.round(remaining / unpaidKeys.length) : 0;
      let seen = 0;
      const monthsList = newKeys.map(k => {
        if (paidByKey[k]) return { ...paidByKey[k] };
        seen++;
        const amount = seen === unpaidKeys.length ? remaining - each * (unpaidKeys.length - 1) : each;
        return { monthKey: k, amount: Math.max(0, amount), paid: false };
      });
      updatedGoal = {
        ...goal,
        name: editGoalName.trim(),
        goalAmount: totalAmt,
        startMonth: months[editStartMonthIndex],
        startYear: editStartYear,
        endMonth: months[editEndMonthIndex],
        endYear: editEndYear,
        monthsList
      };
    }
    setSavingsGoals(prev => prev.map(g => (g.id === editingGoalId ? updatedGoal : g)));
    setEditingGoalId(null);
  };

  // Auto-compute on (default): changing one month re-spreads the rest. Off: only that month changes.
  const handleToggleGoalAutoCompute = (goalId) => {
    setSavingsGoals(prev => prev.map(g => (g.id === goalId ? { ...g, autoCompute: g.autoCompute === false } : g)));
  };

  const handleGoalMonthAmountChange = (goalId, monthKey, value) => {
    setSavingsGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const numericVal = value === '' ? 0 : parseFloat(value) || 0;

      if (goal.autoCompute === false) {
        return {
          ...goal,
          monthsList: goal.monthsList.map(m => (m.monthKey === monthKey ? { ...m, amount: value === '' ? '' : numericVal } : m))
        };
      }
      const totalGoal = goal.goalAmount || 0;

      const newMonthsList = goal.monthsList.map(m => {
        if (m.monthKey === monthKey) {
          return { ...m, amount: value === '' ? '' : numericVal };
        }
        return m;
      });

      const unassignedTarget = Math.max(0, totalGoal - numericVal);
      const adjustableItems = newMonthsList.filter(m => m.monthKey !== monthKey);

      if (adjustableItems.length > 0) {
        const eachSplit = Math.round(unassignedTarget / adjustableItems.length);
        let accumulated = 0;
        
        return {
          ...goal,
          monthsList: goal.monthsList.map((m, idx) => {
            if (m.monthKey === monthKey) {
              return { ...m, amount: value === '' ? '' : numericVal };
            }
            const isLast = idx === goal.monthsList.length - 1 || (idx === goal.monthsList.length - 2 && goal.monthsList[goal.monthsList.length - 1].monthKey === monthKey);
            const assignedAmt = isLast ? (unassignedTarget - accumulated) : eachSplit;
            accumulated += assignedAmt;
            return { ...m, amount: Math.max(0, assignedAmt) };
          })
        };
      }
      return goal;
    }));
  };

  const handleGoalMonthTogglePaid = (goalId, monthKey) => {
    setSavingsGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const updatedMonths = goal.monthsList.map(m => m.monthKey === monthKey ? { ...m, paid: !m.paid } : m);
      return { ...goal, monthsList: updatedMonths };
    }));
  };

  const totalSavingsGoalsAmount = savingsGoals.reduce((sum, g) => sum + (parseFloat(g.goalAmount) || 0), 0);
  const totalSavingsSavedAmount = savingsGoals.reduce((sum, g) => {
    const goalSaved = g.monthsList.reduce((mSum, m) => mSum + (m.paid ? (parseFloat(m.amount) || 0) : 0), 0);
    return sum + goalSaved;
  }, 0);
  const totalSavingsAmountLeft = Math.max(0, totalSavingsGoalsAmount - totalSavingsSavedAmount);
  const activeSavingsCount = savingsGoals.length;
  const overallSavingsProgressPct = totalSavingsGoalsAmount > 0 ? Math.min(100, Math.round((totalSavingsSavedAmount / totalSavingsGoalsAmount) * 100)) : 0;

  const [monthlyExpenses, setMonthlyExpenses] = useFirebaseSync('kutitap_expenses', {});
  const currentExpenses = monthlyExpenses[currentKey] || [];

  const handleAddExpense = () => {
    const updated = [...currentExpenses, { id: Date.now(), category: '', amount: '', paid: false }];
    setMonthlyExpenses(prev => ({ ...prev, [currentKey]: updated }));
  };

  const handleExpenseChange = (id, field, value) => {
    const updated = currentExpenses.map(item => item.id === id ? { ...item, [field]: value } : item);
    setMonthlyExpenses(prev => ({ ...prev, [currentKey]: updated }));
  };

  const handleExpenseTogglePaid = (id) => {
    const updated = currentExpenses.map(item => item.id === id ? { ...item, paid: !item.paid } : item);
    setMonthlyExpenses(prev => ({ ...prev, [currentKey]: updated }));
  };

  const handleDeleteExpense = (id) => {
    const updated = currentExpenses.filter(item => item.id !== id);
    setMonthlyExpenses(prev => ({ ...prev, [currentKey]: updated }));
  };

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) { setCurrentMonthIndex(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonthIndex(currentMonthIndex - 1);
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) { setCurrentMonthIndex(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonthIndex(currentMonthIndex + 1);
  };

  const [attMonthIndex, setAttMonthIndex] = useState(() => new Date().getMonth());
  const [attYear, setAttYear] = useState(() => new Date().getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useFirebaseSync('kutitap_attendance', {});
  const [isSwipingID, setIsSwipingID] = useState(false);

  const attMonthName = months[attMonthIndex];
  const maxAttYears = Array.from({ length: 11 }, (_, i) => 2026 + i);

  const currentDate = new Date();
  const currentY = currentDate.getFullYear();
  const currentM = currentDate.getMonth();
  
  const isPastMonth = attYear < currentY || (attYear === currentY && attMonthIndex < currentM);
  const lastDayOfAttMonth = new Date(attYear, attMonthIndex + 1, 0).getDate();
  const pastDateStr = `${attYear}-${String(attMonthIndex + 1).padStart(2, '0')}-${String(lastDayOfAttMonth).padStart(2, '0')}`;

  useEffect(() => {
    if (isPastMonth && !historicalRates[pastDateStr]) {
      fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${pastDateStr}/v1/currencies/usd.json`)
        .then(res => res.json())
        .then(data => {
          if (data && data.usd && data.usd.php) {
            setHistoricalRates(prev => ({ ...prev, [pastDateStr]: data.usd.php }));
          }
        })
        .catch(err => {
          console.warn("Historical rate fetch failed", err);
          setHistoricalRates(prev => ({ ...prev, [pastDateStr]: usdToPhpRate }));
        });
    }
  }, [attYear, attMonthIndex, isPastMonth, pastDateStr, historicalRates, usdToPhpRate]);

  const displayRate = isPastMonth ? (historicalRates[pastDateStr] || usdToPhpRate) : usdToPhpRate;

  const getWorkingDaysInMonth = (mIdx, yVal) => {
    const days = [];
    const totalDays = new Date(yVal, mIdx + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(yVal, mIdx, d);
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) days.push(d);
    }
    return days;
  };

  const workingDays = getWorkingDaysInMonth(attMonthIndex, attYear);

  const evaluateStatusFromTime = (timeDate) => {
    const hours = timeDate.getHours();
    const minutes = timeDate.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes > 7 * 60 && totalMinutes <= 21 * 60) return 'Out of Shift';
    else if (totalMinutes > 21 * 60 && totalMinutes <= 22 * 60) return 'Present';
    else return 'Late';
  };

  const handleTimeInToday = () => {
    const today = new Date();
    const currentHour = today.getHours();
    
    let targetDate = new Date(today);
    if (currentHour >= 0 && currentHour <= 7) {
      targetDate.setDate(targetDate.getDate() - 1);
    }

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;

    const existing = attendanceRecords[dateKey];
    if (existing && existing.timedIn) {
      alert("You have already timed in for this shift date!");
      return;
    }

    const timeString = today.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    const evaluatedStatus = evaluateStatusFromTime(today);

    setIsSwipingID(true);
    setTimeout(() => setIsSwipingID(false), 800);

    setAttendanceRecords(prev => ({
      ...prev,
      [dateKey]: { timedIn: true, time: timeString, status: evaluatedStatus, holidayOrLeave: '' }
    }));
  };

  const handleUpdateDayStatus = (dateKey, field, value) => {
    setAttendanceRecords(prev => {
      const existing = prev[dateKey] || { timedIn: false, time: '-', status: '-', holidayOrLeave: '' };
      return { ...prev, [dateKey]: { ...existing, [field]: value } };
    });
  };

  let totalWorkedHours = 0;
  workingDays.forEach(d => {
    const ddStr = String(d).padStart(2, '0');
    const mmStr = String(attMonthIndex + 1).padStart(2, '0');
    const dateKey = `${attYear}-${mmStr}-${ddStr}`;
    const rec = attendanceRecords[dateKey];
    if (rec && (rec.status === 'Present' || rec.status === 'Late')) {
      totalWorkedHours += 8;
    }
  });

  const estimatedSalaryPHP = Math.round(totalWorkedHours * 7.50 * displayRate);

  useEffect(() => {
    // Salary earned this month is paid next month, so it becomes next month's Expected Income
    const nextMonthIndex = (attMonthIndex + 1) % 12;
    const nextMonthYear = attMonthIndex === 11 ? attYear + 1 : attYear;
    const targetKey = `${months[nextMonthIndex]}-${nextMonthYear}`;
    setIncomes(prev => {
      const existing = prev[targetKey] || { expected: '', actual: '' };
      if (existing.expected === String(estimatedSalaryPHP)) return prev;
      return {
        ...prev,
        [targetKey]: { ...existing, expected: String(estimatedSalaryPHP) }
      };
    });
  }, [estimatedSalaryPHP, attMonthIndex, attYear]);

  const handleGenerateInvoicePDF = () => {
    const weeksMap = {};
    workingDays.forEach(d => {
      const firstDayOfMonth = new Date(attYear, attMonthIndex, 1).getDay();
      const weekNum = Math.floor((d + firstDayOfMonth - 1) / 7) + 1;
      
      const mmStr = String(attMonthIndex + 1).padStart(2, '0');
      const ddStr = String(d).padStart(2, '0');
      const dateKey = `${attYear}-${mmStr}-${ddStr}`;
      const rec = attendanceRecords[dateKey];
      const isWorked = rec && (rec.status === 'Present' || rec.status === 'Late');

      if (!weeksMap[weekNum]) weeksMap[weekNum] = [];
      weeksMap[weekNum].push({ day: d, worked: isWorked });
    });

    const monthShortName = attMonthName.slice(0, 3);
    const formattedWeeks = Object.entries(weeksMap).map(([wNum, daysArr]) => {
      const workedDaysInWeek = daysArr.filter(item => item.worked);
      const hoursWorked = workedDaysInWeek.length * 8;
      
      let dateStr = '';
      if (daysArr.length > 0) {
        const firstDay = daysArr[0].day;
        const lastDay = daysArr[daysArr.length - 1].day;
        const getOrdinal = (n) => {
          const s = ["th", "st", "nd", "rd"];
          const v = n % 100;
          return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        dateStr = `${monthShortName} ${getOrdinal(firstDay)} - ${monthShortName} ${getOrdinal(lastDay)} ${attYear}`;
      }
      return { workPerformed: `Week ${wNum}`, datesWorked: dateStr, hours: hoursWorked };
    }).filter(w => w.hours > 0);

    const totalInvoiceHours = formattedWeeks.reduce((sum, w) => sum + w.hours, 0);
    const payForHoursWorked = totalInvoiceHours * 7.50;
    const formattedPay = `$${payForHoursWorked.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Hannah Mae Pascaran - ${attMonthName}, ${attYear} Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; color: #000; margin: 30px; font-size: 11px; line-height: 1.3; }
          h2 { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 20px; }
          .section-header { font-weight: bold; background-color: #f2f2f2; padding: 4px 6px; margin-top: 10px; margin-bottom: 5px; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          td, th { border: 1px solid #d3d3d3; padding: 6px 8px; vertical-align: top; }
          th { background-color: #f9f9f9; font-weight: bold; text-align: left; }
          .right { text-align: right; }
          .notes { font-size: 10px; color: #333; margin-top: 15px; }
        </style>
      </head>
      <body>
        <h2>INDEPENDENT CONTRACTOR INVOICE</h2>
        <table><tr><td style="width: 30%;"><strong>INVOICE TO:</strong></td><td>Boostability</td></tr><tr><td><strong>INVOICE DATE:</strong></td><td>${attMonthName}-${attYear}</td></tr></table>
        <div class="section-header">CONTRACTOR INFORMATION</div>
        <table><tr><td style="width: 30%;"><strong>NAME:</strong></td><td>Hannah Mae Pascaran</td></tr><tr><td><strong>PHONE NUMBER:</strong></td><td>09950281082</td></tr><tr><td><strong>EMAIL:</strong></td><td>hannahmae.pascaran@gmail.com</td></tr><tr><td><strong>ADDRESS:</strong></td><td>Block 14 Lot 15 Daphne Road Molino Parkhomes Queen's Row West Bacoor City 4102, Cavite Philippines</td></tr></table>
        <div class="section-header">PAYMENT INFORMATION</div>
        <table><tr><td style="width: 30%;"><strong>HOURLY RATE ($USD):</strong></td><td>$7.50</td></tr><tr><td><strong>BANK NAME:</strong></td><td>GoTyme Bank</td></tr><tr><td><strong>ACCOUNT NAME:</strong></td><td>Hannah Mae Pascaran</td></tr><tr><td><strong>ACCOUNT NUMBER:</strong></td><td>010680295154</td></tr><tr><td><strong>SWIFT NUMBER:</strong></td><td>GOTYPHM2XXX</td></tr><tr><td><strong>ADDRESS ASSOCIATED WITH ACCOUNT:</strong></td><td>21st Floor Giga Tower, Bridgetowne, C5 Road, Brgy Ugong Norte, E. Rodriguez Jr. Ave 1110 Quezon City, Philippines</td></tr></table>
        <div class="section-header">WORK PERFORMED</div>
        <table>
          <thead><tr><th style="width: 35%;">WORK PERFORMED</th><th style="width: 45%;">DATES WORKED</th><th class="right" style="width: 20%;">NUMBER OF HOURS WORKED</th></tr></thead>
          <tbody>
            ${formattedWeeks.map(w => `<tr><td>${w.workPerformed}</td><td>${w.datesWorked}</td><td class="right">${w.hours}</td></tr>`).join('')}
            <tr><td><strong>TOTAL HOURS</strong></td><td></td><td class="right"><strong>${totalInvoiceHours}</strong></td></tr>
            <tr><td><strong>PAY FOR HOURS WORKED</strong></td><td></td><td class="right"><strong>${formattedPay}</strong></td></tr>
            <tr><td><strong>OTHER AMOUNT</strong><br><span style="font-size:9px; color:#555;">Reason for Other Amount</span></td><td></td><td class="right"><strong>$0.00</strong></td></tr>
            <tr><td><strong>TOTAL PAYMENT OWED</strong></td><td></td><td class="right"><strong>${formattedPay}</strong></td></tr>
          </tbody>
        </table>
        <div class="notes"><p><strong>Payment Schedule:</strong><br>Your payment will be processed by the 5th business day of each month.</p></div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      alert("Please allow pop-ups to generate and print your PDF invoice.");
    }
  };

  const actualNum = parseFloat(currentIncome.actual) || 0;
  const expectedNum = parseFloat(currentIncome.expected) || 0;
  const diffNum = actualNum - expectedNum;

  const currentMonthSavingsItems = savingsGoals.map(goal => {
    const found = goal.monthsList.find(m => m.monthKey === currentKey);
    return { goalId: goal.id, name: goal.name, amount: found ? found.amount : 0, paid: found ? found.paid : false, exists: !!found };
  }).filter(item => item.exists);

  const savingsTotalFromGoals = currentMonthSavingsItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const utilityItems = Object.values(currentUtilityBills);
  const obligationItems = [...utilityItems, ...currentMonthSavingsItems];
  // the Loans row has no Paid/Not Paid button, so it is not part of the paid percentage

  const utilityTotal = utilityItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const obligationTotal = utilityTotal + totalConsolidatedLoansAmt + savingsTotalFromGoals;
  const obligationPaidCount = obligationItems.filter(item => item.paid).length;
  const obligationPaidPct = obligationItems.length > 0 ? Math.round((obligationPaidCount / obligationItems.length) * 100) : 0;

  const expenseTotal = currentExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const activeExpenseCount = currentExpenses.length;
  const expensePaidCount = currentExpenses.filter(item => item.paid && item.category.trim() !== '').length;
  const expensePaidPct = activeExpenseCount > 0 ? Math.round((expensePaidCount / activeExpenseCount) * 100) : 0;

  const monthlyDueTotal = obligationTotal + expenseTotal;
  const remainingBudget = actualNum - monthlyDueTotal;

  const [dashFilterYear, setDashFilterYear] = useState(() => new Date().getFullYear());
  let annualActualIncomeSum = 0;
  months.forEach(m => {
    const mKey = `${m}-${dashFilterYear}`;
    const inc = incomes[mKey];
    if (inc && inc.actual) annualActualIncomeSum += parseFloat(inc.actual || 0);
  });

  let annualDuesSum = 0;
  months.forEach(m => {
    const mKey = `${m}-${dashFilterYear}`;
    const utils = utilityBills[mKey];
    if (utils) Object.values(utils).forEach(u => { annualDuesSum += parseFloat(u.amount || 0); });
    const exps = monthlyExpenses[mKey];
    if (exps) exps.forEach(e => { annualDuesSum += parseFloat(e.amount || 0); });
    ['15th', '30th'].forEach(cutoff => {
      loanCategories.forEach(cat => {
        const catData = loanTableData[cat];
        if (catData) {
          const rKey = `${dashFilterYear}-${m}-${cutoff}`;
          annualDuesSum += getRowAmounts(catData, rKey).total;
        }
      });
    });
  });

  const currentHourVal = new Date().getHours();
  let timeGreeting = "Good evening";
  if (currentHourVal < 12) timeGreeting = "Good morning";
  else if (currentHourVal < 18) timeGreeting = "Good afternoon";

  const funQuotesPool = [
    { text: "Your goals are sparkling! Let's get that money right and sweet! ✨" },
    { text: "Small steps make big leaps. Cozy moves, zero budget stress!" },
    { text: "March into savings like the shining star you are! ✨" },
    { text: "Bloom where you're planted, and sweeten your bank account too! 🌸" },
    { text: "Sunshine is warm, but your financial goals are brighter. Let's crush them! ☀️" }
  ];
  const currentQuote = funQuotesPool[currentMonthIndex % funQuotesPool.length];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'income-expense', label: 'Income & Expense', icon: Receipt },
    { id: 'savings', label: 'Savings', icon: PiggyBank },
    { id: 'loans', label: 'Loans', icon: CreditCard },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  ];

  return (
    <>
      <script src="https://cdn.tailwindcss.com"></script>
      <PixelFX />
      <div className="px-root" style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--px-paper)',
        fontFamily: "'Quicksand', sans-serif",
        color: 'var(--ink)',
        display: 'flex',
        boxSizing: 'border-box',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        backgroundImage: 'radial-gradient(var(--px-sun) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px'
      }}>
        {/* SIDEBAR */}
        <div className="px-sidebar" style={{
          width: isSidebarOpen ? '260px' : '80px',
          minWidth: isSidebarOpen ? '260px' : '80px',
          backgroundColor: '#FFFFFF',
          borderRadius: 0, '--px': 'panel',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 16px',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          height: '100vh',
          boxShadow: '8px 0 30px rgba(223,177,91,0.15)',
          zIndex: 10,
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              {isSidebarOpen && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sprite src={spFlower} className="px-logo-sprite" />
                  <span className="kutitap-title px-logo">Kutitap</span>
                </div>
              )}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                style={{
                  backgroundColor: 'var(--px-card)',
                  borderRadius: 0, '--px': 'pill',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--px-accent)',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(223,177,91,0.2)',
                  margin: isSidebarOpen ? '0' : '0 auto'
                }}
              >
                {isSidebarOpen ? <ChevronLeft style={{ width: '16px', height: '16px' }} /> : <ChevronRight style={{ width: '16px', height: '16px' }} />}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {navItems.map(item => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`px-nav${isActive ? ' px-nav-active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: 0, '--px': 'pill',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      backgroundColor: isActive ? 'var(--px-sun)' : 'transparent',
                      color: isActive ? 'var(--ink)' : 'var(--px-muted)',
                      boxShadow: isActive ? '0 6px 16px rgba(255,234,167,0.5)' : 'none'
                    }}
                  >
                    <Sprite src={NAV_SPRITES[item.id]} className="px-nav-sprite" />
                    {isSidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isSidebarOpen ? (
              <div style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'card', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(223,177,91,0.1)' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: 0, '--px': 'pill', backgroundColor: 'var(--px-sun)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--px-accent)', flexShrink: 0, fontSize: '14px' }}>
                  <Sprite src={spBunny} className="px-avatar-sprite" />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Hannah Mae</div>
                  <div style={{ fontSize: '11px', color: 'var(--px-lav)', fontWeight: 600 }}>Sweet Planner</div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <Sprite src={spBunny} className="px-avatar-sprite" />
              </div>
            )}

            <button
              onClick={() => alert("Sign In / Sign Out action triggered!")}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 0, '--px': 'pill',
                backgroundColor: 'var(--px-butter)',
                color: 'var(--px-accent)',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(223,177,91,0.15)'
              }}
            >
              <LogOut style={{ width: '16px', height: '16px' }} />
              {isSidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="px-main" style={{ flex: 1, height: '100vh', padding: '24px 32px', boxSizing: 'border-box', overflowY: 'auto', display: 'flex', flexDirection: 'column', width: '100%' }}>

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '20px' }}>
              <div style={{ background: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '24px 28px', boxShadow: '0 12px 35px rgba(223,177,91,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles style={{ width: '16px', height: '16px' }} /> Overview
                  </div>
                  <h2 className="kutitap-title" style={{ fontSize: '26px', color: 'var(--ink)', margin: 0 }}>
                    {timeGreeting}, Hannah Mae! ✨
                  </h2>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--px-muted)', marginTop: '4px', marginBottom: 0 }}>
                    Here is your cozy financial summary filtered for year <span style={{ color: 'var(--px-accent)', fontWeight: 800 }}>{dashFilterYear}</span>.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FFFFFF', padding: '8px 16px', borderRadius: 0, '--px': 'pill', boxShadow: '0 4px 15px rgba(223,177,91,0.15)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)' }}>Filter Year:</span>
                  <select
                    value={dashFilterYear}
                    onChange={(e) => setDashFilterYear(parseInt(e.target.value))}
                    style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'pill', padding: '6px 14px', fontWeight: 800, color: 'var(--px-accent)', fontSize: '13px', cursor: 'pointer' }}
                  >
                    {availableYears.map(y => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '20px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase' }}>Annual Income ({dashFilterYear})</span>
                    <Sprite src={spApple} className="px-card-sprite" />
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>
                    ₱{annualActualIncomeSum.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--px-muted)' }}>
                    Actual income recorded
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '20px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase' }}>Annual Dues & Expenses</span>
                    <Sprite src={spDango} className="px-card-sprite" />
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>
                    ₱{annualDuesSum.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--px-muted)' }}>
                    Utilities, Bills & Expenses
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--px-mint-lt)', borderRadius: 0, '--px': 'panel', padding: '20px', boxShadow: '0 8px 25px rgba(200,230,201,0.25)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--px-green-d)', textTransform: 'uppercase' }}>Total Saved Amount</span>
                    <Sprite src={spStrawberry} className="px-card-sprite" />
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--px-green-d)' }}>
                    ₱{totalSavingsSavedAmount.toLocaleString()} <span style={{ fontSize: '13px' }}>({overallSavingsProgressPct}%)</span>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--px-green-d)' }}>
                    Goal Target: ₱{totalSavingsGoalsAmount.toLocaleString()}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'panel', padding: '20px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase' }}>Loan Balances ({dashFilterYear})</span>
                    <Sprite src={spStamp} className="px-card-sprite" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--px-green-d)' }}>PAID</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--px-green-d)' }}>₱{yearTotalPaid.toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--px-accent)' }}>UNPAID</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--px-accent)' }}>₱{yearTotalUnpaid.toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--px-muted)', marginTop: '4px' }}>
                    Total Cost: ₱{yearTotalCost.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="px-dash-grid">
                <div style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '24px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="kutitap-title" style={{ fontSize: '16px', color: 'var(--px-accent)', textTransform: 'uppercase', paddingBottom: '8px', borderBottom: '2px dashed var(--px-sun)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutDashboard style={{ width: '18px', height: '18px' }} /> Year-at-a-Glance Summary ({dashFilterYear})
                  </div>

                  {(() => {
                    const income = annualActualIncomeSum;
                    const pctOfIncome = (v) => (income > 0 ? Math.round((v / income) * 100) : 0);
                    const leftOver = annualActualIncomeSum - annualDuesSum;
                    const money = (v) => (v < 0 ? `-₱${Math.abs(v).toLocaleString()}` : `₱${v.toLocaleString()}`);
                    const rows = [
                      { key: 'income', icon: spApple, label: 'Total Annual Actual Income', value: money(annualActualIncomeSum), tone: 'green', pct: income > 0 ? 100 : 0, cap: 'earned' },
                      { key: 'dues', icon: spDango, label: 'Total Annual Obligations & Expenses', value: money(annualDuesSum), tone: 'pink', pct: pctOfIncome(annualDuesSum), cap: 'of income' },
                      { key: 'save', icon: spStrawberry, label: 'Total Savings Goals Accumulation', value: `₱${totalSavingsSavedAmount.toLocaleString()} / ₱${totalSavingsGoalsAmount.toLocaleString()}`, tone: 'green', pct: overallSavingsProgressPct, cap: 'of goal' },
                      { key: 'loan', icon: spStamp, label: 'Remaining Outstanding Loans', value: money(yearTotalUnpaid), tone: 'pink', pct: yearTotalCost > 0 ? Math.round((yearTotalPaid / yearTotalCost) * 100) : 0, cap: 'repaid' },
                      { key: 'left', icon: spClover, label: 'Coins Left After Obligations', value: money(leftOver), tone: leftOver >= 0 ? 'green' : 'pink', pct: leftOver > 0 ? pctOfIncome(leftOver) : 0, cap: 'of income' }
                    ];
                    return (
                      <div style={{ flex: 1, display: 'flex' }}>
                        <table className="px-fun-table">
                          <thead>
                            <tr><th>Stat</th><th>Amount</th><th>Meter</th></tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.key}>
                                <td>
                                  <div className="px-fun-stat"><Sprite src={r.icon} className="px-fun-icon" /><span>{r.label}</span></div>
                                </td>
                                <td><span className={`px-fun-val px-fun-${r.tone}`}>{r.value}</span></td>
                                <td>
                                  <PixelMeter pct={r.pct} tone={r.tone} />
                                  <span className="px-fun-cap">{Math.max(0, Math.min(100, r.pct))}% {r.cap}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                <ClawMachine />
              </div>
            </div>
          )}

          {/* INCOME & EXPENSE TAB */}
          {activeTab === 'income-expense' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px', position: 'relative', flexShrink: 0 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '14px' }}>
                  <button onClick={handlePrevMonth} style={{ backgroundColor: '#FFFFFF', borderRadius: 0, '--px': 'pill', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--px-accent)', fontWeight: 800, boxShadow: '0 4px 12px rgba(223,177,91,0.2)' }}>
                    <ChevronLeft style={{ width: '16px', height: '16px' }} />
                  </button>

                  <h2 onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)} className="kutitap-title" style={{ fontSize: '28px', color: 'var(--px-accent)', margin: 0, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {months[currentMonthIndex]} <span>{currentYear}</span>
                    <ChevronDown style={{ width: '16px', height: '16px', color: 'var(--px-muted)' }} />
                  </h2>

                  <button onClick={handleNextMonth} style={{ backgroundColor: '#FFFFFF', borderRadius: 0, '--px': 'pill', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--px-accent)', fontWeight: 800, boxShadow: '0 4px 12px rgba(223,177,91,0.2)' }}>
                    <ChevronRight style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>

                {isMonthPickerOpen && (
                  <div style={{ position: 'absolute', top: '55px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#FFFFFF', borderRadius: 0, '--px': 'panel', padding: '20px', boxShadow: '0 20px 40px rgba(223,177,91,0.25)', zIndex: 100, width: '320px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase' }}>Select Month & Year</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setCurrentYear(Math.max(2024, currentYear - 1))} style={{ padding: '6px 10px', borderRadius: 0, '--px': 'pill', backgroundColor: 'var(--px-butter)', cursor: 'pointer', fontWeight: 800, color: 'var(--px-accent)' }}><ChevronLeft style={{ width: '12px', height: '12px' }} /></button>
                        <span style={{ fontWeight: 800, color: 'var(--px-accent)', fontSize: '14px' }}>{currentYear}</span>
                        <button onClick={() => setCurrentYear(Math.min(2050, currentYear + 1))} style={{ padding: '6px 10px', borderRadius: 0, '--px': 'pill', backgroundColor: 'var(--px-butter)', cursor: 'pointer', fontWeight: 800, color: 'var(--px-accent)' }}><ChevronRight style={{ width: '12px', height: '12px' }} /></button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {months.map((m, idx) => (
                        <button key={m} onClick={() => { setCurrentMonthIndex(idx); setIsMonthPickerOpen(false); }} style={{ padding: '10px 6px', borderRadius: 0, '--px': 'pill', fontWeight: 800, fontSize: '12px', cursor: 'pointer', backgroundColor: currentMonthIndex === idx ? 'var(--px-pink)' : 'var(--px-card)', color: currentMonthIndex === idx ? '#FFFFFF' : 'var(--ink)' }}>
                          {m.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <style>{`
                .planner-grid-fullscreen {
                  display: grid;
                  grid-template-columns: repeat(3, minmax(0, 1fr));
                  gap: 16px;
                  align-items: stretch;
                  width: 100%;
                  flex: 1;
                  padding-bottom: 16px;
                  box-sizing: border-box;
                }
                @media (max-width: 1100px) {
                  .planner-grid-fullscreen { grid-template-columns: 1fr; }
                }
              `}</style>

              <div className="planner-grid-fullscreen">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', height: '100%', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                    <div style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'panel', padding: '18px', width: '100%', boxShadow: '0 8px 25px rgba(223,177,91,0.15)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase' }}>Income ({months[currentMonthIndex]} {currentYear})</div>
                        <span style={{ fontSize: '11px', color: 'var(--px-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck style={{ width: '14px', height: '14px' }} /> Saved</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>Expected Income (₱) [Auto-Synced]</label>
                          <input
                            type="number"
                            placeholder="e.g. 50000"
                            value={currentIncome.expected === 0 || currentIncome.expected === '0' ? '' : currentIncome.expected}
                            readOnly
                            tabIndex={-1}
                            title="Auto-synced from the Attendance tab"
                            style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: 0, '--px': 'pill', fontWeight: 800, fontSize: '15px', color: 'var(--ink)', textAlign: 'center' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--px-green-d)', display: 'block', marginBottom: '4px' }}>Actual Income (₱)</label>
                          <input
                            type="number"
                            placeholder="e.g. 48500"
                            value={currentIncome.actual === 0 || currentIncome.actual === '0' ? '' : currentIncome.actual}
                            onChange={(e) => handleIncomeChange('actual', e.target.value)}
                            style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: 0, '--px': 'pill', fontWeight: 800, fontSize: '15px', color: 'var(--px-green-d)', textAlign: 'center' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: diffNum >= 0 ? 'var(--px-green-d)' : 'var(--px-accent)', display: 'block', marginBottom: '4px' }}>Difference (₱)</label>
                          <div style={{ backgroundColor: '#FFFFFF', padding: '10px 14px', borderRadius: 0, '--px': 'pill', fontWeight: 800, fontSize: '15px', textAlign: 'center', width: '100%', color: diffNum >= 0 ? 'var(--px-green-d)' : 'var(--px-accent)' }}>
                            {diffNum >= 0 ? `+₱${diffNum.toLocaleString()}` : `-₱${Math.abs(diffNum).toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'panel', padding: '18px', width: '100%', textAlign: 'center', boxShadow: '0 8px 25px rgba(223,177,91,0.15)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', marginBottom: '6px' }}>Monthly Due</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--px-muted)', marginBottom: '8px' }}>Total of Obligations & Expenses</div>
                      <div style={{ backgroundColor: '#FFFFFF', padding: '12px 14px', borderRadius: 0, '--px': 'pill', fontWeight: 800, fontSize: '18px', color: 'var(--px-accent)', textAlign: 'center', width: '100%' }}>
                        ₱{monthlyDueTotal.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'panel', padding: '18px', width: '100%', textAlign: 'center', boxShadow: '0 8px 25px rgba(223,177,91,0.15)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', marginBottom: '6px' }}>Remaining Balance</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--px-muted)', marginBottom: '8px' }}>Actual Income minus Due</div>
                      <div style={{ backgroundColor: '#FFFFFF', padding: '12px 14px', borderRadius: 0, '--px': 'pill', fontWeight: 800, fontSize: '18px', textAlign: 'center', width: '100%', color: remainingBudget >= 0 ? 'var(--px-green-d)' : 'var(--px-accent)' }}>
                        {remainingBudget >= 0 ? `₱${remainingBudget.toLocaleString()}` : `-₱${Math.abs(remainingBudget).toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                  <PixelCat
                    monthName={months[currentMonthIndex]}
                    unpaid={
                      utilityItems.filter(i => !i.paid).length +
                      currentMonthSavingsItems.filter(i => !i.paid).length +
                      currentExpenses.filter(e => (e.category.trim() !== '' || e.amount !== '') && !e.paid).length
                    }
                    total={
                      utilityItems.length +
                      currentMonthSavingsItems.length +
                      currentExpenses.filter(e => e.category.trim() !== '' || e.amount !== '').length
                    }
                  />
                </div>

                <div style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '20px', width: '100%', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 100px)', boxShadow: '0 8px 25px rgba(223,177,91,0.15)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ marginBottom: '12px', borderBottom: '2px dashed var(--px-sun)', paddingBottom: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase' }}>Monthly Obligations</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 0.9fr', fontSize: '12px', fontWeight: 800, color: 'var(--px-accent)', marginBottom: '8px', padding: '0 4px', flexShrink: 0 }}>
                      <span>Category</span><span style={{ textAlign: 'center' }}>Amount</span><span style={{ textAlign: 'center' }}>Status</span>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', margin: '4px 0', padding: '0 4px', letterSpacing: '0.5px' }}>Utility Bills</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        {Object.entries(currentUtilityBills).map(([billName, data]) => (
                          <div key={billName} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 0.9fr', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: 0, '--px': 'pill', fontSize: '13px', width: '100%', gap: '6px', boxShadow: '0 2px 10px rgba(223,177,91,0.08)' }}>
                            <span style={{ fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', paddingLeft: '6px' }}>{billName}</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={data.amount === 0 || data.amount === '0' ? '' : data.amount}
                              onChange={(e) => handleUtilityAmountChange(billName, e.target.value)}
                              style={{ width: '100%', backgroundColor: 'var(--px-paper)', padding: '6px 8px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '13px', color: 'var(--ink)', textAlign: 'center' }}
                            />
                            <button
                              onClick={() => handleUtilityTogglePaid(billName)}
                              style={{ padding: '6px 10px', borderRadius: 0, '--px': 'pill', fontWeight: 800, fontSize: '11px', cursor: 'pointer', textAlign: 'center', width: '100%', backgroundColor: data.paid ? 'var(--px-mint)' : 'var(--px-butter)', color: data.paid ? 'var(--px-green-d)' : 'var(--px-accent)' }}
                            >
                              {data.paid ? 'Paid' : 'Not Paid'}
                            </button>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 6px 0', padding: '0 4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Loans Cutoffs</div>
                        <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: 'var(--px-butter)', color: 'var(--px-accent)', padding: '2px 10px', borderRadius: 0, '--px': 'pill' }}>Auto-Synced</span>
                      </div>
                      {!(current15Summary.hasEntries || current30Summary.hasEntries) ? (
                        <div style={{ fontSize: '12px', color: 'var(--px-muted)', fontStyle: 'italic', padding: '4px' }}>No loans due this month</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 0.9fr', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: 0, '--px': 'pill', fontSize: '13px', width: '100%', gap: '6px', boxShadow: '0 2px 10px rgba(223,177,91,0.08)' }}>
                            <span style={{ fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', paddingLeft: '6px' }} title={`Loans (${currentMonthName} Consolidated)`}>Loans Cutoffs</span>
                            <div style={{ width: '100%', backgroundColor: 'var(--px-paper)', padding: '6px 8px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '13px', color: 'var(--px-muted)', textAlign: 'center' }}>
                              ₱{parseFloat(totalConsolidatedLoansAmt || 0).toLocaleString()}
                            </div>
                            <div />
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 6px 0', padding: '0 4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Savings</div>
                        <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: 'var(--px-butter)', color: 'var(--px-accent)', padding: '2px 10px', borderRadius: 0, '--px': 'pill' }}>Auto-Synced</span>
                      </div>
                      {currentMonthSavingsItems.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--px-muted)', fontStyle: 'italic', padding: '4px' }}>No savings goals due this month</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                          {currentMonthSavingsItems.map((item) => (
                            <div key={item.goalId} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 0.9fr', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: 0, '--px': 'pill', fontSize: '13px', width: '100%', gap: '6px', boxShadow: '0 2px 10px rgba(223,177,91,0.08)' }}>
                              <span style={{ fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', paddingLeft: '6px' }} title={item.name}>{item.name}</span>
                              <div style={{ width: '100%', backgroundColor: 'var(--px-paper)', padding: '6px 8px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '13px', color: 'var(--px-muted)', textAlign: 'center' }}>
                                ₱{parseFloat(item.amount || 0).toLocaleString()}
                              </div>
                              <button
                                onClick={() => handleGoalMonthTogglePaid(item.goalId, currentKey)}
                                style={{ padding: '6px 10px', borderRadius: 0, '--px': 'pill', fontWeight: 800, fontSize: '11px', cursor: 'pointer', textAlign: 'center', width: '100%', backgroundColor: item.paid ? 'var(--px-mint)' : 'var(--px-butter)', color: item.paid ? 'var(--px-green-d)' : 'var(--px-accent)' }}
                              >
                                {item.paid ? 'Paid' : 'Not Paid'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 0.9fr', padding: '12px 14px', backgroundColor: 'var(--px-sun)', borderRadius: 0, '--px': 'pill', fontSize: '12px', fontWeight: 800, color: 'var(--ink)', marginTop: '12px', width: '100%', gap: '6px', flexShrink: 0, boxShadow: '0 4px 12px rgba(223,177,91,0.2)' }}>
                    <span style={{ paddingLeft: '6px' }}>TOTAL</span>
                    <span style={{ textAlign: 'center' }}>₱{obligationTotal.toLocaleString()}</span>
                    <span style={{ textAlign: 'center' }}>{obligationPaidPct}%</span>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '20px', width: '100%', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 100px)', boxShadow: '0 8px 25px rgba(223,177,91,0.15)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '2px dashed var(--px-sun)', paddingBottom: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase' }}>Monthly Expenses</span>
                      <button onClick={handleAddExpense} style={{ backgroundColor: 'var(--px-pink)', color: '#FFFFFF', borderRadius: 0, '--px': 'pill', padding: '6px 14px', fontWeight: 800, fontSize: '11px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(223,177,91,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Plus style={{ width: '14px', height: '14px' }} /> Add Expense
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 32px', fontSize: '12px', fontWeight: 800, color: 'var(--px-accent)', marginBottom: '8px', padding: '0 4px', flexShrink: 0 }}>
                      <span>Category</span><span style={{ textAlign: 'center' }}>Amount</span><span style={{ textAlign: 'center' }}>Status</span><span></span>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {currentExpenses.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 8px', fontSize: '12px', color: 'var(--px-muted)', fontWeight: 700, fontStyle: 'italic' }}>
                          No expenses added yet. Click "+ Add Expense" above!
                        </div>
                      ) : (
                        currentExpenses.map((item) => (
                          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 32px', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: 0, '--px': 'pill', fontSize: '13px', width: '100%', gap: '6px', boxShadow: '0 2px 10px rgba(223,177,91,0.08)' }}>
                            <input
                              type="text"
                              placeholder="Category"
                              value={item.category}
                              onChange={(e) => handleExpenseChange(item.id, 'category', e.target.value)}
                              style={{ width: '100%', backgroundColor: 'var(--px-paper)', padding: '6px 8px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '13px', color: 'var(--ink)', paddingLeft: '8px' }}
                            />
                            <input
                              type="number"
                              placeholder="0"
                              value={item.amount === 0 || item.amount === '0' ? '' : item.amount}
                              onChange={(e) => handleExpenseChange(item.id, 'amount', e.target.value)}
                              style={{ width: '100%', backgroundColor: 'var(--px-paper)', padding: '6px 8px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '13px', color: 'var(--ink)', textAlign: 'center' }}
                            />
                            {item.category.trim() !== '' || item.amount !== '' ? (
                              <button
                                onClick={() => handleExpenseTogglePaid(item.id)}
                                style={{ padding: '6px 4px', borderRadius: 0, '--px': 'pill', fontWeight: 800, fontSize: '10px', cursor: 'pointer', textAlign: 'center', width: '100%', backgroundColor: item.paid ? 'var(--px-mint)' : 'var(--px-butter)', color: item.paid ? 'var(--px-green-d)' : 'var(--px-accent)' }}
                              >
                                {item.paid ? 'Paid' : 'Not Paid'}
                              </button>
                            ) : (<div />)}
                            <button onClick={() => handleDeleteExpense(item.id)} title="Delete Expense" style={{ backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', color: 'var(--px-accent)' }}>
                              <Trash2 style={{ width: '14px', height: '14px' }} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 32px', padding: '12px 14px', backgroundColor: 'var(--px-sun)', borderRadius: 0, '--px': 'pill', fontSize: '12px', fontWeight: 800, color: 'var(--ink)', marginTop: '12px', width: '100%', gap: '6px', flexShrink: 0, boxShadow: '0 4px 12px rgba(223,177,91,0.2)' }}>
                    <span style={{ paddingLeft: '6px' }}>TOTAL</span>
                    <span style={{ textAlign: 'center' }}>₱{expenseTotal.toLocaleString()}</span>
                    <span style={{ textAlign: 'center' }}>{expensePaidPct}%</span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SAVINGS TAB */}
          {activeTab === 'savings' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--px-card)', padding: '24px 28px', borderRadius: 0, '--px': 'panel', boxShadow: '0 10px 30px rgba(223,177,91,0.18)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h2 className="kutitap-title" style={{ fontSize: '24px', color: 'var(--px-accent)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Sprite src={spPudding} className="px-logo-sprite" /> Honey Pot</h2>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--px-muted)', margin: 0 }}>Create goals, track progress, and auto-sync monthly contributions with dynamic redistribution!</p>
                  </div>
                  <button onClick={() => setIsAddGoalModalOpen(true)} style={{ backgroundColor: 'var(--px-pink)', color: '#FFFFFF', borderRadius: 0, '--px': 'pill', padding: '12px 22px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(223,177,91,0.35)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus style={{ width: '16px', height: '16px' }} /> Add New Savings Goal
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginTop: '4px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 0, '--px': 'card', textAlign: 'center', boxShadow: '0 4px 15px rgba(223,177,91,0.1)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Savings Goal</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>₱{totalSavingsGoalsAmount.toLocaleString()}</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 0, '--px': 'card', textAlign: 'center', boxShadow: '0 4px 15px rgba(200,230,201,0.2)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--px-green-d)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Saved Amount</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--px-green-d)' }}>₱{totalSavingsSavedAmount.toLocaleString()} ({overallSavingsProgressPct}%)</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 0, '--px': 'card', textAlign: 'center', boxShadow: '0 4px 15px rgba(223,177,91,0.1)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Amount Left</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--px-accent)' }}>₱{totalSavingsAmountLeft.toLocaleString()}</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: 0, '--px': 'card', textAlign: 'center', boxShadow: '0 4px 15px rgba(223,177,91,0.1)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: '4px' }}>Active Goals</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>{activeSavingsCount}</div>
                  </div>
                </div>
              </div>

              {isAddGoalModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(92,58,33,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '24px 30px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px rgba(223,177,91,0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed var(--px-sun)', paddingBottom: '12px' }}>
                      <div className="kutitap-title" style={{ fontSize: '18px', color: 'var(--px-accent)' }}>Add New Savings Goal</div>
                      <button onClick={() => setIsAddGoalModalOpen(false)} style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--px-accent)', fontWeight: 800 }}><X style={{ width: '16px', height: '16px' }} /></button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>Savings Goal Name</label>
                        <input
                          type="text"
                          placeholder="e.g. New Laptop or Honey Fund"
                          value={newGoalName}
                          onChange={(e) => setNewGoalName(e.target.value)}
                          style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>Goal Amount (₱)</label>
                        <input
                          type="number"
                          placeholder="e.g. 45000"
                          value={newGoalAmount}
                          onChange={(e) => setNewGoalAmount(e.target.value)}
                          style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>Start Date</label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select value={newStartMonthIndex} onChange={(e) => setNewStartMonthIndex(parseInt(e.target.value))} style={{ flex: 1, backgroundColor: '#FFFFFF', padding: '10px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}>
                              {months.map((m, idx) => (<option key={m} value={idx}>{m}</option>))}
                            </select>
                            <select value={newStartYear} onChange={(e) => setNewStartYear(parseInt(e.target.value))} style={{ width: '80px', backgroundColor: '#FFFFFF', padding: '10px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}>
                              {availableYears.map(y => (<option key={y} value={y}>{y}</option>))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>End Date</label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select value={newEndMonthIndex} onChange={(e) => setNewEndMonthIndex(parseInt(e.target.value))} style={{ flex: 1, backgroundColor: '#FFFFFF', padding: '10px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}>
                              {months.map((m, idx) => (<option key={m} value={idx}>{m}</option>))}
                            </select>
                            <select value={newEndYear} onChange={(e) => setNewEndYear(parseInt(e.target.value))} style={{ width: '80px', backgroundColor: '#FFFFFF', padding: '10px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}>
                              {availableYears.map(y => (<option key={y} value={y}>{y}</option>))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                      <button onClick={() => setIsAddGoalModalOpen(false)} style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', padding: '10px 20px', fontWeight: 800, fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleCreateSavingsGoal} style={{ backgroundColor: 'var(--px-pink)', borderRadius: 0, '--px': 'pill', padding: '10px 24px', fontWeight: 800, fontSize: '13px', color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 4px 15px rgba(223,177,91,0.3)' }}>Create Goal</button>
                    </div>
                  </div>
                </div>
              )}

              {editingGoalId !== null && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(92,58,33,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '24px 30px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px rgba(223,177,91,0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed var(--px-sun)', paddingBottom: '12px' }}>
                      <div className="kutitap-title" style={{ fontSize: '18px', color: 'var(--px-accent)' }}>Edit Savings Goal</div>
                      <button onClick={() => setEditingGoalId(null)} style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--px-accent)', fontWeight: 800 }}><X style={{ width: '16px', height: '16px' }} /></button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>Savings Goal Name</label>
                        <input
                          type="text"
                          value={editGoalName}
                          onChange={(e) => setEditGoalName(e.target.value)}
                          style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>Goal Amount (₱)</label>
                        <input
                          type="number"
                          value={editGoalAmount}
                          onChange={(e) => setEditGoalAmount(e.target.value)}
                          style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>Start Date</label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select value={editStartMonthIndex} onChange={(e) => setEditStartMonthIndex(parseInt(e.target.value))} style={{ flex: 1, backgroundColor: '#FFFFFF', padding: '10px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}>
                              {months.map((m, idx) => (<option key={m} value={idx}>{m}</option>))}
                            </select>
                            <select value={editStartYear} onChange={(e) => setEditStartYear(parseInt(e.target.value))} style={{ width: '80px', backgroundColor: '#FFFFFF', padding: '10px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}>
                              {availableYears.map(y => (<option key={y} value={y}>{y}</option>))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>End Date</label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select value={editEndMonthIndex} onChange={(e) => setEditEndMonthIndex(parseInt(e.target.value))} style={{ flex: 1, backgroundColor: '#FFFFFF', padding: '10px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}>
                              {months.map((m, idx) => (<option key={m} value={idx}>{m}</option>))}
                            </select>
                            <select value={editEndYear} onChange={(e) => setEditEndYear(parseInt(e.target.value))} style={{ width: '80px', backgroundColor: '#FFFFFF', padding: '10px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}>
                              {availableYears.map(y => (<option key={y} value={y}>{y}</option>))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--px-muted)' }}>
                        Changing the amount or dates re-spreads the goal over the months not yet marked Paid. Paid months keep their amounts.
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                      <button onClick={() => setEditingGoalId(null)} style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', padding: '10px 20px', fontWeight: 800, fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleSaveEditedGoal} style={{ backgroundColor: 'var(--px-pink)', borderRadius: 0, '--px': 'pill', padding: '10px 24px', fontWeight: 800, fontSize: '13px', color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 4px 15px rgba(223,177,91,0.3)' }}>Save Changes</button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'auto' }}>
                {savingsGoals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', color: 'var(--ink)', fontWeight: 800, fontSize: '16px' }}>
                    <Sprite src={spBunny} className="px-empty-sprite" />
                    No savings goals created yet. Click "Add New Savings Goal" above!
                  </div>
                ) : (
                  savingsGoals.map(goal => {
                    const goalAmountNum = goal.goalAmount || 0;
                    const totalSavedNum = goal.monthsList.reduce((sum, m) => sum + (m.paid ? (parseFloat(m.amount) || 0) : 0), 0);
                    const amountLeftNum = Math.max(0, goalAmountNum - totalSavedNum);
                    const progressPct = goalAmountNum > 0 ? Math.min(100, Math.round((totalSavedNum / goalAmountNum) * 100)) : 0;
                    const autoOn = goal.autoCompute !== false;
                    const scheduledTotal = goal.monthsList.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
                    const scheduleDiff = Math.round(scheduledTotal - goalAmountNum);

                    return (
                      <div key={goal.id} style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '24px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                              <h3 className="kutitap-title" style={{ fontSize: '20px', color: 'var(--px-accent)', margin: 0 }}>{goal.name}</h3>
                              <button onClick={() => handleOpenEditGoal(goal)} style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', padding: '4px 10px', color: 'var(--px-accent)', fontWeight: 800, fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Pencil style={{ width: '12px', height: '12px' }} /> Edit
                              </button>
                              <button onClick={() => handleDeleteGoal(goal.id)} style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', padding: '4px 10px', color: 'var(--px-accent)', fontWeight: 800, fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Trash2 style={{ width: '12px', height: '12px' }} /> Delete
                              </button>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--px-muted)' }}>
                              Start: <span style={{ color: 'var(--ink)', fontWeight: 800 }}>{goal.monthsList[0]?.monthKey || 'N/A'}</span> | End: <span style={{ color: 'var(--ink)', fontWeight: 800 }}>{goal.monthsList[goal.monthsList.length - 1]?.monthKey || 'N/A'}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ backgroundColor: '#FFFFFF', padding: '12px 18px', borderRadius: 0, '--px': 'card', textAlign: 'center', minWidth: '100px', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: '2px' }}>Goal Amount</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>₱{goalAmountNum.toLocaleString()}</div>
                            </div>
                            <div style={{ backgroundColor: '#FFFFFF', padding: '12px 18px', borderRadius: 0, '--px': 'card', textAlign: 'center', minWidth: '120px', boxShadow: '0 4px 12px rgba(200,230,201,0.15)' }}>
                              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--px-green-d)', textTransform: 'uppercase', marginBottom: '2px' }}>Total Saved</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--px-green-d)' }}>₱{totalSavedNum.toLocaleString()} ({progressPct}%)</div>
                            </div>
                            <div style={{ backgroundColor: '#FFFFFF', padding: '12px 18px', borderRadius: 0, '--px': 'card', textAlign: 'center', minWidth: '100px', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', marginBottom: '2px' }}>Amount Left</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--px-accent)' }}>₱{amountLeftNum.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                          <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 800, color: 'var(--ink)' }}>
                            Progress: <span style={{ color: 'var(--px-green-d)' }}>{progressPct}%</span> Completed
                          </div>
                          <div style={{ width: '100%', height: '16px', backgroundColor: '#FFFFFF', borderRadius: 0, '--px': 'pill', overflow: 'hidden', padding: '2px', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.05)' }}>
                            <div style={{ height: '100%', backgroundColor: 'var(--px-pink)', borderRadius: 0, '--px': 'pill', width: `${progressPct}%`, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '2px dashed var(--px-sun)', paddingTop: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Month-by-Month Honey Schedule (Dynamic Redistribution)
                            </div>
                            <button
                              onClick={() => handleToggleGoalAutoCompute(goal.id)}
                              title="On: changing one month re-spreads the rest of the goal. Off: only that month changes."
                              style={{ borderRadius: 0, '--px': 'pill', padding: '4px 12px', fontWeight: 800, fontSize: '11px', cursor: 'pointer', backgroundColor: autoOn ? 'var(--px-mint)' : 'var(--px-butter)', color: autoOn ? 'var(--px-green-d)' : 'var(--px-accent)' }}
                            >
                              Auto-Compute: {autoOn ? 'ON' : 'OFF'}
                            </button>
                          </div>
                          {!autoOn && scheduleDiff !== 0 && (
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--px-accent)' }}>
                              Schedule adds up to ₱{scheduledTotal.toLocaleString()} — ₱{Math.abs(scheduleDiff).toLocaleString()} {scheduleDiff > 0 ? 'over' : 'short of'} the goal.
                            </div>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px' }}>
                            {goal.monthsList.map((mItem) => (
                              <div key={mItem.monthKey} style={{ backgroundColor: '#FFFFFF', borderRadius: 0, '--px': 'card', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)' }}>{mItem.monthKey}</span>
                                  <button
                                    onClick={() => handleGoalMonthTogglePaid(goal.id, mItem.monthKey)}
                                    style={{ borderRadius: 0, '--px': 'pill', padding: '4px 12px', fontWeight: 800, fontSize: '11px', cursor: 'pointer', backgroundColor: mItem.paid ? 'var(--px-mint)' : 'var(--px-butter)', color: mItem.paid ? 'var(--px-green-d)' : 'var(--px-accent)' }}
                                  >
                                    {mItem.paid ? 'Paid' : 'Not Paid'}
                                  </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--px-paper)', borderRadius: 0, '--px': 'pill', padding: '4px 10px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--px-accent)', marginRight: '4px' }}>₱</span>
                                  <input
                                    type="number"
                                    value={mItem.amount === 0 || mItem.amount === '0' ? '' : mItem.amount}
                                    onChange={(e) => handleGoalMonthAmountChange(goal.id, mItem.monthKey, e.target.value)}
                                    style={{ width: '100%', backgroundColor: 'transparent', fontWeight: 700, fontSize: '13px', color: 'var(--ink)', textAlign: 'left' }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* LOANS TAB */}
          {activeTab === 'loans' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '16px' }}>
              <div style={{ background: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '22px 26px', boxShadow: '0 10px 30px rgba(223,177,91,0.18)', display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard style={{ width: '16px', height: '16px' }} /> Loans Dashboard
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', position: 'relative' }}>
                      <div
                        onClick={() => setIsDashMonthPickerOpen(!isDashMonthPickerOpen)}
                        className="kutitap-title"
                        style={{ fontSize: '18px', color: 'var(--px-accent)', cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span>{dashMonthName} {dashYear}</span>
                        <span style={{ fontSize: '11px', color: 'var(--px-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>Change <ChevronDown style={{ width: '12px', height: '12px' }} /></span>
                      </div>

                      {isDashMonthPickerOpen && (
                        <div style={{ position: 'absolute', top: '40px', left: 0, backgroundColor: '#FFFFFF', borderRadius: 0, '--px': 'card', padding: '16px', boxShadow: '0 20px 40px rgba(223,177,91,0.25)', zIndex: 200, width: '300px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase' }}>Select Dashboard Month</span>
                            <select value={dashYear} onChange={(e) => setDashYear(parseInt(e.target.value))} style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', padding: '4px 10px', fontWeight: 800, color: 'var(--px-accent)', fontSize: '12px', cursor: 'pointer' }}>
                              {availableYears.map(y => (<option key={y} value={y}>{y}</option>))}
                            </select>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                            {months.map((m, idx) => (
                              <button key={m} onClick={() => { setDashMonthIndex(idx); setIsDashMonthPickerOpen(false); }} style={{ padding: '8px 4px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '11px', cursor: 'pointer', backgroundColor: dashMonthIndex === idx ? 'var(--px-pink)' : 'var(--px-card)', color: dashMonthIndex === idx ? '#FFFFFF' : 'var(--ink)' }}>
                                {m.slice(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: 0, '--px': 'card', textAlign: 'center', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>{dashMonthName} 15th Cutoff</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>₱{dash15Summary.total.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '2px', color: dash15Summary.paid ? 'var(--px-green-d)' : 'var(--px-accent)' }}>{dash15Summary.paid ? 'Paid' : 'Pending'}</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: 0, '--px': 'card', textAlign: 'center', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>{dashMonthName} {getCutoff30Label(dashMonthName, dashYear)}th Cutoff</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>₱{dash30Summary.total.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '2px', color: dash30Summary.paid ? 'var(--px-green-d)' : 'var(--px-accent)' }}>{dash30Summary.paid ? 'Paid' : 'Pending'}</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: 0, '--px': 'card', textAlign: 'center', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>Total {dashMonthName} Loans</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>₱{totalDashMonthLoans.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--px-muted)', marginTop: '2px' }}>Consolidated</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: 0, '--px': 'card', textAlign: 'center', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>{loanTableYear} Annual Total</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>₱{yearTotalCost.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--px-muted)', marginTop: '2px' }}>All Categories</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: 0, '--px': 'card', textAlign: 'center', boxShadow: '0 4px 12px rgba(200,230,201,0.2)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--px-green-d)', textTransform: 'uppercase', marginBottom: '4px' }}>{loanTableYear} Total Paid</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--px-green-d)' }}>₱{yearTotalPaid.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--px-green-d)', marginTop: '2px' }}>Cleared</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: 0, '--px': 'card', textAlign: 'center', boxShadow: '0 4px 12px rgba(223,177,91,0.08)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>{loanTableYear} Total Unpaid</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--px-accent)' }}>₱{yearTotalUnpaid.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--px-accent)', marginTop: '2px' }}>Remaining</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {loanCategories.map(cat => {
                    const isActive = activeLoanCategory === cat;
                    return (
                      <button key={cat} onClick={() => setActiveLoanCategory(cat)} style={{ padding: '10px 20px', borderRadius: 0, '--px': 'pill', fontWeight: 800, fontSize: '13px', cursor: 'pointer', backgroundColor: isActive ? 'var(--px-pink)' : '#FFFFFF', color: isActive ? '#FFFFFF' : 'var(--ink)', boxShadow: isActive ? '0 4px 15px rgba(223,177,91,0.4)' : '0 2px 8px rgba(0,0,0,0.04)' }}>
                        {loanLabel(cat)}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setIsAddColumnModalOpen(true)} style={{ backgroundColor: 'var(--px-pink)', color: '#FFFFFF', borderRadius: 0, '--px': 'pill', padding: '10px 20px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(223,177,91,0.35)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus style={{ width: '16px', height: '16px' }} /> Add Column to {loanLabel(activeLoanCategory)}
                </button>
              </div>

              {isAddColumnModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(92,58,33,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '24px 28px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 50px rgba(223,177,91,0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed var(--px-sun)', paddingBottom: '10px' }}>
                      <div className="kutitap-title" style={{ fontSize: '16px', color: 'var(--px-accent)' }}>Add Column to {loanLabel(activeLoanCategory)}</div>
                      <button onClick={() => setIsAddColumnModalOpen(false)} style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--px-accent)', fontWeight: 800 }}><X style={{ width: '14px', height: '14px' }} /></button>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>Item / Column Name</label>
                      <input type="text" placeholder="e.g. Combined, Arrears, Gadget" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                      <button onClick={() => setIsAddColumnModalOpen(false)} style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', padding: '10px 18px', fontWeight: 800, fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleAddColumn} style={{ backgroundColor: 'var(--px-pink)', borderRadius: 0, '--px': 'pill', padding: '10px 20px', fontWeight: 800, fontSize: '13px', color: '#FFFFFF', cursor: 'pointer', boxShadow: '0 4px 15px rgba(223,177,91,0.3)' }}>Add Column</button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--px-muted)', flexShrink: 0 }}>
                <Sparkles style={{ width: '14px', height: '14px' }} /> Double-click an amount to mark it paid (turns green). Double-click again to mark it unpaid.
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 0, '--px': 'panel', overflow: 'auto', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', flex: '1 1 auto', minHeight: '320px', maxHeight: 'calc(100vh - 80px)' }}>
                <table className="px-sticky-table" style={{ width: '100%', textAlign: 'left', minWidth: `${140 + getLoanCat(activeLoanCategory).columns.length * LOAN_COL_W + 150}px` }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 5, height: `${LOAN_HEAD_H}px`, padding: '0 18px', fontSize: '13px', fontWeight: 800, color: 'var(--px-accent)', width: '140px', minWidth: '140px', textAlign: 'center', backgroundColor: 'var(--px-card)', borderBottom: '3px dashed var(--px-sun)' }}>Date / Cutoff ({loanTableYear})</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 3, height: `${LOAN_HEAD_H}px`, padding: '0 18px', fontSize: '14px', fontWeight: 800, color: 'var(--px-accent)', textAlign: 'center', backgroundColor: 'var(--px-card)', borderBottom: '3px dashed var(--px-sun)' }} colSpan={getLoanCat(activeLoanCategory).columns.length + 1}>
                        {loanLabel(activeLoanCategory)} Table View
                      </th>
                    </tr>
                    <tr>
                      <th style={{ position: 'sticky', top: `${LOAN_HEAD_H}px`, left: 0, zIndex: 5, padding: '10px 18px', fontSize: '12px', fontWeight: 800, color: 'var(--ink)', textAlign: 'center', backgroundColor: 'var(--px-butter)', borderBottom: '2px solid var(--px-sun)', borderRight: '3px solid var(--px-sun)' }}>Cutoff</th>
                      {getLoanCat(activeLoanCategory).columns.map(col => (
                        <th key={col} style={{ position: 'sticky', top: `${LOAN_HEAD_H}px`, zIndex: 3, minWidth: `${LOAN_COL_W}px`, padding: '10px 14px', fontSize: '12px', fontWeight: 800, color: 'var(--ink)', textAlign: 'center', backgroundColor: 'var(--px-butter)', borderBottom: '2px solid var(--px-sun)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                            <span style={{ flex: 1, textAlign: 'center' }}>{col}</span>
                            <button onClick={() => handleDeleteColumn(col)} title="Delete Column" style={{ backgroundColor: 'transparent', color: 'var(--px-accent)', cursor: 'pointer', padding: '2px' }}><X style={{ width: '12px', height: '12px' }} /></button>
                          </div>
                        </th>
                      ))}
                      <th style={{ position: 'sticky', top: `${LOAN_HEAD_H}px`, zIndex: 3, minWidth: '150px', padding: '10px 14px', fontSize: '12px', fontWeight: 800, color: 'var(--px-green-d)', textAlign: 'center', backgroundColor: 'var(--px-mint-lt)', borderBottom: '2px solid var(--px-sun)' }}>Row Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.flatMap((m) => [
                      { month: m, cutoff: '15th', label: `${m.slice(0, 3)} 15` },
                      { month: m, cutoff: '30th', label: `${m.slice(0, 3)} ${getCutoff30Label(m, loanTableYear)}` }
                    ]).map((row, idx) => {
                      const rowKey = `${loanTableYear}-${row.month}-${row.cutoff}`;
                      const catData = getLoanCat(activeLoanCategory);
                      const rowValues = catData.cells[rowKey] || {};
                      const rowAmt = getRowAmounts(catData, rowKey);
                      const cellBorder = '2px solid rgba(74,29,54,0.15)';

                      return (
                        <tr key={rowKey} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : 'var(--px-paper)' }}>
                          <td style={{ position: 'sticky', left: 0, zIndex: 2, padding: '10px 18px', fontSize: '13px', fontWeight: 800, color: 'var(--ink)', textAlign: 'center', backgroundColor: 'var(--px-card)', borderBottom: cellBorder, borderRight: '3px solid var(--px-sun)' }}>{row.label}</td>
                          {catData.columns.map(col => {
                            const val = rowValues[col] || '';
                            const hasEntry = (parseFloat(val) || 0) !== 0;
                            const cellPaid = hasEntry && !!catData.paidCells?.[rowKey]?.[col];
                            return (
                              <td key={col} style={{ padding: '6px 10px', textAlign: 'center', minWidth: `${LOAN_COL_W}px`, borderBottom: cellBorder }}>
                                <input
                                  type="number"
                                  data-paid={hasEntry ? String(cellPaid) : undefined}
                                  title={hasEntry ? (cellPaid ? 'Paid - double-click to mark unpaid' : 'Unpaid - double-click to mark paid') : undefined}
                                  value={val === 0 || val === '0' ? '' : val}
                                  onChange={(e) => handleCellChange(activeLoanCategory, loanTableYear, row.month, row.cutoff, col, e.target.value)}
                                  onDoubleClick={(e) => {
                                    if (!hasEntry) return;
                                    handleToggleCellPaid(activeLoanCategory, loanTableYear, row.month, row.cutoff, col);
                                    e.currentTarget.blur();
                                  }}
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: 0, '--px': 'pill', fontWeight: 700, fontSize: '13px', color: cellPaid ? 'var(--px-green-d)' : 'var(--ink)', textAlign: 'center', touchAction: 'manipulation', backgroundColor: cellPaid ? 'var(--px-mint)' : (hasEntry ? 'var(--px-sun)' : 'var(--px-paper)') }}
                                />
                              </td>
                            );
                          })}
                          <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 800, color: 'var(--px-green-d)', textAlign: 'center', backgroundColor: 'var(--px-mint-lt)', borderBottom: cellBorder }}>
                            {rowAmt.total > 0 ? (
                              <div>
                                <div>₱{rowAmt.unpaid.toLocaleString()}</div>
                                {rowAmt.paid > 0 && <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--px-muted)' }}>of ₱{rowAmt.total.toLocaleString()}</div>}
                              </div>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const grandCat = getLoanCat(activeLoanCategory);
                      let gTotal = 0, gPaid = 0, gUnpaid = 0;
                      months.forEach(m => ['15th', '30th'].forEach(c => {
                        const r = getRowAmounts(grandCat, `${loanTableYear}-${m}-${c}`);
                        gTotal += r.total; gPaid += r.paid; gUnpaid += r.unpaid;
                      }));
                      const foot = { position: 'sticky', bottom: 0, zIndex: 4, padding: '12px 14px', fontWeight: 800, borderTop: '3px solid var(--ink)' };
                      return (
                        <tr>
                          <td style={{ ...foot, left: 0, zIndex: 6, textAlign: 'center', fontSize: '12px', color: '#FFFFFF', backgroundColor: 'var(--px-pink)', textShadow: '2px 2px 0 var(--ink)' }}>Grand Total {loanTableYear}</td>
                          {grandCat.columns.length > 0 && <td colSpan={grandCat.columns.length} style={{ ...foot, backgroundColor: 'var(--px-pink)' }} />}
                          <td style={{ ...foot, textAlign: 'center', fontSize: '15px', color: 'var(--px-green-d)', backgroundColor: 'var(--px-mint)' }}>
                            ₱{gUnpaid.toLocaleString()}
                            {gPaid > 0 && <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--px-muted)' }}>of ₱{gTotal.toLocaleString()}</div>}
                          </td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '20px' }}>
              <style>{`
                .cutesy-dropdown {
                  background-color: var(--px-card); color: var(--px-accent); border-radius: 9999px; padding: 8px 18px; font-weight: 800; font-size: 13px; border: 2px solid var(--px-sun); cursor: pointer; outline: none; box-shadow: 0 4px 12px rgba(223,177,91,0.15);
                }
                .cutesy-dropdown option { background-color: var(--px-card); color: var(--px-accent); padding: 10px; font-weight: 700; }
                .cutesy-dropdown option:hover, .cutesy-dropdown option:checked { background-color: var(--px-sun) !important; color: var(--ink) !important; }
              `}</style>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px', alignItems: 'stretch' }}>
                <div style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '16px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <div className={isSwipingID ? 'animate-swipe-id' : ''} style={{ width: '100%', maxWidth: '420px', aspectRatio: '1.58 / 1', borderRadius: 0, '--px': 'card', overflow: 'hidden', boxShadow: '0 8px 25px rgba(223,177,91,0.25)', position: 'relative' }}>
                    <img src="https://i.imgur.com/VeQr3gX.png" alt="Company ID Pass" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--px-card)', borderRadius: 0, '--px': 'panel', padding: '24px', boxShadow: '0 8px 25px rgba(223,177,91,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--px-accent)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Clock style={{ width: '16px', height: '16px' }} /> Punch Clock
                    </div>
                    <div className="kutitap-title" style={{ fontSize: '20px', color: 'var(--ink)', marginBottom: '14px' }}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <button onClick={handleTimeInToday} style={{ backgroundColor: 'var(--px-pink)', color: '#FFFFFF', borderRadius: 0, '--px': 'pill', padding: '16px 24px', fontWeight: 800, fontSize: '16px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(223,177,91,0.35)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <Sparkles style={{ width: '20px', height: '20px' }} /> Time In For Today!
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--px-muted)', marginTop: '10px' }}>
                    Swipes ID pass & records your shift automatically!
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 0, '--px': 'panel', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', boxShadow: '0 6px 20px rgba(223,177,91,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>Viewing Month:</span>
                  <select value={attMonthIndex} onChange={(e) => setAttMonthIndex(parseInt(e.target.value))} style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', padding: '8px 16px', fontWeight: 800, color: 'var(--px-accent)', fontSize: '14px', cursor: 'pointer' }}>
                    {months.map((m, idx) => (<option key={m} value={idx}>{m}</option>))}
                  </select>
                  <select value={attYear} onChange={(e) => setAttYear(parseInt(e.target.value))} style={{ backgroundColor: 'var(--px-butter)', borderRadius: 0, '--px': 'pill', padding: '8px 16px', fontWeight: 800, color: 'var(--px-accent)', fontSize: '14px', cursor: 'pointer' }}>
                    {maxAttYears.map(y => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '14px', fontWeight: 800, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={handleGenerateInvoicePDF} style={{ backgroundColor: 'var(--px-green-d)', color: '#FFFFFF', borderRadius: 0, '--px': 'pill', padding: '12px 20px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(11,122,66,0.25)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText style={{ width: '18px', height: '18px' }} /> Generate Invoice
                  </button>
                  <span style={{ color: 'var(--px-accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isPastMonth ? 'Historical USD/PHP:' : 'Live USD/PHP:'} ₱{displayRate.toFixed(2)} 
                    {!isPastMonth && (rateTrend === 'up' ? <ArrowUpRight style={{ width: '16px', height: '16px', color: 'var(--px-accent)' }} /> : <ArrowDownRight style={{ width: '16px', height: '16px', color: 'var(--px-accent)' }} />)}
                  </span>
                  <span style={{ color: 'var(--px-green-d)' }}>Worked Hours: {totalWorkedHours} hrs</span>
                  <span title={`Carries over to ${months[(attMonthIndex + 1) % 12]} ${attMonthIndex === 11 ? attYear + 1 : attYear} Expected Income`} style={{ color: 'var(--px-accent)' }}>Total Estimated Salary: ₱{estimatedSalaryPHP.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--px-sun)', borderRadius: 0, '--px': 'panel', overflowX: 'auto', boxShadow: '0 8px 25px rgba(223,177,91,0.2)', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--px-card)', borderBottom: '3px dashed var(--px-pink)' }}>
                      <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 800, color: 'var(--px-accent)', textAlign: 'center' }}>Shift Date ({attMonthName} {attYear})</th>
                      <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 800, color: 'var(--ink)', textAlign: 'center' }}>Day</th>
                      <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 800, color: 'var(--ink)', textAlign: 'center' }}>Attendance / Time In</th>
                      <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 800, color: 'var(--ink)', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 800, color: 'var(--px-green-d)', textAlign: 'center', backgroundColor: 'var(--px-mint-lt)' }}>Worked Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workingDays.map((dayNum, i) => {
                      const dateObj = new Date(attYear, attMonthIndex, dayNum);
                      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                      const mmStr = String(attMonthIndex + 1).padStart(2, '0');
                      const ddStr = String(dayNum).padStart(2, '0');
                      const dateKey = `${attYear}-${mmStr}-${ddStr}`;
                      const record = attendanceRecords[dateKey] || { timedIn: false, time: '-', status: '-', holidayOrLeave: '' };
                      const isTimedIn = !!record.timedIn;
                      const currentStatus = record.status || '-';

                      let activeWorkedHours = 0;
                      let statusBgColor = 'var(--px-card)';
                      let statusTextColor = 'var(--px-accent)';

                      if (currentStatus === 'Present') { activeWorkedHours = 8; statusBgColor = 'var(--px-mint)'; statusTextColor = 'var(--px-green-d)'; } 
                      else if (currentStatus === 'Late') { activeWorkedHours = 8; statusBgColor = '#FFF2A8'; statusTextColor = '#8A5A00'; } 
                      else if (currentStatus === 'Holiday' || currentStatus === 'Leave') { statusBgColor = '#DCCBFF'; statusTextColor = '#4B2E83'; } 
                      else if (currentStatus === 'Out of Shift') { statusBgColor = '#FFD9B0'; statusTextColor = '#A14A00'; }

                      return (
                        <tr key={dateKey} style={{ borderBottom: '1px solid rgba(255,255,255,0.6)', backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.4)' : 'transparent' }}>
                          <td style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 800, color: 'var(--ink)', textAlign: 'center' }}>{attMonthName} {dayNum}, {attYear}</td>
                          <td style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 700, color: 'var(--ink)', textAlign: 'center' }}>{dayOfWeek}</td>
                          <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                const newTimedIn = !isTimedIn;
                                const now = new Date();
                                const timeString = newTimedIn ? now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : '-';
                                const evalStatus = newTimedIn ? evaluateStatusFromTime(now) : '-';
                                setAttendanceRecords(prev => ({
                                  ...prev,
                                  [dateKey]: { ...record, timedIn: newTimedIn, time: timeString, status: evalStatus }
                                }));
                              }}
                              style={{ borderRadius: 0, '--px': 'pill', padding: '8px 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13px', backgroundColor: isTimedIn ? 'var(--px-card)' : 'rgba(255,255,255,0.8)', color: isTimedIn ? 'var(--px-green-d)' : 'var(--px-accent)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                            >
                              <Star style={{ width: '18px', height: '18px', color: isTimedIn ? '#FFD700' : 'var(--px-pink)', fill: isTimedIn ? '#FFD700' : 'none' }} />
                              {isTimedIn ? `Timed In (${record.time || 'Manual'})` : 'Click to Time In'}
                            </button>
                          </td>
                          <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                            <select value={currentStatus} onChange={(e) => handleUpdateDayStatus(dateKey, 'status', e.target.value)} className="cutesy-dropdown" style={{ backgroundColor: statusBgColor, color: statusTextColor }}>
                              <option value="-">-</option>
                              <option value="Present">Present</option>
                              <option value="Late">Late</option>
                              <option value="Out of Shift">Out of Shift</option>
                              <option value="Holiday">Holiday</option>
                              <option value="Leave">Leave</option>
                            </select>
                          </td>
                          <td style={{ padding: '12px 20px', fontSize: '15px', fontWeight: 800, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.5)', color: activeWorkedHours > 0 ? 'var(--px-green-d)' : 'var(--px-muted)' }}>
                            {activeWorkedHours}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}