// Quest / envelope style copy. Placeholders: {name} {amount} {tab} {due}
// FIRST = sent 2 days before the due date (25).  FOLLOW = sent on the due date (25).
// Each entry: s = subject, t = quest title on the scroll, b = message, x = sign-off.

export const FIRST = [
  { s: 'A new quest scroll arrived for {name}', t: 'New quest unlocked!', b: 'A sealed envelope just landed on your doorstep, adventurer. Your quest: settle {amount} for {name} in the {tab} guild by {due}. Two days is plenty of time to prepare.', x: 'Kutitap is polishing your sword. Nya!' },
  { s: 'Psst, an owl delivered news about {name}', t: 'The courier owl has landed', b: 'Hoo-hoo! This little owl flew all night to remind you that {name} ({tab}) needs {amount} by {due}. Give it a treat and plan your coins.', x: 'Signed with a feather, Kutitap' },
  { s: 'The wax seal is broken: {name} is due soon', t: 'Open this envelope', b: 'You cracked the star-shaped wax seal, so here is the secret: {amount} is due for {name} on {due}. It belongs to the {tab} guild ledger.', x: 'Sealed with a tiny pawprint' },
  { s: 'Starlight mission briefing: {name}', t: 'Mission briefing', b: 'The stars have aligned and they spell {due}. By then, {amount} must reach {name} in {tab}. You have two nights of twinkling to get ready.', x: 'Twinkle twinkle, Kutitap' },
  { s: 'Treasure map: X marks the due date for {name}', t: 'X marks the spot', b: 'Follow the dotted line to {due}, where {amount} for {name} ({tab}) is waiting to be paid. Pirates would call this an easy treasure hunt.', x: 'Yarr, from your first mate Kutitap' },
  { s: 'A notice from the {tab} guild about {name}', t: 'Guild notice', b: 'The {tab} guildmaster has posted your name on the quest board. Pay {amount} for {name} by {due} and keep your reputation shining.', x: 'Stamped by the guild, delivered by Kutitap' },
  { s: 'Only two sleeps until {name} is due', t: 'Two sleeps to go', b: 'Count them on your paws: one sleep, two sleeps, then {due}. That is when {amount} for {name} ({tab}) is expected. Dream of coins well kept.', x: 'Sleepy purrs, Kutitap' },
  { s: 'Side quest: keep {amount} safe for {name}', t: 'Side quest available', b: 'Tuck {amount} away from the snack shop and the claw machine. It has a date with {name} in {tab} on {due}.', x: 'Your loyal quest buddy, Kutitap' },
  { s: 'The scout cat reports: {name} on the horizon', t: 'Scout report', b: 'From the tallest tree, I spotted a due date coming your way. Target: {name} in {tab}. Cost: {amount}. Arrival: {due}.', x: 'Ears up, Kutitap' },
  { s: 'Brewing a reminder potion for {name}', t: 'Potion of gentle reminders', b: 'One drop of starlight, two pinches of patience, and the result is this note: {amount} is due for {name} ({tab}) on {due}. Drink responsibly, pay on time.', x: 'Bubbling with love, Kutitap' },
  { s: 'Boss battle in two days: {name}', t: 'Boss battle approaches', b: 'The final boss, {name}, will appear on {due} demanding {amount}. The {tab} dungeon is close, so sharpen your budget and be ready.', x: 'Press start when you are ready. Kutitap' },
  { s: 'Pack your Star Coins for {name}', t: 'Adventure packing list', b: 'Pack light but pack {amount}. The road leads to {name} in the {tab} guild, and the gates close on {due}.', x: 'Backpack checked, Kutitap' },
  { s: 'The bard sings of {name} and a due date', t: 'A ballad for your wallet', b: 'Sing it loud: on {due} falls the day, {amount} for {name} to pay. The {tab} tavern is listening, so keep the tune in tune.', x: 'La la la, Kutitap the bard' },
  { s: 'Messenger pigeon says {name} is almost due', t: 'Pigeon post', b: 'Coo! A very tired pigeon carried this envelope across three rooftops. The message: {amount} for {name} ({tab}) is due on {due}.', x: 'Crumbs gratefully accepted, Kutitap' },
  { s: 'The drawbridge lifts for {name} on {due}', t: 'Castle announcement', b: 'Hear ye! The drawbridge to the {tab} castle rises on {due}. Bring {amount} for {name} before it does.', x: 'By royal decree of Kutitap' },
  { s: 'A moonlit mailbox note for {name}', t: 'Moonlit mail', b: 'While you were busy being wonderful, the moon slipped a letter into your mailbox. It says {name} needs {amount} on {due}, filed under {tab}.', x: 'Goodnight moon, Kutitap' },
  { s: 'Quest log updated: {name}', t: 'Quest log entry', b: 'A new entry was added to your log. Objective: pay {amount} to {name} ({tab}). Deadline: {due}. Time remaining: two days.', x: 'Auto-saved by Kutitap' },
  { s: 'The crystal ball foresees {name}', t: 'The crystal ball speaks', b: 'I see coins, I see a calendar, and I see {due} circled in pink. The vision says {amount} for {name} in {tab}. It also says you will do great.', x: 'Mystically yours, Kutitap' },
  { s: 'A key, a lock and a due date: {name}', t: 'The dungeon key', b: 'The lock on the {tab} dungeon opens only with {amount}. Bring it for {name} by {due} and the door swings wide.', x: 'Keys jingling, Kutitap' },
  { s: 'Campfire briefing: {name} is due in two days', t: 'Campfire briefing', b: 'Gather round the fire, hero. Tomorrow we rest, the day after we prepare, and then comes {due}: {amount} for {name} ({tab}).', x: 'Marshmallows are on you. Kutitap' },
  { s: 'Your hero checklist has a new item: {name}', t: 'Hero checklist', b: 'Check the boxes: sword, snacks, and {amount} for {name} in the {tab} guild. The last one is due on {due}.', x: 'Ticking boxes with you, Kutitap' },
  { s: 'Sealed with a pawprint: {name}', t: 'Pawprint post', b: 'This envelope carries one very small request. Please set aside {amount} for {name} ({tab}) so it is ready on {due}.', x: 'Pressed with one soft paw, Kutitap' },
  { s: 'A shooting star carried this message about {name}', t: 'Shooting star telegram', b: 'Whoosh! A star streaked past with a note: {name} in {tab} will ask for {amount} on {due}. Make a wish, then make a plan.', x: 'Wishing upon you, Kutitap' },
  { s: 'Bun Bun heard a rumour about {name}', t: 'Rumours from the shop', b: 'Bun Bun whispered over the counter that {amount} is due for {name} ({tab}) on {due}. He is rarely wrong about these things.', x: 'Passed along by Kutitap' },
  { s: 'Armor up: {name} is two days away', t: 'Armor up', b: 'Strap on your boots and shine your shield. In two days, on {due}, you face {name} in the {tab} guild with {amount} in hand.', x: 'Right behind you, Kutitap' },
];

export const FOLLOW = [
  { s: 'Quest deadline today: {name}', t: 'Deadline day!', b: 'The sealed envelope is back, and this time it means today. Deliver {amount} for {name} ({tab}) and your quest is complete.', x: 'Cheering from the sidelines, Kutitap' },
  { s: 'The sun is high and {name} is due now', t: 'High noon quest', b: 'The sun reached the top of the sky and so did your due date. {amount} for {name} in the {tab} guild is expected today, {due}.', x: 'Sunny paws, Kutitap' },
  { s: 'Final call from the {tab} guild: {name}', t: 'Final call', b: 'The guildmaster is ringing the bell one last time. Today, {due}, is the day to hand over {amount} for {name}.', x: 'Ding ding, Kutitap' },
  { s: 'The boss fight begins today: {name}', t: 'Boss fight!', b: '{name} has entered the arena in {tab} and wants {amount}. You prepared for this moment, so step in and finish it.', x: 'Health bar full, Kutitap' },
  { s: 'The drawbridge closes today for {name}', t: 'Drawbridge closing', b: 'This is the day the bridge lifts. Cross it with {amount} for {name} ({tab}) before the day is over.', x: 'Holding the gate, Kutitap' },
  { s: 'Last chance at the quest board: {name}', t: 'Last chance', b: 'Your quest is still posted and the deadline is today, {due}. {amount} for {name} in {tab} is all it takes.', x: 'Tail twitching with hope, Kutitap' },
  { s: 'Your quest scroll is glowing: {name}', t: 'The scroll glows', b: 'When a scroll glows, the deadline has arrived. Today you owe {amount} for {name} ({tab}), and the glow fades once it is paid.', x: 'Magic and meows, Kutitap' },
  { s: 'Kutitap\'s tail is twitching about {name}', t: 'Tail alert', b: 'My tail only twitches like this on due dates. {name} ({tab}) needs {amount} today, {due}, and I want you to win this one.', x: 'Nervous purrs, Kutitap' },
  { s: 'Today is the day, hero: {name}', t: 'Hero, it is time', b: 'Remember the quest from two days ago? It is now. Pay {amount} to {name} in the {tab} guild and claim your glory.', x: 'Proud of you already, Kutitap' },
  { s: 'The village bell tolls for {name}', t: 'The bell tolls', b: 'Dong! The village bell rang because {due} is here. {amount} for {name} ({tab}) is due before sundown.', x: 'Bell ringer Kutitap' },
  { s: 'Checkpoint reached: {name}', t: 'Checkpoint reached', b: 'You made it to the checkpoint. One last step remains: pay {amount} for {name} in {tab}. Then you can save your game with a smile.', x: 'Autosave ready, Kutitap' },
  { s: 'Daily quest: pay {name} today', t: 'Daily quest', b: 'Today\'s quest is short and sweet. Pay {amount} to {name} ({tab}) on {due} and collect your peace of mind as a reward.', x: 'Quest tracker online, Kutitap' },
  { s: 'Time to turn in your quest: {name}', t: 'Turn in your quest', b: 'The quest giver is waiting at the table with the {tab} ledger open. Hand in {amount} for {name} today and move on to bigger adventures.', x: 'Waiting beside you, Kutitap' },
  { s: 'A tavern alarm rang for {name}', t: 'Tavern alarm', b: 'Clang clang! The barkeep says {amount} for {name} ({tab}) is due today, {due}. Set down the mug and take care of it.', x: 'Cheers from the corner booth, Kutitap' },
  { s: 'The treasure chest opens today: {name}', t: 'Chest opens today', b: 'The treasure chest unlocks at the end of this quest. Open it by paying {amount} for {name} in the {tab} guild today.', x: 'Shiny things ahead, Kutitap' },
  { s: 'Express courier at your door for {name}', t: 'Express delivery', b: 'Knock knock! The express courier is here with a very short message: {amount}, {name}, {tab}, today.', x: 'Special delivery, Kutitap' },
  { s: 'The star clock strikes {due} for {name}', t: 'The star clock strikes', b: 'The great star clock just chimed. It is {due}, so {amount} for {name} ({tab}) is officially due.', x: 'Tick tock tail, Kutitap' },
  { s: 'Hero hour has arrived for {name}', t: 'Hero hour', b: 'Every hero has an hour, and today is yours. Settle {amount} for {name} in the {tab} guild and watch the quest log turn green.', x: 'Cape fluttering, Kutitap' },
  { s: 'The final envelope about {name}', t: 'The final envelope', b: 'This is the last envelope in the series. It carries one simple message: {amount} for {name} ({tab}) is due today.', x: 'Last paw print, Kutitap' },
  { s: 'Sunrise decree: {name} is due today', t: 'Sunrise decree', b: 'By the rising sun, it is declared that {amount} shall be paid to {name} in {tab} on this very day, {due}.', x: 'Good morning from your royal cat, Kutitap' },
  { s: 'The guildmaster awaits you about {name}', t: 'The guildmaster awaits', b: 'A chair is pulled out and the ledger is open. The guildmaster of {tab} is ready to receive {amount} for {name} today.', x: 'Escorted by Kutitap' },
  { s: 'A pawprint on today\'s deadline: {name}', t: 'Pawprint on the calendar', b: 'I stamped a pawprint on {due} so nobody could miss it. {amount} for {name} ({tab}) is due today.', x: 'Inky toes, Kutitap' },
  { s: 'Countdown reached zero for {name}', t: 'Countdown complete', b: 'Three, two, one, and we are at zero. {name} in the {tab} guild collects {amount} today, {due}.', x: 'Launching with you, Kutitap' },
  { s: 'Bun Bun taps the counter: {name}', t: 'Tap tap at the counter', b: 'Bun Bun is tapping his little paw on the counter because {amount} for {name} ({tab}) is due today. He promises a smile when it is done.', x: 'Hopping by, Kutitap' },
  { s: 'Victory is one tap away: {name}', t: 'One tap to victory', b: 'You have come so far. Pay {amount} for {name} in {tab} today, tap Paid below, and the quest is yours.', x: 'Victory dance loading, Kutitap' },
];


// 1 day after the due date, still unpaid (red alert). Placeholders: {name} {amount} {tab} {due}
export const OVERDUE = [
  { s: 'Red alert: {name} is 1 day overdue', t: 'Red alert!', b: 'The quest bell rang yesterday and {name} in the {tab} guild is still waiting for {amount}. It was due {due}. One tap below and the alarm goes quiet.', x: 'Sirens off soon, Kutitap' },
  { s: 'The drawbridge is stuck: {name} is overdue', t: 'Drawbridge alert', b: 'The bridge to the {tab} castle stayed up past {due}. Bring {amount} for {name} today and the gears will move again.', x: 'Pushing the lever with you, Kutitap' },
  { s: 'A crimson scroll for {name}', t: 'The crimson scroll', b: 'Crimson wax means the matter cannot wait. {amount} for {name} ({tab}) was due {due} and is now one day late.', x: 'Sealed in red, Kutitap' },
  { s: 'Quest overdue by one day: {name}', t: 'Quest overdue', b: 'Your quest slipped past its deadline of {due}. It is not a disaster yet. Settle {amount} for {name} in {tab} and the quest log turns green again.', x: 'Still on your team, Kutitap' },
  { s: 'The guildmaster is knocking about {name}', t: 'Knock knock', b: 'The {tab} guildmaster stopped by because {name} was due {due}. They would like {amount} when you have a moment, which is now.', x: 'Holding the door, Kutitap' },
  { s: 'Sound the horn: {name} missed yesterday\'s deadline', t: 'Sound the horn', b: 'Tooot! The watchtower noticed that {amount} for {name} ({tab}) is still outstanding after {due}. Fix it and the horn stops.', x: 'Ears ringing, Kutitap' },
  { s: 'A dragon was spotted near {name}', t: 'Dragon sighting', b: 'The dragon of late fees is circling {name} in the {tab} guild. Pay {amount} now, since it was due {due}, and it flies away.', x: 'Sword ready, Kutitap' },
  { s: 'Emergency courier: {name} is still unpaid', t: 'Emergency courier', b: 'This courier rode through the night. The message: {amount} for {name} ({tab}) is one day overdue since {due}.', x: 'Out of breath, Kutitap' },
  { s: 'The lanterns turned red for {name}', t: 'Red lanterns', b: 'When the lanterns glow red, a deadline has passed. {name} in {tab} needed {amount} on {due}, so please take care of it today.', x: 'Carrying the lantern, Kutitap' },
  { s: 'One more chance for {name}', t: 'The extra mile', b: 'The quest giver is still waiting at the door. Pay {amount} for {name} ({tab}), overdue since {due}, and the story continues.', x: 'Cheering you on, Kutitap' },
];

// final installment paid, loan cleared. Placeholders: {name} {tab} {total} {count}
export const BOSS = [
  { s: 'Boss defeated: {name} is cleared!', t: 'Boss defeated!', b: 'The last installment of {name} is paid. You beat all {count} parts in the {tab} guild and cleared {total}. Take a bow, hero.', x: 'Victory dance, Kutitap' },
  { s: 'Victory scroll: {name} is finished', t: 'Victory scroll', b: 'The royal scribe wrote it down: {name} ({tab}) is completely paid. {count} installments, {total} cleared, zero left.', x: 'Confetti everywhere, Kutitap' },
  { s: 'The dragon of {name} has fallen', t: 'The dragon has fallen', b: 'It took {count} brave payments to bring down {name} in the {tab} guild. Total treasure spent: {total}. The land is safe.', x: 'Roaring with joy, Kutitap' },
  { s: 'Quest complete: {name}', t: 'Quest complete!', b: 'Final installment received. {name} in {tab} is officially done after {count} parts, with {total} cleared. Claim your reward.', x: 'Gold stars for you, Kutitap' },
  { s: 'Level up! {name} is behind you', t: 'Level up!', b: 'You gained a level by finishing {name} ({tab}). {count} installments and {total} later, that quest is history.', x: 'Ding ding ding, Kutitap' },
  { s: 'The final gate opens: {name} is paid off', t: 'The final gate opens', b: 'The last gate of {name} swung wide. Through {count} installments you cleared {total} in the {tab} guild. Walk through, champion.', x: 'Trumpets blaring, Kutitap' },
  { s: 'Treasure unlocked: {name} is cleared', t: 'Treasure unlocked', b: 'The chest labelled {name} ({tab}) is finally open and empty of debt. {count} installments, {total} total. Well earned.', x: 'Sparkles for you, Kutitap' },
  { s: 'Hero\'s feast for finishing {name}', t: 'Hero\'s feast', b: 'Set the table! {name} in the {tab} guild is paid in full across {count} installments, {total} cleared. Eat something nice.', x: 'Sharing my fish, Kutitap' },
  { s: 'Banner raised: {name} is done', t: 'Banners up!', b: 'The guild raised a banner in your name. {name} ({tab}) was cleared in {count} steps for {total}, and not one is left.', x: 'Waving a tiny flag, Kutitap' },
  { s: 'Boss down! Great job on {name}', t: 'Boss down!', b: 'Critical hit! The final installment of {name} landed and the boss is gone. {tab} guild, {count} parts, {total} cleared.', x: 'High paw, Kutitap' },
];

const fill = (s, v) => String(s).replace(/\{(name|amount|tab|due|total|count)\}/g, (_, k) => v[k]);
export const render = (tpl, vars) => ({ subject: fill(tpl.s, vars), title: fill(tpl.t, vars), body: fill(tpl.b, vars), sign: fill(tpl.x, vars) });

// rotation: pick a template that has not been used in the current cycle; when all 25 were used start a new cycle
// (never repeating the one used last). `used` is the list of indexes used so far in this cycle.
export function pickTemplate(pool, used, rand = Math.random) {
  let cycle = Array.isArray(used) ? used.filter((i) => Number.isInteger(i) && i >= 0 && i < pool.length) : [];
  let last = cycle.length ? cycle[cycle.length - 1] : -1;
  if (cycle.length >= pool.length) cycle = [];
  const free = pool.map((_, i) => i).filter((i) => !cycle.includes(i) && !(cycle.length === 0 && i === last));
  const idx = free[Math.floor(rand() * free.length)];
  return { index: idx, used: [...cycle, idx] };
}
