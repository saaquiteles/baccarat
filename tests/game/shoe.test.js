import { describe, it, expect } from 'vitest';
import {
  RANKS,
  SUITS,
  rankPointValue,
  createCard,
  createSingleDeck,
  createShoeCards,
  randomInt,
  shuffle,
  burnCards,
  computeCutCardIndex,
  initializeShoe,
  drawCard,
  cardsRemaining,
  DEFAULT_CUT_CARD_OFFSET,
} from '../../src/game/shoe.js';
import { mulberry32, fixtureShoe } from './testSupport.js';

describe('rankPointValue', () => {
  it('gives aces a value of 1', () => {
    expect(rankPointValue('A')).toBe(1);
  });

  it('gives 2-9 their face value', () => {
    for (let n = 2; n <= 9; n += 1) {
      expect(rankPointValue(String(n))).toBe(n);
    }
  });

  it('gives 10/J/Q/K a value of 0', () => {
    for (const rank of ['10', 'J', 'Q', 'K']) {
      expect(rankPointValue(rank)).toBe(0);
    }
  });

  it('throws on an invalid rank', () => {
    expect(() => rankPointValue('X')).toThrow();
  });
});

describe('createSingleDeck / createShoeCards', () => {
  it('builds exactly 52 unique rank/suit cards for a single deck', () => {
    const deck = createSingleDeck();
    expect(deck).toHaveLength(52);
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(52);
  });

  it('builds a standard 416-card 8-deck shoe by default', () => {
    const cards = createShoeCards();
    expect(cards).toHaveLength(8 * 52);
  });

  it('builds N decks worth of cards, each id appearing exactly N times', () => {
    const cards = createShoeCards(3);
    expect(cards).toHaveLength(3 * 52);
    const counts = new Map();
    for (const c of cards) counts.set(c.id, (counts.get(c.id) || 0) + 1);
    for (const rank of RANKS) {
      for (const suit of SUITS) {
        expect(counts.get(`${rank}-${suit}`)).toBe(3);
      }
    }
  });

  it('rejects a non-positive deck count', () => {
    expect(() => createShoeCards(0)).toThrow();
    expect(() => createShoeCards(-1)).toThrow();
  });
});

describe('randomInt (no modulo bias)', () => {
  it('returns 0 immediately for maxExclusive=1 without consuming randomness', () => {
    let calls = 0;
    const source = () => {
      calls += 1;
      return 0xdeadbeef;
    };
    expect(randomInt(1, source)).toBe(0);
    expect(calls).toBe(0);
  });

  it('rejects an out-of-range draw and re-samples instead of taking it modulo', () => {
    // For maxExclusive=3, 2^32 % 3 === 1, so the rejection threshold is
    // 2^32 - 1 = 0xFFFFFFFF: exactly that single value must be rejected and
    // re-drawn rather than folded into the result via modulo.
    const sequence = [0xffffffff, 5]; // 5 % 3 === 2
    let calls = 0;
    const source = () => {
      const v = sequence[calls];
      calls += 1;
      return v;
    };
    const result = randomInt(3, source);
    expect(calls).toBe(2); // first draw was rejected, second was used
    expect(result).toBe(2);
  });

  it('never returns a value outside [0, maxExclusive)', () => {
    const rng = mulberry32(1234);
    for (let i = 0; i < 5000; i += 1) {
      const max = 1 + (i % 51); // exercise a range of divisors of 2^32, including non-divisors
      const v = randomInt(max, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(max);
    }
  });

  it('rejects invalid maxExclusive values', () => {
    expect(() => randomInt(0)).toThrow();
    expect(() => randomInt(-5)).toThrow();
    expect(() => randomInt(1.5)).toThrow();
    expect(() => randomInt(2 ** 32 + 1)).toThrow();
  });

  it('is uniformly distributed even when maxExclusive does not divide 2^32 evenly', () => {
    // 3 does not evenly divide 2^32 (2^32 % 3 === 1), which is exactly the
    // case where naive `getUint32() % 3` would be biased toward bucket 0.
    const rng = mulberry32(42);
    const buckets = [0, 0, 0];
    const trials = 90_000;
    for (let i = 0; i < trials; i += 1) {
      buckets[randomInt(3, rng)] += 1;
    }
    const expected = trials / 3;
    for (const count of buckets) {
      // Generous +/-10% band around the expected 1/3 share - a biased
      // implementation (e.g. plain modulo) would skew bucket 0 far outside this.
      expect(count).toBeGreaterThan(expected * 0.9);
      expect(count).toBeLessThan(expected * 1.1);
    }
  });
});

describe('shuffle', () => {
  it('returns a permutation: same length and same multiset of ids', () => {
    const original = createShoeCards(1);
    const shuffled = shuffle(original, mulberry32(7));
    expect(shuffled).toHaveLength(original.length);
    const sortedOriginal = original.map((c) => c.id).sort();
    const sortedShuffled = shuffled.map((c) => c.id).sort();
    expect(sortedShuffled).toEqual(sortedOriginal);
  });

  it('does not mutate the input array', () => {
    const original = createShoeCards(1);
    const snapshot = original.slice();
    shuffle(original, mulberry32(7));
    expect(original).toEqual(snapshot);
  });

  it('is deterministic for a given seeded source', () => {
    const deck = createShoeCards(1);
    const a = shuffle(deck, mulberry32(99));
    const b = shuffle(deck, mulberry32(99));
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('actually reorders the deck (overwhelmingly likely for a real shuffle)', () => {
    const deck = createShoeCards(1);
    const shuffled = shuffle(deck, mulberry32(2024));
    expect(shuffled.map((c) => c.id)).not.toEqual(deck.map((c) => c.id));
  });
});

describe('burnCards', () => {
  it('burns indicator + its point value for a non-10-value indicator', () => {
    const indicator = createCard('5', 'S');
    const rest = createSingleDeck().filter((c) => c.id !== indicator.id);
    const shuffled = [indicator, ...rest];
    const { burned, remaining } = burnCards(shuffled);
    expect(burned).toHaveLength(1 + 5); // 1 indicator + 5 additional
    expect(remaining).toHaveLength(shuffled.length - 6);
    expect(burned[0]).toEqual(indicator);
  });

  it('burns 10 total when the indicator is a 10-value card (10/J/Q/K)', () => {
    const indicator = createCard('K', 'H');
    const rest = createSingleDeck().filter((c) => c.id !== indicator.id);
    const shuffled = [indicator, ...rest];
    const { burned, remaining } = burnCards(shuffled);
    expect(burned).toHaveLength(10); // 1 indicator + 9 additional
    expect(remaining).toHaveLength(shuffled.length - 10);
  });

  it('burns 2 total for an Ace indicator (value 1)', () => {
    const indicator = createCard('A', 'D');
    const rest = createSingleDeck().filter((c) => c.id !== indicator.id);
    const shuffled = [indicator, ...rest];
    const { burned } = burnCards(shuffled);
    expect(burned).toHaveLength(2);
  });

  it('throws on an empty shoe', () => {
    expect(() => burnCards([])).toThrow();
  });
});

describe('computeCutCardIndex', () => {
  it('places the cut card offsetFromEnd cards from the end by default', () => {
    expect(computeCutCardIndex(100)).toBe(100 - DEFAULT_CUT_CARD_OFFSET);
  });

  it('honors a custom offset', () => {
    expect(computeCutCardIndex(100, 20)).toBe(80);
  });

  it('never returns a negative index', () => {
    expect(computeCutCardIndex(5, 20)).toBe(0);
  });
});

describe('initializeShoe', () => {
  it('produces a full 8-deck shoe minus the burn, with position 0 and no reshuffle flag yet', () => {
    const shoe = initializeShoe({ getUint32: mulberry32(1) });
    expect(shoe.numDecks).toBe(8);
    expect(shoe.position).toBe(0);
    expect(shoe.cards.length + shoe.burned.length).toBe(8 * 52);
    expect(shoe.needsReshuffle).toBe(false);
    expect(shoe.cutCardIndex).toBe(computeCutCardIndex(shoe.cards.length, DEFAULT_CUT_CARD_OFFSET));
  });

  it('is deterministic given the same seeded source', () => {
    const a = initializeShoe({ getUint32: mulberry32(555) });
    const b = initializeShoe({ getUint32: mulberry32(555) });
    expect(a.cards.map((c) => c.id)).toEqual(b.cards.map((c) => c.id));
    expect(a.burned.map((c) => c.id)).toEqual(b.burned.map((c) => c.id));
  });

  it('respects a custom deck count and cut card offset', () => {
    const shoe = initializeShoe({ numDecks: 2, getUint32: mulberry32(2), cutCardOffset: 10 });
    expect(shoe.numDecks).toBe(2);
    expect(shoe.cutCardOffset).toBe(10);
    expect(shoe.cutCardIndex).toBe(shoe.cards.length - 10);
  });
});

describe('drawCard', () => {
  it('deals cards off the top in order and advances position, without mutating the input', () => {
    const cards = createSingleDeck().slice(0, 5);
    const shoe0 = fixtureShoe(cards);
    const { card: c1, shoe: shoe1 } = drawCard(shoe0);
    expect(c1).toEqual(cards[0]);
    expect(shoe1.position).toBe(1);
    expect(shoe0.position).toBe(0); // original untouched

    const { card: c2, shoe: shoe2 } = drawCard(shoe1);
    expect(c2).toEqual(cards[1]);
    expect(shoe2.position).toBe(2);
  });

  it('flags needsReshuffle once position reaches the cut card', () => {
    const cards = createSingleDeck().slice(0, 5);
    let shoe = fixtureShoe(cards, { cutCardIndex: 2 });
    expect(shoe.needsReshuffle).toBe(false);

    ({ shoe } = drawCard(shoe)); // position 1
    expect(shoe.needsReshuffle).toBe(false);

    ({ shoe } = drawCard(shoe)); // position 2 === cutCardIndex
    expect(shoe.needsReshuffle).toBe(true);
  });

  it('throws once the shoe is fully exhausted', () => {
    const cards = createSingleDeck().slice(0, 1);
    let shoe = fixtureShoe(cards);
    ({ shoe } = drawCard(shoe));
    expect(cardsRemaining(shoe)).toBe(0);
    expect(() => drawCard(shoe)).toThrow();
  });
});
