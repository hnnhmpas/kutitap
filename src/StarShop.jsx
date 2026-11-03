// Star Snack Shop room (in-page, under the global top bar).
// Cabinets = pick a prize set, table = what you buy. The window shows Kutitap's sky OUTSIDE the glass
// (time of day + the random rainy days). The lamp lights up at night.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FOOD_SETS } from './kutitapFoods';
import { PK, SHOP_MUSIC_ID } from './kutitapShopAssets';
import { RainDrops, weatherLabel } from './kutitapWeather';
import spStarCoin from './assets/shop/star-coin.png';
import spNote from './assets/shop/note.png';
import spAnger from './assets/shop/anger.png';
import spSun from './assets/shop/sun.png';
import spMoon from './assets/shop/moon.png';
import spTwinkle from './assets/shop/twinkle.png';
import spCloud from './assets/shop/cloud.png';
import shBunny from './assets/shop/bunny-all.png';
import imgDoor from './assets/shop2/door.png';
import imgClock from './assets/shop2/clock.png';
import imgWindow from './assets/shop2/window.png';
import imgCabinet from './assets/shop2/cabinet.png';
import imgTable from './assets/shop2/table.png';
import imgLamp from './assets/shop2/lampstand.png';

const SCENE_W = 1000;
const SCENE_H = 700;
// 14 sets spread over two cabinets, three shelves each: [3, 2, 2] sets per shelf
const SHELF_ROWS = [[0, 1, 2], [3, 4], [5, 6], [7, 8, 9], [10, 11], [12, 13]];

// Bun Bun's random chatter (fun lines that match the shop theme)
const CHATTER = [
  'Hehe! Did you know a bun is just a bunny in a bread costume?',
  'Kutitap told me it dreams about sushi. Me? Carrots. Always carrots.',
  'Psst... paying your bills on time earns bonus claw rounds!',
  'Every Star Coin you save is a snack for later!',
  'I tried to count all the sprinkles today. I lost count at... a lot.',
  'Hop hop! Business is booming at the Star Snack Shop!',
  'Bun Bun tip: bills first, snacks second. Then snacks again!',
  'Kutitap sniffed the cookie tin earlier. Suspicious!',
  'If you listen closely, the cabinets hum a tiny snack song.',
  'I polish these shelves every day. Okay, every other day. Okay... sometimes.',
  'Try the claw machine! Rare treats are worth 15 coins, but worth it!'
];
const timeLine = (tod, rain) => (rain
  ? 'Pitter patter! Rainy days are the best days for cozy snacks.'
  : { morning: 'Good morning! The first snack of the day is the tastiest.', day: 'What a sunny day! Perfect for a picnic snack.', sunset: 'Look at that sunset! Even the pastries are blushing.', night: 'The lamp is glowing. Time for a midnight snack!' }[tod]);

// Where Bun Bun wanders (feet position). He leaves and returns along the wall side of the table.
const HOME = { x: 555, y: 384 };
const SPOTS = [{ x: 90, y: 420 }, { x: 110, y: 540 }, { x: 170, y: 640 }, { x: 800, y: 440 }, { x: 870, y: 520 }, { x: 790, y: 560 }, { x: 905, y: 420 }];
const BEHIND_Y = 366;
const SPEED = 60; // px per second
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const Coin = ({ size = 14 }) => <img className="px-sprite" src={spStarCoin} alt="" style={{ width: size, height: 'auto' }} />;

const readMuted = () => { try { return window.localStorage.getItem('kutitap_sfx') === 'off'; } catch (e) { return false; } };

function useFit(ref) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => setScale(Math.min(1.4, Math.max(0.3, el.clientWidth / SCENE_W)));
    fit();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return scale;
}

// Music only plays while the shop is open and sound is on (the top-right sound toggle mutes it).
function ShopMusic({ muted }) {
  if (muted) return null;
  const src = `https://www.youtube.com/embed/${SHOP_MUSIC_ID}?autoplay=1&loop=1&playlist=${SHOP_MUSIC_ID}&controls=0&playsinline=1`;
  return <iframe className="ss-music" title="Shop music" src={src} allow="autoplay; encrypted-media" tabIndex={-1} />;
}

// The window picture is drawn ON TOP of the sky, so rain and sun stay outside, behind the glass and curtains.
function SkyWindow({ tod, rain, onClick }) {
  return (
    <button type="button" className="ss-window" aria-label={`Window: ${weatherLabel(tod, rain)}`} onClick={onClick}>
      <span className={`ss-outside tod-${tod}${rain ? ' rainy' : ''}`}>
        {!rain && tod === 'night' && [[12, 14], [56, 34], [100, 10], [128, 56], [30, 62]].map(([l, t], i) => (
          <img key={i} className="px-sprite ss-sky kt-star" src={spTwinkle} alt="" style={{ left: l, top: t, width: 9, animationDelay: `${i * 0.3}s` }} />
        ))}
        {!rain && tod === 'night' && <img className="px-sprite ss-sky" src={spMoon} alt="" style={{ left: 96, top: 18, width: 34 }} />}
        {!rain && (tod === 'morning' || tod === 'day') && <img className="px-sprite ss-sky" src={spSun} alt="" style={tod === 'morning' ? { left: 14, top: 52, width: 42 } : { left: 98, top: 12, width: 42 }} />}
        {!rain && tod === 'sunset' && <img className="px-sprite ss-sky" src={spSun} alt="" style={{ left: 54, top: 54, width: 52 }} />}
        {!rain && tod !== 'night' && <img className="px-sprite ss-sky" src={spCloud} alt="" style={{ left: 16, top: 14, width: 48, opacity: 0.95 }} />}
        {rain && <img className="px-sprite ss-sky ss-raincloud" src={spCloud} alt="" style={{ left: 4, top: 6, width: 62 }} />}
        {rain && <img className="px-sprite ss-sky ss-raincloud" src={spCloud} alt="" style={{ left: 74, top: 16, width: 58 }} />}
        {rain && <RainDrops count={22} />}
        <i className="ss-hill" />
      </span>
      <img className="ss-window-img" src={imgWindow} alt="" />
    </button>
  );
}

export default function StarShop({ star, setStar, now, tod, rain, game, onClose }) {
  const { cravingHint, tasteMonthKey, sfx } = game;
  const [tab, setTab] = useState(FOOD_SETS[0].id);
  const [bubble, setBubble] = useState(null); // { text, auto }
  const [portrait, setPortrait] = useState({ row: 3, col: 0 });
  const bunnyRef = useRef(null);
  const sprRef = useRef(null);
  const live = useRef({});
  const [justBought, setJustBought] = useState(null);
  const [muted, setMuted] = useState(readMuted);
  const wrapRef = useRef(null);
  const scale = useFit(wrapRef);

  const monthKey = tasteMonthKey(now);
  const hint = cravingHint(monthKey);
  const tried = (star.tried || {})[monthKey] || {};
  const coins = star.coins || 0;
  const activeSet = FOOD_SETS.find((s) => s.id === tab) || FOOD_SETS[0];
  const clockText = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  // Bun Bun talks: each line shows a random bunny pose as the portrait
  const say = (text, auto = false) => {
    setPortrait({ row: 1 + Math.floor(Math.random() * 3), col: Math.floor(Math.random() * 5) });
    setBubble({ text, auto });
  };
  live.current = { bubble, tod, rain, say };

  useEffect(() => {
    say(`Welcome! Kutitap is craving something from the ${hint.craving.join(', ')}...`);
    sfx('open'); // cute opening sound
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onMute = (e) => setMuted(!!(e.detail && e.detail.muted));
    window.addEventListener('keydown', onKey);
    window.addEventListener('kutitap-sfx-mute', onMute);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('kutitap-sfx-mute', onMute); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // random fun chatter every so often (fades away by itself)
  useEffect(() => {
    let t;
    const loop = () => {
      t = setTimeout(() => {
        const { bubble: b, tod: td, rain: rn, say: sy } = live.current;
        if (!b) sy(Math.random() < 0.3 ? timeLine(td, rn) : pick(CHATTER), true);
        loop();
      }, rnd(22000, 38000));
    };
    loop();
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!bubble || !bubble.auto) return undefined;
    const t = setTimeout(() => setBubble(null), 9000);
    return () => clearTimeout(t);
  }, [bubble]);

  // Bun Bun wanders around the shop, then returns behind the table
  useEffect(() => {
    const el = bunnyRef.current;
    const spr = sprRef.current;
    if (!el || !spr) return undefined;
    let raf;
    let last = performance.now();
    let pos = { ...HOME };
    let queue = [];
    let idleUntil = last + rnd(5000, 9000);
    let waitUntil = 0;
    let row = 3;
    let flip = 1;
    const draw = (moving) => {
      el.style.left = `${pos.x - 35}px`;
      el.style.top = `${pos.y - 90}px`;
      el.style.zIndex = pos.y > 388 ? 7 : 4; // behind the table at the back wall, in front on the floor
      el.style.transform = `scaleX(${flip})`;
      el.classList.toggle('walking', moving);
      spr.style.backgroundPositionY = `${-row * 90}px`;
    };
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let moving = false;
      if (queue.length === 0 && now >= idleUntil) {
        const spot = pick(SPOTS);
        const side = spot.x < HOME.x ? 190 : 770;
        queue = [
          { x: HOME.x, y: BEHIND_Y }, { x: side, y: BEHIND_Y }, { ...spot, wait: rnd(4000, 8000) },
          { x: side, y: BEHIND_Y }, { x: HOME.x, y: BEHIND_Y }, { ...HOME }
        ];
      }
      if (queue.length && now >= waitUntil) {
        const t = queue[0];
        const dx = t.x - pos.x;
        const dy = t.y - pos.y;
        const dist = Math.hypot(dx, dy);
        const step = SPEED * dt;
        if (dist <= step) {
          pos = { x: t.x, y: t.y };
          queue.shift();
          if (t.wait) { waitUntil = now + t.wait; row = 3; }
          if (queue.length === 0) { idleUntil = now + rnd(8000, 16000); row = 3; flip = 1; }
        } else {
          pos = { x: pos.x + (dx / dist) * step, y: pos.y + (dy / dist) * step };
          moving = true;
          if (Math.abs(dy) > Math.abs(dx)) { row = dy < 0 ? 0 : 3; } else { row = 3; flip = dx < 0 ? -1 : 1; }
        }
      }
      draw(moving);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const buy = (food) => {
    if (coins < food.price) { say('Not enough Star Coins! Try the claw machine on the Dashboard.'); sfx('miss'); return; }
    setStar((prev) => {
      const c = prev.coins || 0;
      if (c < food.price) return prev;
      return { ...prev, coins: c - food.price, pantry: { ...(prev.pantry || {}), [food.id]: ((prev.pantry || {})[food.id] || 0) + 1 } };
    });
    say(`Thank you! One ${food.name} for Kutitap. Maybe it will love it!`);
    setJustBought(food.id);
    setTimeout(() => setJustBought(null), 700);
    sfx('buy');
  };
  const pickSet = (set) => {
    setTab(set.id);
    say(hint.craving.includes(set.name) ? `${set.name}... Kutitap has been eyeing this shelf!` : `${set.name}: fresh treats on the table!`);
    sfx('grab');
  };
  const windowTalk = () => say(rain
    ? 'Pitter patter... a rainy day! It rains about 3 times a month. Cozy shop weather!'
    : `${weatherLabel(tod, false)} outside. The window follows Kutitap's sky!`);

  const lightClass = rain && tod === 'night' ? 'night' : (tod === 'day' ? '' : tod);

  return (
    <section className="ss-root" aria-label="Star Snack Shop">
      <ShopMusic muted={muted} />
      <div className="ss-fit" ref={wrapRef} style={{ height: SCENE_H * scale }}>
        <div className={`ss-scene tod-room-${tod}`} style={{ width: SCENE_W, height: SCENE_H, transform: `scale(${scale})` }}>
          <div className="ss-wall" />
          <div className="ss-beam"><span className="ss-sign">★ STAR SNACK SHOP ★</span></div>
          <button type="button" className="ss-leave" onClick={onClose} aria-label="Leave the shop">X</button>
          <div className="ss-floor" />

          {/* left wall */}
          <button type="button" className="ss-obj ss-clock" aria-label="Clock" onClick={() => say(`It is ${clockText}. Kutitap's sky changes with the time of day!`)}><img className="px-sprite" src={imgClock} alt="" /></button>
          <img className="ss-door" src={imgDoor} alt="" />
          <SkyWindow tod={tod} rain={rain} onClick={windowTalk} />

          {/* lamp: lights up at night */}
          <div className="ss-lampglow" />
          <button type="button" className="ss-obj ss-lamp" aria-label="Lamp" onClick={() => say(tod === 'night' ? 'The lamp keeps the shop cozy at night.' : 'The lamp turns on when night falls.')}><img src={imgLamp} alt="" /></button>

          {/* food cabinets = set selector (3 foods per category) */}
          {[0, 1].map((cab) => (
            <div key={cab} className={`ss-cabinet c${cab}`}>
              <img className="ss-cabinet-img" src={imgCabinet} alt="" />
              {SHELF_ROWS.slice(cab * 3, cab * 3 + 3).map((row, r) => (
                <div key={r} className={`ss-shelf r${r} n${row.length}`}>
                  {row.map((i) => {
                    const set = FOOD_SETS[i];
                    const on = set.id === tab;
                    return (
                      <button type="button" key={set.id} className={`ss-group${on ? ' on' : ''}`} data-name={set.name + (hint.craving.includes(set.name) ? ' ★' : '')} aria-label={set.name} aria-pressed={on} onClick={() => pickSet(set)}>
                        {set.foods.slice(0, 3).map((f) => <img key={f.id} className="px-sprite" src={f.src} alt="" />)}
                        {on && PK.selOrange.map((src, k) => <img key={k} className={`px-sprite ss-sel c${k}`} src={src} alt="" />)}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}

          {/* Bun Bun: starts behind the table and wanders around the shop */}
          <button type="button" className="ss-bunny" ref={bunnyRef} aria-label="Bun Bun, the shopkeeper" onClick={() => say(pick(CHATTER))}>
            <span ref={sprRef} className="px-sprite ss-bunny-anim" style={{ backgroundImage: `url(${shBunny})` }} />
          </button>

          {/* table = what you buy */}
          <div className="ss-table">
            <img className="ss-table-img" src={imgTable} alt="" />
            <span className="ss-tname">{activeSet.name}</span>
            <div className="ss-top">
              {activeSet.foods.map((food) => {
                const t = tried[food.id];
                const owned = (star.pantry || {})[food.id] || 0;
                return (
                  <div key={food.id} className="ss-slot">
                    {t === 'love' && <span className="ss-tag yum"><img className="px-sprite" src={spNote} alt="" />YUMMY!</span>}
                    {t === 'hate' && <span className="ss-tag yuck"><img className="px-sprite" src={spAnger} alt="" />YUCKY!</span>}
                    {food.rare && !t && <span className="ss-tag rare">RARE</span>}
                    <span className={`ss-item${food.rare ? ' rare-glow' : ''}${justBought === food.id ? ' bought' : ''}`} title={food.name}>
                      <img className="px-sprite" src={food.src} alt={food.name} />
                      {owned > 0 && <b className="ss-owned">x{owned}</b>}
                    </span>
                    <span className="ss-price"><Coin />{food.price}</span>
                    <button type="button" className={`ss-buy${coins >= food.price ? '' : ' poor'}`} onClick={() => buy(food)} aria-label={`Buy ${food.name} for ${food.price} Star Coins`}>Buy</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`ss-light ${lightClass}`} aria-hidden="true" />

          {/* dialogue box (Stardew-style): name tab, portrait, wide text, Okay */}
          {bubble && (
            <>
              <div className="ss-portrait" style={{ backgroundImage: `url(${shBunny})`, backgroundPosition: `-${portrait.col * 112}px -${portrait.row * 144}px` }} />
              <div className="ss-name" style={{ '--dlg': `url(${PK.dialogBox})` }}>Bun Bun</div>
              <div className="ss-bubble" role="status" style={{ '--dlg': `url(${PK.dialogBox})` }}>
                <span className="ss-bubble-text">{bubble.text}</span>
                <button type="button" className="ss-ok" onClick={() => setBubble(null)}>Okay <i /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
