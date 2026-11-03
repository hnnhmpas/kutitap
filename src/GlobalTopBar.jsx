// Global top bar shown above every tab: Star Coins and the Shop button only.
import React from 'react';
import spStarCoin from './assets/shop/star-coin.png';

export default function GlobalTopBar({ coins, shopOpen, onToggleShop }) {
  return (
    <header className="gt-wrap">
      <div className="gt-bar">
        <div className="gt-chips">
          <span className="gt-chip" title="Star Coins">
            <img className="px-sprite" src={spStarCoin} alt="" style={{ width: 24, height: 'auto' }} />
            <b>{(coins || 0).toLocaleString()}</b><small>Star Coins</small>
          </span>
          <button type="button" className={`gt-shop${shopOpen ? ' open' : ''}`} onClick={onToggleShop} aria-pressed={shopOpen}>★ SHOP</button>
        </div>
      </div>
    </header>
  );
}
