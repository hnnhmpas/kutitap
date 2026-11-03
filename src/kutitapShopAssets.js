// Assets used by the Star Snack Shop room and the shop sounds.
import dialogBox from './assets/packs/dialog-box.png';
import dialogNext from './assets/packs/dialog-next.png';
import selC1 from './assets/packs/sel-c1.png';
import selC2 from './assets/packs/sel-c2.png';
import selC3 from './assets/packs/sel-c3.png';
import selC4 from './assets/packs/sel-c4.png';

import wavBing from './assets/audio/bing_1.wav';
import wavBoo from './assets/audio/boo_1.wav';
import wavBlup1 from './assets/audio/blup_1.wav';
import wavBlup2 from './assets/audio/blup_2.wav';
import wavBip from './assets/audio/bip_1.wav';
import wavSquick from './assets/audio/squick_squick_1.wav';
import wavPunch from './assets/audio/punch_1.wav';
import wavFlute1 from './assets/audio/flute_1.wav';
import wavFlute2 from './assets/audio/flute_2.wav';
import wavFlute3 from './assets/audio/flute_3.wav';
import wavFlute4 from './assets/audio/flute_4.wav';
import wavOpen from './assets/audio/shop-open.wav';

export const PK = { dialogBox, dialogNext, selOrange: [selC1, selC2, selC3, selC4] };

// YouTube video that plays while the shop is open (embedded player, muted by the sound toggle)
export const SHOP_MUSIC_ID = 'AQNQ0DSZ2As';

// Real sound files for the game events (the synth blips remain as the fallback for everything else).
export const SFX_WAV = {
  buy: [wavBing], miss: [wavBoo], coin: [wavBlup1], drop: [wavBlup2], grab: [wavBip],
  munch: [wavSquick], angry: [wavPunch], open: [wavOpen],
  sing: [wavFlute1, wavFlute2, wavFlute3, wavFlute4]
};
