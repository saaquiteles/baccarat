/**
 * shoe.js
 * ---------------------------------------------------------------------------
 * Deterministic, headless shoe management for Punto Banco baccarat:
 * card/deck construction, an unbiased Fisher-Yates shuffle, the casino
 * burn-card procedure, and cut-card placement / reshuffle signalling.
 *
 * No rendering, DOM, or 3D-library imports live here or anywhere under
 * src/game/. Everything is plain, framework-agnostic JavaScript so it can be
 * required from a headless Node script (e.g. a QA agent simulating hundreds
 * of thousands of hands) with no browser involved.
 *
 * Randomness is always *injected*. Production code should pass
 * {@link defaultRandomUint32} (backed by a CSPRNG); tests pass a seeded,
 * fully deterministic generator so results are reproducible.
 */

/** @type {ReadonlyArray<string>} */
export const RANKS = Object.freeze([
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
]);

/** @type {ReadonlyArray<string>} */
export const SUITS = Object.freeze(['S', 'H', 'D', 'C']); // Spades, Hearts, Diamonds, Clubs

/**
 * @typedef {Object} Card
 * @property {string} rank - One of RANKS ('A'..'K').
 * @property {string} suit - One of SUITS ('S'|'H'|'D'|'C').
 * @property {number} value - Baccarat point value of the card (0-9).
 * @property {string} id - Stable identifier, e.g. "A-S", "10-H". Two identical
 *   physical cards from different decks in the shoe share the same id; that
 *   is intentional (baccarat pair/side-bet logic only cares about rank/suit).
 */

/**
 * Baccarat point value for a given rank: A=1, 2-9=face value, 10/J/Q/K=0.
 * @param {string} rank
 * @returns {number}
 */
export function rankPointValue(rank) {
  if (rank === 'A') return 1;
  if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return 0;
  const n = Number(rank);
  if (!Number.isInteger(n) || n < 2 || n > 9) {
    throw new Error(`Invalid rank: ${rank}`);
  }
  return n;
}

/**
 * @param {string} rank
 * @param {string} suit
 * @returns {Card}
 */
export function createCard(rank, suit) {
  return Object.freeze({
    rank,
    suit,
    value: rankPointValue(rank),
    id: `${rank}-${suit}`,
  });
}

/**
 * Builds one standard 52-card deck in a fixed, deterministic order
 * (unshuffled). Order is suit-major, rank-minor.
 * @returns {Card[]}
 */
export function createSingleDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

/**
 * Builds an ordered (unshuffled) N-deck shoe by concatenating single decks.
 * Standard Punto Banco uses 8 decks (416 cards).
 * @param {number} [numDecks=8]
 * @returns {Card[]}
 */
export function createShoeCards(numDecks = 8) {
  if (!Number.isInteger(numDecks) || numDecks <= 0) {
    throw new Error('numDecks must be a positive integer');
  }
  const cards = [];
  for (let i = 0; i < numDecks; i += 1) {
    cards.push(...createSingleDeck());
  }
  return cards;
}

// ---------------------------------------------------------------------------
// Randomness: CSPRNG source + unbiased integer sampling
// ---------------------------------------------------------------------------

/**
 * A source of randomness used throughout this module: a zero-argument
 * function returning a uniformly-distributed unsigned 32-bit integer
 * (0 .. 0xFFFFFFFF inclusive) per call.
 * @typedef {() => number} RandomUint32Source
 */

/**
 * Production RNG: draws a single uint32 from the platform CSPRNG
 * (Web Crypto `getRandomValues`, available on both `window.crypto` in
 * browsers and the Node.js global `crypto` since Node 19+). Never use
 * Math.random() for anything shoe-related.
 * @type {RandomUint32Source}
 */
export function defaultRandomUint32() {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error(
      'No CSPRNG available (globalThis.crypto.getRandomValues is missing). ' +
        'Pass an explicit getUint32 source (e.g. in tests) instead.'
    );
  }
  const buf = new Uint32Array(1);
  cryptoObj.getRandomValues(buf);
  return buf[0];
}

const UINT32_RANGE = 0x100000000; // 2^32

/**
 * Returns a uniformly-distributed random integer in [0, maxExclusive) with
 * NO modulo bias, using rejection sampling: values from the top of the
 * uint32 range that would make `x % maxExclusive` land unevenly are
 * discarded and re-drawn, so every remainder 0..maxExclusive-1 is equally
 * likely regardless of whether maxExclusive divides 2^32 evenly.
 *
 * @param {number} maxExclusive - Exclusive upper bound, must be a positive integer <= 2^32.
 * @param {RandomUint32Source} [getUint32]
 * @returns {number}
 */
export function randomInt(maxExclusive, getUint32 = defaultRandomUint32) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
    throw new Error('maxExclusive must be a positive integer no greater than 2^32');
  }
  if (maxExclusive === 1) return 0;

  // Largest multiple of maxExclusive that is <= 2^32. Draws >= this value
  // are rejected because they would be over-represented in the low buckets.
  const rejectionThreshold = UINT32_RANGE - (UINT32_RANGE % maxExclusive);

  let x = getUint32() >>> 0;
  while (x >= rejectionThreshold) {
    x = getUint32() >>> 0;
  }
  return x % maxExclusive;
}

/**
 * Shuffles an array using the Fisher-Yates (Knuth) algorithm, drawing swap
 * indices via {@link randomInt} so the result is free of modulo bias.
 * Pure: returns a new array, does not mutate the input.
 *
 * @template T
 * @param {T[]} items
 * @param {RandomUint32Source} [getUint32]
 * @returns {T[]}
 */
export function shuffle(items, getUint32 = defaultRandomUint32) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1, getUint32);
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Burn procedure
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} BurnResult
 * @property {Card[]} burned - Cards removed from play by the burn procedure,
 *   in the order they were burned. burned[0] is the exposed "indicator" card.
 * @property {Card[]} remaining - The rest of the shoe, still in shuffled order.
 */

/**
 * Standard casino burn procedure: the first card is turned face up (the
 * "indicator") and burned, then additional cards are burned equal to that
 * indicator card's baccarat point value, with a 10-point indicator (value 0)
 * conventionally burning 10 total. So the total burned is:
 *   - indicator value 1-9  => burn 1 (indicator) + value additional cards
 *   - indicator value 0 (10/J/Q/K) => burn 1 (indicator) + 9 additional (10 total)
 *
 * @param {Card[]} shuffledCards - Already-shuffled shoe.
 * @returns {BurnResult}
 */
export function burnCards(shuffledCards) {
  if (shuffledCards.length === 0) {
    throw new Error('Cannot burn from an empty shoe');
  }
  const indicator = shuffledCards[0];
  const additional = indicator.value === 0 ? 9 : indicator.value;
  const totalBurned = 1 + additional;
  if (totalBurned > shuffledCards.length) {
    throw new Error('Shoe too small to complete the burn procedure');
  }
  return {
    burned: shuffledCards.slice(0, totalBurned),
    remaining: shuffledCards.slice(totalBurned),
  };
}

// ---------------------------------------------------------------------------
// Cut card
// ---------------------------------------------------------------------------

/**
 * Default number of cards left undealt behind the cut card. Real casinos
 * typically place the cut card so that roughly the last 14-20 cards of an
 * 8-deck shoe are never dealt; 14 is a common house default and is what we
 * use unless the caller overrides it.
 */
export const DEFAULT_CUT_CARD_OFFSET = 14;

/**
 * Computes the zero-based index into the post-burn card list at which the
 * cut card sits. Once the shoe's deal position reaches this index, the
 * current hand is finished as normal, but the shoe is flagged so the caller
 * reshuffles before the *next* hand begins (a fresh shoe is never cut mid-hand).
 *
 * @param {number} remainingCount - Number of cards available after the burn.
 * @param {number} [offsetFromEnd=DEFAULT_CUT_CARD_OFFSET]
 * @returns {number}
 */
export function computeCutCardIndex(remainingCount, offsetFromEnd = DEFAULT_CUT_CARD_OFFSET) {
  if (!Number.isInteger(remainingCount) || remainingCount < 0) {
    throw new Error('remainingCount must be a non-negative integer');
  }
  if (!Number.isInteger(offsetFromEnd) || offsetFromEnd < 0) {
    throw new Error('offsetFromEnd must be a non-negative integer');
  }
  return Math.max(0, remainingCount - offsetFromEnd);
}

// ---------------------------------------------------------------------------
// Shoe state (immutable snapshots)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ShoeState
 * @property {Card[]} cards - Full post-burn, shuffled card list (dealing order).
 * @property {Card[]} burned - Cards removed by the burn procedure.
 * @property {number} position - Index of the next card to be dealt.
 * @property {number} cutCardIndex - Index at which the cut card sits.
 * @property {boolean} needsReshuffle - True once `position` has reached the
 *   cut card (or the shoe has literally run out of cards). The caller should
 *   finish the in-progress hand, then build a brand new shoe before the next
 *   one via {@link initializeShoe} again.
 * @property {number} numDecks
 * @property {number} cutCardOffset
 */

/**
 * @typedef {Object} InitializeShoeOptions
 * @property {number} [numDecks=8]
 * @property {RandomUint32Source} [getUint32] - Defaults to the CSPRNG.
 * @property {number} [cutCardOffset=DEFAULT_CUT_CARD_OFFSET]
 */

/**
 * Builds a brand new shoe: creates N decks, shuffles them, burns cards per
 * the standard procedure, and places the cut card. Pure function: takes the
 * randomness source as a parameter.
 *
 * @param {InitializeShoeOptions} [options]
 * @returns {ShoeState}
 */
export function initializeShoe(options = {}) {
  const {
    numDecks = 8,
    getUint32 = defaultRandomUint32,
    cutCardOffset = DEFAULT_CUT_CARD_OFFSET,
  } = options;

  const ordered = createShoeCards(numDecks);
  const shuffled = shuffle(ordered, getUint32);
  const { burned, remaining } = burnCards(shuffled);
  const cutCardIndex = computeCutCardIndex(remaining.length, cutCardOffset);

  return Object.freeze({
    cards: remaining,
    burned,
    position: 0,
    cutCardIndex,
    needsReshuffle: cutCardIndex <= 0,
    numDecks,
    cutCardOffset,
  });
}

/**
 * @typedef {Object} DrawResult
 * @property {Card} card - The card dealt.
 * @property {ShoeState} shoe - The new shoe state (input is left untouched).
 */

/**
 * Deals the next card off the top of the shoe. Pure/immutable: the input
 * ShoeState is never mutated, a new one is returned.
 *
 * @param {ShoeState} shoe
 * @returns {DrawResult}
 */
export function drawCard(shoe) {
  if (shoe.position >= shoe.cards.length) {
    throw new Error('Shoe is empty; initializeShoe() must be called to reshuffle');
  }
  const card = shoe.cards[shoe.position];
  const position = shoe.position + 1;
  const needsReshuffle = shoe.needsReshuffle || position >= shoe.cutCardIndex;
  return {
    card,
    shoe: Object.freeze({ ...shoe, position, needsReshuffle }),
  };
}

/**
 * Cards left available to deal before the shoe is physically exhausted
 * (not to be confused with `needsReshuffle`, which trips earlier at the cut card).
 * @param {ShoeState} shoe
 * @returns {number}
 */
export function cardsRemaining(shoe) {
  return shoe.cards.length - shoe.position;
}
