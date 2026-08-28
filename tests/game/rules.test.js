import { describe, it, expect } from 'vitest';
import { createCard } from '../../src/game/shoe.js';
import {
  handTotal,
  isNatural,
  playerDraws,
  bankerDraws,
  determineWinner,
  playHandRules,
} from '../../src/game/rules.js';

function card(rank, suit = 'S') {
  return createCard(rank, suit);
}

describe('handTotal', () => {
  it('sums point values and reduces mod 10', () => {
    expect(handTotal([card('5'), card('4')])).toBe(9);
    expect(handTotal([card('9'), card('9')])).toBe(8); // 18 mod 10
    expect(handTotal([card('K'), card('Q'), card('5')])).toBe(5); // 0+0+5
  });
});

describe('isNatural', () => {
  it('is true only for a two-card total of 8 or 9', () => {
    expect(isNatural([card('5'), card('3')])).toBe(true); // 8
    expect(isNatural([card('5'), card('4')])).toBe(true); // 9
    expect(isNatural([card('5'), card('2')])).toBe(false); // 7
  });

  it('is false for a three-card total of 8 or 9 (naturals are initial-deal only)', () => {
    expect(isNatural([card('5'), card('2'), card('A')])).toBe(false); // 8 with 3 cards - not a natural
  });
});

describe('playerDraws', () => {
  it('draws on 0-5', () => {
    for (let t = 0; t <= 5; t += 1) expect(playerDraws(t)).toBe(true);
  });
  it('stands on 6-7', () => {
    expect(playerDraws(6)).toBe(false);
    expect(playerDraws(7)).toBe(false);
  });
});

describe('bankerDraws - player stood (no third card)', () => {
  it('draws on 0-5, stands on 6-7, mirroring the player rule', () => {
    for (let t = 0; t <= 5; t += 1) {
      expect(bankerDraws({ bankerTotal: t, playerDrew: false })).toBe(true);
    }
    expect(bankerDraws({ bankerTotal: 6, playerDrew: false })).toBe(false);
    expect(bankerDraws({ bankerTotal: 7, playerDrew: false })).toBe(false);
  });
});

describe('bankerDraws - full third-card tableau (player drew)', () => {
  it('banker total 0/1/2 always draws, regardless of the player third card', () => {
    for (const bankerTotal of [0, 1, 2]) {
      for (let p = 0; p <= 9; p += 1) {
        expect(bankerDraws({ bankerTotal, playerDrew: true, playerThirdCardValue: p })).toBe(true);
      }
    }
  });

  it('banker total 3 draws unless the player third card is 8', () => {
    for (const p of [0, 1, 2, 3, 4, 5, 6, 7, 9]) {
      expect(bankerDraws({ bankerTotal: 3, playerDrew: true, playerThirdCardValue: p })).toBe(true);
    }
    expect(bankerDraws({ bankerTotal: 3, playerDrew: true, playerThirdCardValue: 8 })).toBe(false);
  });

  it('banker total 4 draws when the player third card is 2-7, else stands', () => {
    for (const p of [2, 3, 4, 5, 6, 7]) {
      expect(bankerDraws({ bankerTotal: 4, playerDrew: true, playerThirdCardValue: p })).toBe(true);
    }
    for (const p of [0, 1, 8, 9]) {
      expect(bankerDraws({ bankerTotal: 4, playerDrew: true, playerThirdCardValue: p })).toBe(false);
    }
  });

  it('banker total 5 draws when the player third card is 4-7, else stands', () => {
    for (const p of [4, 5, 6, 7]) {
      expect(bankerDraws({ bankerTotal: 5, playerDrew: true, playerThirdCardValue: p })).toBe(true);
    }
    for (const p of [0, 1, 2, 3, 8, 9]) {
      expect(bankerDraws({ bankerTotal: 5, playerDrew: true, playerThirdCardValue: p })).toBe(false);
    }
  });

  it('banker total 6 draws only when the player third card is 6 or 7', () => {
    for (const p of [6, 7]) {
      expect(bankerDraws({ bankerTotal: 6, playerDrew: true, playerThirdCardValue: p })).toBe(true);
    }
    for (const p of [0, 1, 2, 3, 4, 5, 8, 9]) {
      expect(bankerDraws({ bankerTotal: 6, playerDrew: true, playerThirdCardValue: p })).toBe(false);
    }
  });

  it('banker total 7 always stands', () => {
    for (let p = 0; p <= 9; p += 1) {
      expect(bankerDraws({ bankerTotal: 7, playerDrew: true, playerThirdCardValue: p })).toBe(false);
    }
  });

  it('throws if playerDrew is true but no playerThirdCardValue is supplied', () => {
    expect(() => bankerDraws({ bankerTotal: 3, playerDrew: true })).toThrow();
  });
});

describe('determineWinner', () => {
  it('picks the higher total, or TIE when equal', () => {
    expect(determineWinner(8, 5)).toBe('PLAYER');
    expect(determineWinner(5, 8)).toBe('BANKER');
    expect(determineWinner(6, 6)).toBe('TIE');
  });
});

describe('playHandRules - full scenarios', () => {
  function drawQueue(cards) {
    let i = 0;
    return () => {
      if (i >= cards.length) throw new Error('draw() called more times than expected');
      return cards[i++];
    };
  }

  it('both naturals: hand ends immediately, no draws at all', () => {
    const initialPlayerCards = [card('5'), card('3')]; // 8
    const initialBankerCards = [card('4'), card('5')]; // 9
    const draw = drawQueue([]); // must never be called
    const hand = playHandRules({ initialPlayerCards, initialBankerCards, draw });

    expect(hand.playerNatural).toBe(true);
    expect(hand.bankerNatural).toBe(true);
    expect(hand.playerDrew).toBe(false);
    expect(hand.bankerDrew).toBe(false);
    expect(hand.playerTotal).toBe(8);
    expect(hand.bankerTotal).toBe(9);
    expect(hand.winner).toBe('BANKER');
  });

  it('player natural: banker never draws against a player natural, even with a low banker total', () => {
    const initialPlayerCards = [card('4'), card('5')]; // 9, natural
    const initialBankerCards = [card('2'), card('10')]; // 2 - would draw under the normal table
    const draw = drawQueue([]); // must never be called
    const hand = playHandRules({ initialPlayerCards, initialBankerCards, draw });

    expect(hand.playerNatural).toBe(true);
    expect(hand.bankerNatural).toBe(false);
    expect(hand.bankerDrew).toBe(false);
    expect(hand.winner).toBe('PLAYER');
    expect(hand.playerTotal).toBe(9);
    expect(hand.bankerTotal).toBe(2);
  });

  it('banker natural: player never draws against a banker natural', () => {
    const initialPlayerCards = [card('2'), card('A')]; // 3 - would draw under the normal table
    const initialBankerCards = [card('4'), card('5')]; // 9, natural
    const draw = drawQueue([]); // must never be called
    const hand = playHandRules({ initialPlayerCards, initialBankerCards, draw });

    expect(hand.bankerNatural).toBe(true);
    expect(hand.playerDrew).toBe(false);
    expect(hand.winner).toBe('BANKER');
  });

  it('player stands (6), banker draws per the no-third-card rule (banker 2 -> draws)', () => {
    const initialPlayerCards = [card('2'), card('4')]; // 6, stands
    const initialBankerCards = [card('A'), card('A')]; // 2, draws
    const draw = drawQueue([card('3')]); // banker draws a 3 -> total 5
    const hand = playHandRules({ initialPlayerCards, initialBankerCards, draw });

    expect(hand.playerDrew).toBe(false);
    expect(hand.bankerDrew).toBe(true);
    expect(hand.bankerCards).toHaveLength(3);
    expect(hand.playerTotal).toBe(6);
    expect(hand.bankerTotal).toBe(5);
    expect(hand.winner).toBe('PLAYER');
  });

  it('player stands (7), banker stands per the no-third-card rule (banker 7 -> stands)', () => {
    const initialPlayerCards = [card('3'), card('4')]; // 7, stands
    const initialBankerCards = [card('3'), card('4')]; // 7, stands
    const draw = drawQueue([]); // neither side draws
    const hand = playHandRules({ initialPlayerCards, initialBankerCards, draw });

    expect(hand.playerDrew).toBe(false);
    expect(hand.bankerDrew).toBe(false);
    expect(hand.winner).toBe('TIE');
  });

  it('player draws, banker draws per the matrix (banker 4, player third=5 -> draws)', () => {
    const initialPlayerCards = [card('A'), card('2')]; // 3, draws
    const initialBankerCards = [card('2'), card('2')]; // 4
    const draw = drawQueue([card('5'), card('3')]); // player 3rd=5 (qualifies banker-4 draw), banker 3rd=3
    const hand = playHandRules({ initialPlayerCards, initialBankerCards, draw });

    expect(hand.playerDrew).toBe(true);
    expect(hand.bankerDrew).toBe(true);
    expect(hand.playerTotal).toBe(8); // 1+2+5
    expect(hand.bankerTotal).toBe(7); // 2+2+3
    expect(hand.winner).toBe('PLAYER');
  });

  it('player draws, banker stands per the matrix (banker 7 -> always stands)', () => {
    const initialPlayerCards = [card('2'), card('2')]; // 4, draws
    const initialBankerCards = [card('3'), card('4')]; // 7
    const draw = drawQueue([card('6')]); // only the player's third card is drawn
    const hand = playHandRules({ initialPlayerCards, initialBankerCards, draw });

    expect(hand.playerDrew).toBe(true);
    expect(hand.bankerDrew).toBe(false);
    expect(hand.playerTotal).toBe(0); // 2+2+6=10 mod 10
    expect(hand.bankerTotal).toBe(7);
    expect(hand.winner).toBe('BANKER');
  });

  it('player draws, banker stands per the matrix (banker 4, player third=8 -> stands)', () => {
    const initialPlayerCards = [card('3'), card('2')]; // 5, draws
    const initialBankerCards = [card('2'), card('2')]; // 4
    const draw = drawQueue([card('8')]); // player third card = 8 -> banker-4 must stand
    const hand = playHandRules({ initialPlayerCards, initialBankerCards, draw });

    expect(hand.playerDrew).toBe(true);
    expect(hand.bankerDrew).toBe(false);
    expect(hand.playerTotal).toBe(3); // 3+2+8=13 mod 10
    expect(hand.bankerTotal).toBe(4);
    expect(hand.winner).toBe('BANKER');
  });

  it('tie with no naturals and no draws', () => {
    const initialPlayerCards = [card('3'), card('3')]; // 6, stands
    const initialBankerCards = [card('2'), card('4')]; // 6, stands (player stood, banker 6 stands)
    const draw = drawQueue([]);
    const hand = playHandRules({ initialPlayerCards, initialBankerCards, draw });

    expect(hand.winner).toBe('TIE');
    expect(hand.playerDrew).toBe(false);
    expect(hand.bankerDrew).toBe(false);
  });
});
