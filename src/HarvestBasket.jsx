// Harvest Basket: the crops harvested on the Savings farm (kutitap_farm.basket), sold to Bun Bun.
import React from 'react';
import { CROPS } from './farm/farmLogic';
import cropsSheet from './assets/farm/crops.png';
import basketImg from './assets/farm/basket.png';
import spStarCoin from './assets/shop/star-coin.png';
import { bunBunPrice } from './farm/farmLogic';

const SCALE = 4; // 16px sprite -> 64px
const Coin = ({ size = 14 }) => <img className="px-sprite" src={spStarCoin} alt="" style={{ width: size, height: 'auto' }} />;

export function CropIcon({ row }) {
  return (
    <span
      className="px-sprite hb-spr"
      style={{ backgroundImage: `url(${cropsSheet})`, backgroundSize: `${112 * SCALE}px ${528 * SCALE}px`, backgroundPosition: `-${5 * 16 * SCALE}px -${row * 16 * SCALE}px` }}
    />
  );
}

export default function HarvestBasket({ basket, sold, nowMs, coins, onSell, onClose }) {
  const items = CROPS.filter((c) => (basket[c.id] || 0) > 0);
  return (
    <div className="hb-back" onClick={onClose}>
      <div className="hb-box" role="dialog" aria-label="Harvest basket" onClick={(e) => e.stopPropagation()}>
        <div className="hb-head">
          <img className="px-sprite hb-head-ico" src={basketImg} alt="" />
          <span className="hb-title">Harvest basket</span>
          <span className="hb-coins" title="Star Coins"><Coin size={18} />{coins.toLocaleString()}</span>
          <button type="button" className="hb-x" onClick={onClose} aria-label="Close the basket">X</button>
        </div>
        {items.length === 0 ? (
          <div className="hb-empty">
            <img className="px-sprite" src={basketImg} alt="" />
            <span>Your basket is empty.</span>
            <span className="hb-sub">Harvest a finished plot on the Savings farm and the crops land here.</span>
          </div>
        ) : (
          <div className="hb-grid">
            {items.map((c) => {
              const { price, trend } = bunBunPrice(c.id, nowMs, sold);
              return (
                <div key={c.id} className="hb-card">
                  <CropIcon row={c.row} />
                  <span className="hb-name">{c.name}</span>
                  <b className="hb-qty">x{basket[c.id]}</b>
                  <span className="ss-price"><Coin />{price}{trend !== 'same' && <i className={`hb-trend ${trend}`} />}</span>
                  <button type="button" className="ss-buy" onClick={() => onSell(c, price)} aria-label={`Sell one ${c.name} for ${price} Star Coins`}>Sell</button>
                </div>
              );
            })}
          </div>
        )}
        <div className="hb-foot">Bun Bun pays 20 to 30 Star Coins and changes his prices through the day.</div>
      </div>
    </div>
  );
}
