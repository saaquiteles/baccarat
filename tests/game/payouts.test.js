import { describe, it, expect } from 'vitest';
import {
  MAIN_BET_TYPES,
  STANDARD_COMMISSION_RULESET,
  NO_COMMISSION_RULESET,
  resolveMainBet,
} from '../../src/game/payouts.js';

describe('resolveMainBet - PLAYER bet (identical under both rulesets)', () => {
  for (const ruleset of [STANDARD_COMMISSION_RULESET, NO_COMMISSION_RULESET]) {
    describe(ruleset.id, () => {
      it('pays even money on a Player win', () => {
        const r = resolveMainBet(ruleset, { betType: 'PLAYER', betAmount: 100, winner: 'PLAYER', bankerTotal: 3 });
        expect(r.won).toBe(true);
        expect(r.pushed).toBe(false);
        expect(r.commission).toBe(0);
        expect(r.netWinnings).toBe(100);
        expect(r.totalReturned).toBe(200);
      });

      it('pushes (stake returned) on a tie', () => {
        const r = resolveMainBet(ruleset, { betType: 'PLAYER', betAmount: 100, winner: 'TIE', bankerTotal: 3 });
        expect(r.won).toBe(false);
        expect(r.pushed).toBe(true);
        expect(r.totalReturned).toBe(100);
      });

      it('loses on a Banker win', () => {
        const r = resolveMainBet(ruleset, { betType: 'PLAYER', betAmount: 100, winner: 'BANKER', bankerTotal: 5 });
        expect(r.won).toBe(false);
        expect(r.pushed).toBe(false);
        expect(r.totalReturned).toBe(0);
      });
    });
  }
});

describe('resolveMainBet - TIE bet (identical under both rulesets)', () => {
  for (const ruleset of [STANDARD_COMMISSION_RULESET, NO_COMMISSION_RULESET]) {
    describe(ruleset.id, () => {
      it(`pays ${ruleset.tieOdds}:1 on a tie`, () => {
        const r = resolveMainBet(ruleset, { betType: 'TIE', betAmount: 10, winner: 'TIE', bankerTotal: 4 });
        expect(r.won).toBe(true);
        expect(r.netWinnings).toBe(10 * ruleset.tieOdds);
        expect(r.totalReturned).toBe(10 + 10 * ruleset.tieOdds);
      });

      it('loses (no push) when Player or Banker wins', () => {
        for (const winner of ['PLAYER', 'BANKER']) {
          const r = resolveMainBet(ruleset, { betType: 'TIE', betAmount: 10, winner, bankerTotal: 4 });
          expect(r.won).toBe(false);
          expect(r.pushed).toBe(false);
          expect(r.totalReturned).toBe(0);
        }
      });
    });
  }
});

describe('resolveMainBet - BANKER bet, standard 5% commission ruleset', () => {
  it('pays 1:1 minus 5% commission, regardless of the winning total', () => {
    for (const bankerTotal of [2, 5, 6, 7]) {
      const r = resolveMainBet(STANDARD_COMMISSION_RULESET, {
        betType: 'BANKER',
        betAmount: 100,
        winner: 'BANKER',
        bankerTotal,
      });
      expect(r.won).toBe(true);
      expect(r.winningsBeforeCommission).toBe(100);
      expect(r.commission).toBe(5);
      expect(r.netWinnings).toBe(95);
      expect(r.totalReturned).toBe(195);
    }
  });

  it('rounds commission to the cent to avoid floating point crumbs', () => {
    const r = resolveMainBet(STANDARD_COMMISSION_RULESET, {
      betType: 'BANKER',
      betAmount: 33,
      winner: 'BANKER',
      bankerTotal: 4,
    });
    expect(r.commission).toBe(1.65);
    expect(r.netWinnings).toBe(31.35);
  });

  it('pushes on a tie, loses to a Player win', () => {
    const push = resolveMainBet(STANDARD_COMMISSION_RULESET, {
      betType: 'BANKER',
      betAmount: 50,
      winner: 'TIE',
      bankerTotal: 4,
    });
    expect(push.pushed).toBe(true);
    expect(push.totalReturned).toBe(50);

    const loss = resolveMainBet(STANDARD_COMMISSION_RULESET, {
      betType: 'BANKER',
      betAmount: 50,
      winner: 'PLAYER',
      bankerTotal: 4,
    });
    expect(loss.won).toBe(false);
    expect(loss.totalReturned).toBe(0);
  });
});

describe('resolveMainBet - BANKER bet, no-commission ruleset', () => {
  it('pays full 1:1 when the winning Banker total is not 6', () => {
    for (const bankerTotal of [2, 3, 4, 5, 7, 8, 9]) {
      const r = resolveMainBet(NO_COMMISSION_RULESET, {
        betType: 'BANKER',
        betAmount: 100,
        winner: 'BANKER',
        bankerTotal,
      });
      expect(r.commission).toBe(0);
      expect(r.netWinnings).toBe(100);
      expect(r.totalReturned).toBe(200);
    }
  });

  it('pays only 1:2 when the winning Banker total is exactly 6', () => {
    const r = resolveMainBet(NO_COMMISSION_RULESET, {
      betType: 'BANKER',
      betAmount: 100,
      winner: 'BANKER',
      bankerTotal: 6,
    });
    expect(r.commission).toBe(0);
    expect(r.netWinnings).toBe(50);
    expect(r.totalReturned).toBe(150);
  });
});

describe('resolveMainBet - validation', () => {
  it('rejects an unknown bet type', () => {
    expect(() =>
      resolveMainBet(STANDARD_COMMISSION_RULESET, { betType: 'NOPE', betAmount: 10, winner: 'PLAYER' })
    ).toThrow();
  });

  it('rejects a non-positive bet amount', () => {
    expect(() =>
      resolveMainBet(STANDARD_COMMISSION_RULESET, {
        betType: MAIN_BET_TYPES.PLAYER,
        betAmount: 0,
        winner: 'PLAYER',
      })
    ).toThrow();
  });
});
