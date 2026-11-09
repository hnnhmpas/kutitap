// Star Snack Shop room (in-page).
// Cabinets = pick a prize set, table = what you buy. The window shows Kutitap's sky OUTSIDE the glass
// (time of day + the random rainy days). The lamp lights up at night.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FOOD_SETS } from './kutitapFoods';
import HarvestBasket from './HarvestBasket';
import { priceWindow } from './farm/farmLogic';
import basketImg from './assets/farm/basket.png';
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
import shBunnyRun from './assets/shop/bunny-run.png';
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

// What Bun Bun says when you pick a shelf
const SET_SPEECH = {
  'Berry Bakery': 'I picked the sweetest, juicy berries this morning and baked them into warm, cozy pies!',
  'Veggie Patch': 'Crunchy carrots and crisp greens straight from my garden, they\u2019re so fresh and yummy!',
  'Vending Corner': 'Clink! Pop a coin in the little machine and see what fun snack drops out for you!',
  'Cookie Tin': 'Smell that? They\u2019re warm chocolate chip cookies fresh from the oven, ready for nibbling!',
  'Sushi Bar': 'Little rice bites wrapped up so neat and tidy, they\u2019re almost too pretty to eat!',
  'Ramen Shop': 'A big, warm bowl of noodle soup! It makes your tummy feel so cozy on a cool day.',
  'Toast Cafe': 'Thick slices of warm bread with melty butter on top... simple, golden, and delicious!',
  'Snack Shack': 'Salty, crunchy little treats that are super fun to munch on while you walk around!',
  'Fruit Basket': 'Look at all the bright, happy colors! Every single fruit is sweet, juicy, and full of sunshine.',
  'Dango Stand': 'Soft, chewy rice balls drizzled in sweet sauce! Three little bites on a stick!',
  'Breakfast Table': 'A big, lovely morning plate with eggs and toast to start your whole day with a smile!',
  'Bread Basket': 'The softest, fluffiest loaves of bread ever! They smell just like sweet warm sunshine.',
  'Pizza and Burgers': 'Cheesy, gooey, and super savory\u2014perfect when your tummy is making big hungry rumbles!',
  'Konbini Snacks': 'My absolute favorite late-night treats! All wrapped up and ready for a quick bedtime bite.'
};

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
  'Try the claw machine! Rare treats are worth 15 coins, but worth it!',
  'Bun Bun\u2019s tummy is rumbling, but Bun Bun must NOT eat the inventory... oops, I ate it.',
  'S-sometimes Bun Bun likes to sit in a sunbeam and count his shiny coins. One for savings, one for snacks, and one... oh, Bun Bun accidentally ate a strawberry instead of saving it!',
  'Thank you for stopping by! Bun Bun appreciates your customer lifetime value... um, Bun Bun means, Bun Bun just really loves seeing your happy smile!',
  'W-welcome in! The floor is super clean today because Bun Bun swept it with his own fluffy tail... wait, no, Bun Bun used a real broom, promise!',
  'If you ever feel a little sad, Bun Bun recommends three things: a warm cup of sweet tea, a soft blanket, and a big hop hop in the sunshine!',
  'Bun Bun\u2019s favorite trick is making a delicious treat disappear! Want to see? nom nom nom ...See? It\u2019s gone right into Bun Bun\u2019s tummy!',
  'Bun Bun made a tiny little rule today: everyone who visits the shop gets a free mental hug! *squeezes eyes shut and sends warm hugs your way*',
  'Wait! Don\u2019t step there! A tiny ladybug is taking an afternoon rest on that floor tile... Bun Bun put a little crumb next to her for lunch!',
  'Bun Bun loves when you stop by! It makes Bun Bun\u2019s heart go thump-thump-thump like a tiny little drum!',
  'Bun Bun thinks the best kind of weather is \u2018bread weather\u2019\u2014that\u2019s when it\u2019s cool outside, but warm and sweet-smelling inside the shop!',
  'Bun Bun tried to learn how to purr like Kutitap this morning... but Bun Bun just made a little squeak-snort sound instead! *giggles and covers nose with tiny paws*',
  'Wait, Kutitap! Don\u2019t wiggle your tail so fast, Bun Bun keeps trying to catch it! ...Oof, Bun Bun tumbled over his own floppy ears!',
  'Why did the cat go to the bakery? To get a purr-fect slice of berry pie! Bun Bun thought of that joke just for Kutitap!',
  'Kutitap, if you do a big stretch, Bun Bun will do a big hop hop! Ready? One, two, three... boing!',
  'Bun Bun saved an extra soft loaf of bread today just in case Kutitap wants to practice making tiny biscuits on it!',
  'Ooh, Kutitap\u2019s whiskers are twitching! Is Kutitap smelling the fresh cinnamon rolls, or is Kutitap just happy to see Bun Bun?'
];
const timeLine = (tod, rain) => (rain
  ? 'Pitter patter! Rainy days are the best days for cozy snacks.'
  : { morning: 'Good morning! The first snack of the day is the tastiest.', day: 'What a sunny day! Perfect for a picnic snack.', sunset: 'Look at that sunset! Even the pastries are blushing.', night: 'The lamp is glowing. Time for a midnight snack!' }[tod]);

// Where Bun Bun wanders (feet position). He leaves and returns along the wall side of the table.
const HOME = { x: 555, y: 384 };
const SPOTS = [{ x: 90, y: 420 }, { x: 110, y: 540 }, { x: 170, y: 640 }, { x: 800, y: 440 }, { x: 870, y: 520 }, { x: 790, y: 560 }, { x: 905, y: 420 }];
const BEHIND_Y = 366;
const BUNNY_H = 95;
// While a speech box is open, the area under it (and the portrait) is off limits for Bun Bun
const inBubbleZone = (p) => p.y > 556 || (p.y > 514 && p.x > 790 && p.x < 975);
const homeRoute = (from) => [{ x: from.x < HOME.x ? 190 : 770, y: BEHIND_Y }, { x: HOME.x, y: BEHIND_Y }, { ...HOME }];
const SPEED = 60; // px per second
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const Coin = ({ size = 14 }) => <img className="px-sprite" src={spStarCoin} alt="" style={{ width: size, height: 'auto' }} />;

const readMuted = () => { try { return window.localStorage.getItem('kutitap_sfx') === 'off'; } catch (e) { return false; } };

// Speech text: starts at the normal size and shrinks (down to 13px) until it fits inside the bubble.
function FitText({ text }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      let size = 26;
      el.style.fontSize = `${size}px`;
      while (size > 13 && el.scrollHeight > el.clientHeight + 1) { size -= 1; el.style.fontSize = `${size}px`; }
    };
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    return undefined;
  }, [text]);
  return <span ref={ref} className="ss-bubble-text">{text}</span>;
}

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

export default function StarShop({ star, setStar, farm, setFarm, now, tod, rain, game, onClose }) {
  const { cravingHint, tasteMonthKey, sfx } = game;
  const [tab, setTab] = useState(FOOD_SETS[0].id);
  const [bubble, setBubble] = useState(null); // { text, auto }
  const [portrait, setPortrait] = useState({ row: 3, col: 0 });
  const bunnyRef = useRef(null);
  const sprRef = useRef(null);
  const live = useRef({});
  const [justBought, setJustBought] = useState(null);
  const [basketOpen, setBasketOpen] = useState(false);
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
  live.current = { bubble, tod, rain, say, basketOpen, closeBasket: () => setBasketOpen(false) };

  useEffect(() => {
    say(`Welcome! Kutitap is craving something from the ${hint.craving.join(', ')}...`);
    sfx('open'); // cute opening sound
    const onKey = (e) => { if (e.key !== 'Escape') return; if (live.current.basketOpen) live.current.closeBasket(); else onClose(); };
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
    const draw = (moving) => {
      el.style.left = `${pos.x - 35}px`;
      el.style.top = `${pos.y - BUNNY_H}px`;
      // he only ever passes BEHIND the red table (everything else he walks in front of)
      el.style.zIndex = pos.x >= 225 && pos.x <= 735 && pos.y <= 392 ? 4 : 7;
      el.classList.toggle('walking', moving);
      spr.style.backgroundImage = `url(${moving ? shBunnyRun : shBunny})`;
      spr.style.backgroundPositionY = `${-row * BUNNY_H}px`;
    };
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let moving = false;
      const talking = !!live.current.bubble;
      if (talking && inBubbleZone(pos)) {
        // a speech box just opened over him: step out from under it
        queue = [];
        pos = { x: pos.x, y: pos.y - SPEED * 1.4 * dt };
        row = 0;
        draw(true);
        raf = requestAnimationFrame(tick);
        return;
      }
      if (queue.length === 0 && now >= idleUntil && pos.x === HOME.x && pos.y === HOME.y) {
        const spot = pick(SPOTS.filter((sp) => !(talking && inBubbleZone(sp))));
        const side = spot.x < HOME.x ? 190 : 770;
        queue = [
          { x: HOME.x, y: BEHIND_Y }, { x: side, y: BEHIND_Y }, { ...spot, wait: rnd(4000, 8000) },
          { x: side, y: BEHIND_Y }, { x: HOME.x, y: BEHIND_Y }, { ...HOME }
        ];
      }
      if (queue.length && talking && inBubbleZone(queue[0])) queue = homeRoute(pos);
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
          if (queue.length === 0) { idleUntil = now + rnd(8000, 16000); row = 3; }
        } else {
          pos = { x: pos.x + (dx / dist) * step, y: pos.y + (dy / dist) * step };
          moving = true;
          if (Math.abs(dy) > Math.abs(dx)) { row = dy < 0 ? 0 : 3; } else { row = 3; }
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
  // ---- Harvest basket: sell crops to Bun Bun ----
  const basket = (farm && farm.basket) || {};
  const basketTotal = Object.values(basket).reduce((a, n) => a + (n || 0), 0);
  const nowMs = now.getTime();
  const openBasket = () => {
    setBasketOpen(true);
    say(basketTotal > 0
      ? 'Ooh, look at that harvest! My prices change through the day, so a crop might pay more later.'
      : 'Your basket is empty! Harvest a finished plot on the farm and bring the crops to me.');
    sfx('grab');
  };
  const sell = (crop, price) => {
    if ((basket[crop.id] || 0) < 1) return;
    const win = priceWindow(nowMs);
    setFarm((prev) => {
      const base = prev || {};
      const b = { ...(base.basket || {}) };
      if (!(b[crop.id] > 0)) return prev;
      b[crop.id] -= 1;
      if (b[crop.id] <= 0) delete b[crop.id];
      const sd = { ...(base.sold || {}) };
      const cur = sd[crop.id] && sd[crop.id].win === win ? sd[crop.id].n : 0;
      sd[crop.id] = { win, n: cur + 1 };
      return { ...base, basket: b, sold: sd };
    });
    setStar((prev) => ({ ...prev, coins: (prev.coins || 0) + price }));
    say(price >= 27 ? `Wow, top price today! ${price} Star Coins for that ${crop.name}!`
      : price <= 22 ? `A little low right now, but a deal is a deal. ${price} Star Coins for your ${crop.name}.`
      : `Deal! ${price} Star Coins for one ${crop.name}. Thank you!`);
    sfx('buy');
  };
  const pickSet = (set) => {
    setTab(set.id);
    say(SET_SPEECH[set.name] || `${set.name}: fresh treats on the table!`);
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
          <div className="ss-hud">
            <button type="button" className="ss-basket-btn" onClick={openBasket} aria-label="Open the harvest basket" title="Harvest basket">
              <img className="px-sprite" src={basketImg} alt="" />
              {basketTotal > 0 && <b className="ss-owned">{basketTotal}</b>}
            </button>
            <span className="ss-coins" title="Star Coins"><Coin size={20} />{coins.toLocaleString()}</span>
          </div>
          <button type="button" className="ss-leave" onClick={onClose} aria-label="Leave the shop">X</button>
          <div className="ss-floor" />

          {/* left wall */}
          <button type="button" className="ss-obj ss-clock" aria-label="Clock" onClick={() => say(`It is ${clockText}. Kutitap's sky changes with the time of day!`)}><img className="px-sprite" src={imgClock} alt="" /></button>
          <button type="button" className="ss-door-btn" aria-label="Door: leave the shop" onClick={onClose}><img src={imgDoor} alt="" /></button>
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
                    {t === 'ok' && <span className="ss-tag okay">OKAY</span>}
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

          {basketOpen && <HarvestBasket basket={basket} sold={(farm && farm.sold) || {}} nowMs={nowMs} coins={coins} onSell={sell} onClose={() => setBasketOpen(false)} />}

          {/* dialogue box (Stardew-style): name tab, portrait, wide text, Okay */}
          {bubble && (
            <>
              <div className="ss-portrait" style={{ backgroundImage: `url(${shBunny})`, backgroundPosition: `-${portrait.col * 112}px -${portrait.row * 152}px` }} />
              <div className="ss-name" style={{ '--dlg': `url(${PK.dialogBox})` }}>Bun Bun</div>
              <div className="ss-bubble" role="status" style={{ '--dlg': `url(${PK.dialogBox})` }}>
                <FitText text={bubble.text} />
                <button type="button" className="ss-ok" onClick={() => setBubble(null)}>Okay <i /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
