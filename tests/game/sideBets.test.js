import { describe, it, expect } from 'vitest';
import { createCard } from '../../src/game/shoe.js';
import {
  PLAYER_PAIR,
  BANKER_PAIR,
  PERFECT_PAIR,
  DRAGON_7,
  PANDA_8,
  PLAYER_PAIR_ODDS,
  BANKER_PAIR_ODDS,
  PERFECT_PAIR_ODDS,
  MIXED_PAIR_ODDS,
  DRAGON_7_ODDS,
  PANDA_8_ODDS,
  resolveSideBet,
} from '../../src/game/sideBets.js';

function card(rank, suit) {
  return createCard(rank, suit);
}

describe('PLAYER_PAIR', () => {
  it('wins when the first two player cards share a rank (any suits)', () => {
    const hand = { playerCards: [card('7', 'S'), card('7', 'H')], bankerCards: [card('2', 'S'), card('3', 'H')], winner: 'PLAYER' };
    expect(PLAYER_PAIR.evaluate(hand)).toEqual({ won: true, odds: PLAYER_PAIR_ODDS });
  });

  it('loses when the first two player cards differ in rank', () => {
    const hand = { playerCards: [card('7', 'S'), card('8', 'H')], bankerCards: [card('2', 'S'), card('3', 'H')], winner: 'PLAYER' };
    expect(PLAYER_PAIR.evaluate(hand)).toEqual({ won: false, odds: 0 });
  });

  it('ignores a third player card when judging the pair', () => {
    const hand = {
      playerCards: [card('7', 'S'), card('7', 'H'), card('2', 'D')],
      bankerCards: [card('2', 'S'), card('3', 'H')],
      winner: 'PLAYER',
    };
    expect(PLAYER_PAIR.evaluate(hand).won).toBe(true);
  });
});

describe('BANKER_PAIR', () => {
  it('wins when the first two banker cards share a rank', () => {
    const hand = { playerCards: [card('2', 'S'), card('3', 'H')], bankerCards: [card('K', 'S'), card('K', 'D')], winner: 'BANKER' };
    expect(BANKER_PAIR.evaluate(hand)).toEqual({ won: true, odds: BANKER_PAIR_ODDS });
  });

  it('loses otherwise', () => {
    const hand = { playerCards: [card('2', 'S'), card('3', 'H')], bankerCards: [card('K', 'S'), card('Q', 'D')], winner: 'BANKER' };
    expect(BANKER_PAIR.evaluate(hand)).toEqual({ won: false, odds: 0 });
  });
});

describe('PERFECT_PAIR', () => {
  it('pays perfect-pair odds when either hand has a same-rank, same-suit pair', () => {
    const hand = { playerCards: [card('7', 'S'), card('7', 'S')], bankerCards: [card('2', 'S'), card('3', 'H')], winner: 'PLAYER' };
    expect(PERFECT_PAIR.evaluate(hand)).toEqual({ won: true, odds: PERFECT_PAIR_ODDS });
  });

  it('pays mixed-pair odds when a pair exists but suits differ', () => {
    const hand = { playerCards: [card('7', 'S'), card('7', 'H')], bankerCards: [card('2', 'S'), card('3', 'H')], winner: 'PLAYER' };
    expect(PERFECT_PAIR.evaluate(hand)).toEqual({ won: true, odds: MIXED_PAIR_ODDS });
  });

  it('checks the banker hand too, independent of the player hand', () => {
    const hand = { playerCards: [card('2', 'S'), card('3', 'H')], bankerCards: [card('K', 'D'), card('K', 'D')], winner: 'BANKER' };
    // Same object semantics aside, rank+suit match => perfect.
    expect(PERFECT_PAIR.evaluate(hand)).toEqual({ won: true, odds: PERFECT_PAIR_ODDS });
  });

  it('prefers the perfect payout when one side is perfect and the other merely mixed', () => {
    const hand = {
      playerCards: [card('7', 'S'), card('7', 'S')], // perfect
      bankerCards: [card('9', 'S'), card('9', 'H')], // mixed
      winner: 'PLAYER',
    };
    expect(PERFECT_PAIR.evaluate(hand)).toEqual({ won: true, odds: PERFECT_PAIR_ODDS });
  });

  it('loses when neither hand has any pair', () => {
    const hand = { playerCards: [card('2', 'S'), card('3', 'H')], bankerCards: [card('4', 'S'), card('5', 'H')], winner: 'PLAYER' };
    expect(PERFECT_PAIR.evaluate(hand)).toEqual({ won: false, odds: 0 });
  });
});

describe('DRAGON_7', () => {
  it('wins when Banker wins with a three-card total of exactly 7', () => {
    const hand = {
      playerCards: [card('2', 'S'), card('2', 'H')],
      bankerCards: [card('A', 'S'), card('10', 'H'), card('6', 'D')], // 1+0+6=7
      winner: 'BANKER',
    };
    expect(DRAGON_7.evaluate(hand)).toEqual({ won: true, odds: DRAGON_7_ODDS });
  });

  it('loses when Banker wins with only two cards, even at a total of 7', () => {
    const hand = { playerCards: [card('2', 'S'), card('3', 'H')], bankerCards: [card('3', 'S'), card('4', 'H')], winner: 'BANKER' };
    expect(DRAGON_7.evaluate(hand)).toEqual({ won: false, odds: 0 });
  });

  it('loses when Player wins, regardless of the banker total', () => {
    const hand = {
      playerCards: [card('5', 'S'), card('5', 'H')],
      bankerCards: [card('A', 'S'), card('10', 'H'), card('6', 'D')],
      winner: 'PLAYER',
    };
    expect(DRAGON_7.evaluate(hand)).toEqual({ won: false, odds: 0 });
  });

  it('loses on a three-card banker total that is not 7', () => {
    const hand = {
      playerCards: [card('2', 'S'), card('3', 'H')],
      bankerCards: [card('A', 'S'), card('10', 'H'), card('7', 'D')], // 1+0+7=8
      winner: 'BANKER',
    };
    expect(DRAGON_7.evaluate(hand)).toEqual({ won: false, odds: 0 });
  });
});

describe('PANDA_8', () => {
  it('wins when Player wins with a three-card total of exactly 8', () => {
    const hand = {
      playerCards: [card('A', 'S'), card('10', 'H'), card('7', 'D')], // 1+0+7=8
      bankerCards: [card('2', 'S'), card('2', 'H')],
      winner: 'PLAYER',
    };
    expect(PANDA_8.evaluate(hand)).toEqual({ won: true, odds: PANDA_8_ODDS });
  });

  it('loses when Player wins with only two cards', () => {
    const hand = { playerCards: [card('4', 'S'), card('4', 'H')], bankerCards: [card('2', 'S'), card('2', 'H')], winner: 'PLAYER' };
    expect(PANDA_8.evaluate(hand)).toEqual({ won: false, odds: 0 });
  });

  it('loses when Banker wins, regardless of the player total', () => {
    const hand = {
      playerCards: [card('A', 'S'), card('10', 'H'), card('7', 'D')],
      bankerCards: [card('9', 'S'), card('9', 'H')],
      winner: 'BANKER',
    };
    expect(PANDA_8.evaluate(hand)).toEqual({ won: false, odds: 0 });
  });
});

describe('resolveSideBet', () => {
  it('computes net winnings and total returned for a winning bet', () => {
    const hand = { playerCards: [card('7', 'S'), card('7', 'H')], bankerCards: [card('2', 'S'), card('3', 'H')], winner: 'PLAYER' };
    const result = resolveSideBet(PLAYER_PAIR, 10, hand);
    expect(result).toEqual({
      betType: 'player-pair',
      betAmount: 10,
      won: true,
      odds: PLAYER_PAIR_ODDS,
      netWinnings: 110,
      totalReturned: 120,
    });
  });

  it('returns zero for a losing bet', () => {
    const hand = { playerCards: [card('2', 'S'), card('3', 'H')], bankerCards: [card('4', 'S'), card('5', 'H')], winner: 'PLAYER' };
    const result = resolveSideBet(PLAYER_PAIR, 10, hand);
    expect(result.won).toBe(false);
    expect(result.netWinnings).toBe(0);
    expect(result.totalReturned).toBe(0);
  });

  it('rejects a non-positive bet amount', () => {
    const hand = { playerCards: [card('2', 'S'), card('3', 'H')], bankerCards: [card('4', 'S'), card('5', 'H')], winner: 'PLAYER' };
    expect(() => resolveSideBet(PLAYER_PAIR, 0, hand)).toThrow();
  });
});
