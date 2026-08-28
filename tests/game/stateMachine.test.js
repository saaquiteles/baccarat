import { describe, it, expect } from 'vitest';
import { createCard, initializeShoe } from '../../src/game/shoe.js';
import { resolveMainBet, STANDARD_COMMISSION_RULESET } from '../../src/game/payouts.js';
import { resolveSideBet, SIDE_BETS } from '../../src/game/sideBets.js';
import { EVENT_TYPES, playHandGenerator, simulateHand } from '../../src/game/stateMachine.js';
import { fixtureShoe, mulberry32 } from './testSupport.js';

function card(rank, suit) {
  return createCard(rank, suit);
}

function eventTypes(events) {
  return events.map((e) => e.type);
}

describe('simulateHand - event sequencing', () => {
  it('both naturals: DEAL_INITIAL -> EVALUATE_WINNER -> PAYOUT, no draw events', () => {
    const cards = [card('5', 'S'), card('4', 'S'), card('3', 'H'), card('5', 'H')]; // P1,B1,P2,B2
    const shoe = fixtureShoe(cards);
    const { events, result, payout, shoe: finalShoe } = simulateHand(shoe);

    expect(eventTypes(events)).toEqual([
      EVENT_TYPES.DEAL_INITIAL,
      EVENT_TYPES.EVALUATE_WINNER,
      EVENT_TYPES.PAYOUT,
    ]);
    expect(events.map((e) => e.sequence)).toEqual([0, 1, 2]);
    expect(result.playerNatural).toBe(true);
    expect(result.bankerNatural).toBe(true);
    expect(result.winner).toBe('BANKER'); // 8 vs 9
    expect(payout.mainBets).toEqual([]);
    expect(payout.sideBets).toEqual([]);
    expect(finalShoe.position).toBe(4);
  });

  it('player natural: banker never draws even with a low banker total', () => {
    const cards = [card('4', 'S'), card('2', 'S'), card('5', 'H'), card('10', 'H')]; // P=9 natural, B=2
    const shoe = fixtureShoe(cards);
    const { events, result } = simulateHand(shoe);

    expect(eventTypes(events)).not.toContain(EVENT_TYPES.BANKER_DRAW);
    expect(eventTypes(events)).not.toContain(EVENT_TYPES.PLAYER_DRAW);
    expect(result.playerNatural).toBe(true);
    expect(result.bankerDrew).toBe(false);
    expect(result.winner).toBe('PLAYER');
  });

  it('player stands, banker draws: emits only a BANKER_DRAW event', () => {
    // P1=2S,B1=AS,P2=4H,B2=AH -> player 6 (stands), banker 2 (draws)
    const cards = [card('2', 'S'), card('A', 'S'), card('4', 'H'), card('A', 'H'), card('3', 'D')];
    const shoe = fixtureShoe(cards);
    const { events, result } = simulateHand(shoe);

    expect(eventTypes(events)).toEqual([
      EVENT_TYPES.DEAL_INITIAL,
      EVENT_TYPES.BANKER_DRAW,
      EVENT_TYPES.EVALUATE_WINNER,
      EVENT_TYPES.PAYOUT,
    ]);
    const bankerDrawEvent = events.find((e) => e.type === EVENT_TYPES.BANKER_DRAW);
    expect(bankerDrawEvent.payload.card).toEqual(card('3', 'D'));
    expect(bankerDrawEvent.payload.bankerTotal).toBe(5); // 1+1+3
    expect(result.playerTotal).toBe(6);
    expect(result.bankerTotal).toBe(5);
    expect(result.winner).toBe('PLAYER');
  });

  it('both draw per the matrix: emits PLAYER_DRAW then BANKER_DRAW in order', () => {
    // P1=AS(1),B1=2S(2),P2=2H(2),B2=2C(2): player total 3 (draws), banker total 4
    // player 3rd = 5D -> banker(4) draws per table (2-7 qualifies)
    const cards = [
      card('A', 'S'),
      card('2', 'S'),
      card('2', 'H'),
      card('2', 'C'),
      card('5', 'D'),
      card('3', 'H'),
    ];
    const shoe = fixtureShoe(cards);
    const { events, result } = simulateHand(shoe);

    expect(eventTypes(events)).toEqual([
      EVENT_TYPES.DEAL_INITIAL,
      EVENT_TYPES.PLAYER_DRAW,
      EVENT_TYPES.BANKER_DRAW,
      EVENT_TYPES.EVALUATE_WINNER,
      EVENT_TYPES.PAYOUT,
    ]);
    expect(events.map((e) => e.sequence)).toEqual([0, 1, 2, 3, 4]);
    expect(result.playerTotal).toBe(8); // 1+2+5
    expect(result.bankerTotal).toBe(7); // 2+2+3
    expect(result.winner).toBe('PLAYER');
  });

  it('tie with no naturals and no draws', () => {
    const cards = [card('3', 'S'), card('2', 'S'), card('3', 'H'), card('4', 'H')]; // player 6, banker 6
    const shoe = fixtureShoe(cards);
    const { result, events } = simulateHand(shoe);

    expect(result.winner).toBe('TIE');
    expect(eventTypes(events)).not.toContain(EVENT_TYPES.PLAYER_DRAW);
    expect(eventTypes(events)).not.toContain(EVENT_TYPES.BANKER_DRAW);
  });

  it('emits RESHUFFLE_REQUIRED as the final event once the cut card is reached', () => {
    const cards = [card('5', 'S'), card('4', 'S'), card('3', 'H'), card('5', 'H')]; // 4-card natural hand
    const shoe = fixtureShoe(cards, { cutCardIndex: 4 }); // cut card sits exactly at the last card dealt
    const { events, shoe: finalShoe } = simulateHand(shoe);

    expect(events[events.length - 1].type).toBe(EVENT_TYPES.RESHUFFLE_REQUIRED);
    expect(finalShoe.needsReshuffle).toBe(true);
  });

  it('does not emit RESHUFFLE_REQUIRED when the cut card has not been reached', () => {
    const cards = [card('5', 'S'), card('4', 'S'), card('3', 'H'), card('5', 'H')];
    const shoe = fixtureShoe(cards, { cutCardIndex: 100 });
    const { events } = simulateHand(shoe);
    expect(eventTypes(events)).not.toContain(EVENT_TYPES.RESHUFFLE_REQUIRED);
  });
});

describe('simulateHand - payout integration (main bet + all five side bets in one hand)', () => {
  // P1=2S(2), B1=AS(1), P2=2H(2), B2=10H(0), P3=10D(0), B3=6C(6)
  // player: 2+2+0 = 4 (draws first, since initial total 4)
  // banker: 1+0 = 1 initially -> always draws (rows 0/1/2) -> +6 = 7
  // winner: BANKER (7 > 4), banker's winning hand has 3 cards totaling 7 -> Dragon 7
  // player's first two cards (2S,2H) are a same-rank, different-suit pair -> Player Pair wins,
  //   and Perfect Pair wins at the mixed (non-perfect) rate.
  // banker's first two cards (AS,10H) are not a pair -> Banker Pair loses.
  // Player did not win, let alone with a 3-card 8 -> Panda 8 loses.
  const cards = [card('2', 'S'), card('A', 'S'), card('2', 'H'), card('10', 'H'), card('10', 'D'), card('6', 'C')];

  function play() {
    const shoe = fixtureShoe(cards);
    return simulateHand(
      shoe,
      {
        mainBets: [{ betType: 'BANKER', amount: 100 }],
        sideBets: [
          { sideBetId: 'player-pair', amount: 20 },
          { sideBetId: 'banker-pair', amount: 5 },
          { sideBetId: 'perfect-pair', amount: 10 },
          { sideBetId: 'dragon-7', amount: 10 },
          { sideBetId: 'panda-8', amount: 15 },
        ],
      },
      STANDARD_COMMISSION_RULESET
    );
  }

  it('resolves the main Banker bet with 5% commission', () => {
    const { result, payout } = play();
    expect(result.winner).toBe('BANKER');
    expect(result.bankerTotal).toBe(7);
    expect(result.bankerCards).toHaveLength(3);

    const bankerResult = payout.mainBets.find((b) => b.betType === 'BANKER');
    expect(bankerResult).toEqual(
      resolveMainBet(STANDARD_COMMISSION_RULESET, {
        betType: 'BANKER',
        betAmount: 100,
        winner: 'BANKER',
        bankerTotal: 7,
      })
    );
    expect(bankerResult.netWinnings).toBe(95);
    expect(bankerResult.totalReturned).toBe(195);
  });

  it('resolves every side bet independently and matches direct sideBets evaluation', () => {
    const { result, payout } = play();
    const dealtHand = { playerCards: result.playerCards, bankerCards: result.bankerCards, winner: result.winner };

    const byType = Object.fromEntries(payout.sideBets.map((b) => [b.betType, b]));

    expect(byType['dragon-7']).toEqual(resolveSideBet(SIDE_BETS['dragon-7'], 10, dealtHand));
    expect(byType['dragon-7'].won).toBe(true);
    expect(byType['dragon-7'].odds).toBe(40);

    expect(byType['player-pair']).toEqual(resolveSideBet(SIDE_BETS['player-pair'], 20, dealtHand));
    expect(byType['player-pair'].won).toBe(true);

    expect(byType['banker-pair']).toEqual(resolveSideBet(SIDE_BETS['banker-pair'], 5, dealtHand));
    expect(byType['banker-pair'].won).toBe(false);

    expect(byType['perfect-pair']).toEqual(resolveSideBet(SIDE_BETS['perfect-pair'], 10, dealtHand));
    expect(byType['perfect-pair'].won).toBe(true);
    expect(byType['perfect-pair'].odds).toBe(5); // mixed-suit pair, not a perfect pair

    expect(byType['panda-8']).toEqual(resolveSideBet(SIDE_BETS['panda-8'], 15, dealtHand));
    expect(byType['panda-8'].won).toBe(false);
  });

  it('throws for an unknown side bet id', () => {
    const shoe = fixtureShoe(cards);
    expect(() =>
      simulateHand(shoe, { sideBets: [{ sideBetId: 'nope', amount: 10 }] })
    ).toThrow();
  });
});

describe('playHandGenerator - step-by-step consumption', () => {
  it('yields events one at a time and returns the final shoe as the generator result', () => {
    const cards = [card('5', 'S'), card('4', 'S'), card('3', 'H'), card('5', 'H')];
    const shoe = fixtureShoe(cards);
    const gen = playHandGenerator(shoe);

    const step1 = gen.next();
    expect(step1.done).toBe(false);
    expect(step1.value.type).toBe(EVENT_TYPES.DEAL_INITIAL);

    const step2 = gen.next();
    expect(step2.value.type).toBe(EVENT_TYPES.EVALUATE_WINNER);

    const step3 = gen.next();
    expect(step3.value.type).toBe(EVENT_TYPES.PAYOUT);

    const step4 = gen.next();
    expect(step4.done).toBe(true);
    expect(step4.value.position).toBe(4); // generator's return value is the final shoe
  });
});

describe('full shoe simulation (integration / statistical sanity)', () => {
  it('produces plausible baccarat outcome frequencies over many real, shuffled hands', () => {
    const rng = mulberry32(20260828);
    let shoe = initializeShoe({ getUint32: rng });
    const outcomes = { PLAYER: 0, BANKER: 0, TIE: 0 };
    const totalHands = 20_000;

    for (let i = 0; i < totalHands; i += 1) {
      if (shoe.needsReshuffle) {
        shoe = initializeShoe({ getUint32: rng });
      }
      const { result, shoe: nextShoe } = simulateHand(shoe);
      outcomes[result.winner] += 1;
      expect(result.playerTotal).toBeGreaterThanOrEqual(0);
      expect(result.playerTotal).toBeLessThanOrEqual(9);
      expect(result.bankerTotal).toBeGreaterThanOrEqual(0);
      expect(result.bankerTotal).toBeLessThanOrEqual(9);
      shoe = nextShoe;
    }

    // Published 8-deck Punto Banco probabilities: Banker ~45.86%, Player
    // ~44.62%, Tie ~9.52%. Allow a generous +/-2 percentage point band -
    // at 20,000 hands the sampling noise is roughly +/-0.35pp (1 std dev),
    // so this is a very safe, non-flaky bound while still catching a
    // genuinely wrong draw-rule implementation.
    expect(outcomes.BANKER / totalHands).toBeGreaterThan(0.4386);
    expect(outcomes.BANKER / totalHands).toBeLessThan(0.4786);
    expect(outcomes.PLAYER / totalHands).toBeGreaterThan(0.4262);
    expect(outcomes.PLAYER / totalHands).toBeLessThan(0.4662);
    expect(outcomes.TIE / totalHands).toBeGreaterThan(0.0752);
    expect(outcomes.TIE / totalHands).toBeLessThan(0.1152);
  });
});
