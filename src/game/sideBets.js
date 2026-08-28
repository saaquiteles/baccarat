/**
 * sideBets.js
 * ---------------------------------------------------------------------------
 * Independent side-bet evaluators: Player Pair, Banker Pair, Perfect Pair,
 * Dragon 7, and Panda 8. Each is evaluated purely from the dealt hands and
 * is completely independent of the main (Player/Banker/Tie) bet outcome and
 * of which payout ruleset (commission vs no-commission) is active - side
 * bets never carry commission.
 */

/**
 * @typedef {import('./shoe.js').Card} Card
 * @typedef {import('./rules.js').Outcome} Outcome
 */

/**
 * @typedef {Object} DealtHand
 * @property {Card[]} playerCards - Player's final cards (2 or 3).
 * @property {Card[]} bankerCards - Banker's final cards (2 or 3).
 * @property {Outcome} winner
 */

/**
 * @typedef {Object} SideBetEvaluation
 * @property {boolean} won
 * @property {number} odds - Payout odds ("X to 1") that apply if `won` is
 *   true; 0 when `won` is false. Kept per-evaluation (rather than a single
 *   fixed constant on the bet definition) because Perfect Pair pays a
 *   different multiplier for a same-suit "perfect" pair vs. a mixed-suit pair.
 */

/**
 * @typedef {Object} SideBetDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {(hand: DealtHand) => SideBetEvaluation} evaluate
 */

/** Returns just the first two (initially dealt) cards of a hand. Pairs are
 * always judged on the initial deal, never on a drawn third card.
 * @param {Card[]} cards
 * @returns {[Card, Card]}
 */
function initialTwoCards(cards) {
  return [cards[0], cards[1]];
}

/** @param {[Card, Card]} pair */
function isSameRank([a, b]) {
  return a.rank === b.rank;
}

/** @param {[Card, Card]} pair */
function isSameSuit([a, b]) {
  return a.suit === b.suit;
}

// ---------------------------------------------------------------------------
// Player Pair - Player's first two cards share a rank. Standard odds 11:1.
// ---------------------------------------------------------------------------
export const PLAYER_PAIR_ODDS = 11;

/** @type {SideBetDefinition} */
export const PLAYER_PAIR = Object.freeze({
  id: 'player-pair',
  name: 'Player Pair',
  description: "Player's first two cards are the same rank. Pays 11:1.",
  evaluate(hand) {
    const won = isSameRank(initialTwoCards(hand.playerCards));
    return { won, odds: won ? PLAYER_PAIR_ODDS : 0 };
  },
});

// ---------------------------------------------------------------------------
// Banker Pair - Banker's first two cards share a rank. Standard odds 11:1.
// ---------------------------------------------------------------------------
export const BANKER_PAIR_ODDS = 11;

/** @type {SideBetDefinition} */
export const BANKER_PAIR = Object.freeze({
  id: 'banker-pair',
  name: 'Banker Pair',
  description: "Banker's first two cards are the same rank. Pays 11:1.",
  evaluate(hand) {
    const won = isSameRank(initialTwoCards(hand.bankerCards));
    return { won, odds: won ? BANKER_PAIR_ODDS : 0 };
  },
});

// ---------------------------------------------------------------------------
// Perfect Pair - either the Player's or the Banker's first two cards form a
// pair. A same-rank-and-suit ("perfect") pair pays 25:1; a same-rank,
// different-suit pair pays 5:1.
// ---------------------------------------------------------------------------
export const PERFECT_PAIR_ODDS = 25;
export const MIXED_PAIR_ODDS = 5;

/** @type {SideBetDefinition} */
export const PERFECT_PAIR = Object.freeze({
  id: 'perfect-pair',
  name: 'Perfect Pair',
  description:
    "Player's or Banker's first two cards are a pair. Same rank & suit (perfect) pays 25:1; " +
    'same rank, different suit pays 5:1.',
  evaluate(hand) {
    const playerPair = initialTwoCards(hand.playerCards);
    const bankerPair = initialTwoCards(hand.bankerCards);

    const perfect = isSameRank(playerPair) && isSameSuit(playerPair)
      || (isSameRank(bankerPair) && isSameSuit(bankerPair));
    if (perfect) {
      return { won: true, odds: PERFECT_PAIR_ODDS };
    }

    const mixed = isSameRank(playerPair) || isSameRank(bankerPair);
    if (mixed) {
      return { won: true, odds: MIXED_PAIR_ODDS };
    }

    return { won: false, odds: 0 };
  },
});

// ---------------------------------------------------------------------------
// Dragon 7 - Banker wins with a 3-card total of exactly 7. Standard odds 40:1.
// ---------------------------------------------------------------------------
export const DRAGON_7_ODDS = 40;

/** @type {SideBetDefinition} */
export const DRAGON_7 = Object.freeze({
  id: 'dragon-7',
  name: 'Dragon 7',
  description: 'Banker wins with a three-card total of 7. Pays 40:1.',
  evaluate(hand) {
    const won =
      hand.winner === 'BANKER' && hand.bankerCards.length === 3 && handTotalOf(hand.bankerCards) === 7;
    return { won, odds: won ? DRAGON_7_ODDS : 0 };
  },
});

// ---------------------------------------------------------------------------
// Panda 8 - Player wins with a 3-card total of exactly 8. Standard odds 25:1.
// ---------------------------------------------------------------------------
export const PANDA_8_ODDS = 25;

/** @type {SideBetDefinition} */
export const PANDA_8 = Object.freeze({
  id: 'panda-8',
  name: 'Panda 8',
  description: 'Player wins with a three-card total of 8. Pays 25:1.',
  evaluate(hand) {
    const won =
      hand.winner === 'PLAYER' && hand.playerCards.length === 3 && handTotalOf(hand.playerCards) === 8;
    return { won, odds: won ? PANDA_8_ODDS : 0 };
  },
});

/**
 * Local mod-10 total helper so this module doesn't need to import rules.js
 * just for one function (keeps side-bet evaluation independently testable
 * off raw card arrays).
 * @param {Card[]} cards
 * @returns {number}
 */
function handTotalOf(cards) {
  return cards.reduce((acc, c) => acc + c.value, 0) % 10;
}

/** All five standard side bets, in a stable order, keyed by id. */
export const SIDE_BETS = Object.freeze({
  [PLAYER_PAIR.id]: PLAYER_PAIR,
  [BANKER_PAIR.id]: BANKER_PAIR,
  [PERFECT_PAIR.id]: PERFECT_PAIR,
  [DRAGON_7.id]: DRAGON_7,
  [PANDA_8.id]: PANDA_8,
});

/**
 * @typedef {Object} SideBetResult
 * @property {string} betType - The side bet's id.
 * @property {number} betAmount
 * @property {boolean} won
 * @property {number} odds
 * @property {number} netWinnings - 0 if lost.
 * @property {number} totalReturned - stake + netWinnings if won, 0 if lost.
 */

/**
 * Resolves a single side-bet wager against a dealt hand. Side bets carry no
 * commission and are entirely independent of the main bet / payout ruleset.
 *
 * @param {SideBetDefinition} sideBet
 * @param {number} betAmount - Must be > 0.
 * @param {DealtHand} hand
 * @returns {SideBetResult}
 */
export function resolveSideBet(sideBet, betAmount, hand) {
  if (!(betAmount > 0)) {
    throw new Error('betAmount must be greater than 0');
  }
  const { won, odds } = sideBet.evaluate(hand);
  const netWinnings = won ? betAmount * odds : 0;
  return Object.freeze({
    betType: sideBet.id,
    betAmount,
    won,
    odds,
    netWinnings,
    totalReturned: won ? betAmount + netWinnings : 0,
  });
}
