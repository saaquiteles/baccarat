import { describe, it, expect } from 'vitest';
import { initializeShoe } from '../../src/game/shoe.js';
import {
  STANDARD_COMMISSION_RULESET,
  NO_COMMISSION_RULESET,
} from '../../src/game/payouts.js';
import { playHandGenerator } from '../../src/game/stateMachine.js';
import { mulberry32 } from './testSupport.js';

/**
 * houseEdge.test.js
 * ---------------------------------------------------------------------------
 * Statistical verification (not just unit-test correctness) that the actual
 * payout math in payouts.js produces the known theoretical house edge for
 * real 8-deck Punto Banco, for BOTH payout rulesets this game supports:
 *   - Standard 5% commission: Player edge ~1.2351%, Banker edge ~1.0579%
 *     (both computed from the standard 8-deck outcome distribution).
 *   - No-commission (Banker-6 pays 1:2): Banker edge ~1.4578% instead.
 *   - Tie (8:1, both rulesets): edge ~14.36%.
 *
 * Uses a seeded, deterministic PRNG (not the CSPRNG) so this test is fully
 * reproducible and never flaky - the seed and N below were chosen so the
 * 95%-CI half-width for every bet is comfortably inside the asserted bands.
 * Re-running the Monte Carlo with a different seed or larger N (see the
 * scratchpad qa script) should always land in the same bands; if it doesn't,
 * that's a real regression in payouts.js/stateMachine.js, not test flakiness.
 */
function simulateBetEdge(ruleset, betType, seed, n) {
  const rng = mulberry32(seed);
  let shoe = initializeShoe({ getUint32: rng });
  let netSum = 0;

  for (let i = 0; i < n; i += 1) {
    if (shoe.needsReshuffle) {
      shoe = initializeShoe({ getUint32: rng });
    }
    const generator = playHandGenerator(
      shoe,
      { mainBets: [{ betType, amount: 1 }] },
      ruleset
    );
    let step = generator.next();
    let payoutPayload = null;
    while (!step.done) {
      if (step.value.type === 'PAYOUT') payoutPayload = step.value.payload;
      step = generator.next();
    }
    shoe = step.value;
    const bet = payoutPayload.mainBets[0];
    netSum += bet.totalReturned - bet.betAmount;
  }

  return { houseEdgePct: (-netSum / n) * 100 };
}

describe('house edge - standard 5% commission ruleset', () => {
  const N = 60_000;
  const SEED = 20260901;

  it('Player bet edge is within a generous, non-flaky band of the theoretical ~1.235%', () => {
    const { houseEdgePct } = simulateBetEdge(STANDARD_COMMISSION_RULESET, 'PLAYER', SEED, N);
    expect(houseEdgePct).toBeGreaterThan(-0.5);
    expect(houseEdgePct).toBeLessThan(3.0);
  });

  it('Banker bet edge is within a generous, non-flaky band of the theoretical ~1.058%', () => {
    const { houseEdgePct } = simulateBetEdge(STANDARD_COMMISSION_RULESET, 'BANKER', SEED, N);
    expect(houseEdgePct).toBeGreaterThan(-0.5);
    expect(houseEdgePct).toBeLessThan(2.8);
  });

  it('Tie bet edge is within a generous, non-flaky band of the theoretical ~14.36%', () => {
    const { houseEdgePct } = simulateBetEdge(STANDARD_COMMISSION_RULESET, 'TIE', SEED, N);
    expect(houseEdgePct).toBeGreaterThan(9.0);
    expect(houseEdgePct).toBeLessThan(19.5);
  });
});

describe('house edge - no-commission ruleset (Banker-6 pays 1:2)', () => {
  const N = 60_000;
  const SEED = 20260902;

  it('Banker bet edge is within a generous, non-flaky band of the theoretical ~1.458%', () => {
    const { houseEdgePct } = simulateBetEdge(NO_COMMISSION_RULESET, 'BANKER', SEED, N);
    expect(houseEdgePct).toBeGreaterThan(-0.3);
    expect(houseEdgePct).toBeLessThan(3.2);
  });

  it('Player bet edge is unaffected by the ruleset choice (~1.235% theoretical)', () => {
    const { houseEdgePct } = simulateBetEdge(NO_COMMISSION_RULESET, 'PLAYER', SEED, N);
    expect(houseEdgePct).toBeGreaterThan(-0.5);
    expect(houseEdgePct).toBeLessThan(3.0);
  });
});
