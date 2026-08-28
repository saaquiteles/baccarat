/**
 * testSupport.js
 * ---------------------------------------------------------------------------
 * Shared test-only helpers: a small deterministic seeded PRNG (so shuffle /
 * distribution tests are reproducible without touching the CSPRNG) and a
 * fixture-shoe builder for scripting exact card sequences in state-machine
 * and rules tests. Not a *.test.js file, so Vitest never treats it as a
 * suite of its own - it's just imported by the real test files.
 */

/**
 * mulberry32: a tiny, fast, deterministic 32-bit PRNG. Not cryptographically
 * secure - for tests only, never for production shuffling.
 * @param {number} seed
 * @returns {() => number} A RandomUint32Source: returns a uint32 each call.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/**
 * Builds a minimal ShoeState-shaped fixture from an explicit, ordered card
 * list, for tests that need to script exact draws instead of shuffling.
 * @param {import('../../src/game/shoe.js').Card[]} cards
 * @param {Object} [overrides]
 * @returns {import('../../src/game/shoe.js').ShoeState}
 */
export function fixtureShoe(cards, overrides = {}) {
  return {
    cards,
    burned: [],
    position: 0,
    cutCardIndex: cards.length + 1000, // effectively "never" unless overridden
    needsReshuffle: false,
    numDecks: 1,
    cutCardOffset: 0,
    ...overrides,
  };
}
