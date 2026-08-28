/**
 * stateMachine.js
 * ---------------------------------------------------------------------------
 * Deterministic Punto Banco hand state machine. Orchestrates one full hand -
 * deal, draws, evaluation, and payout - as an ordered sequence of plain,
 * serializable events. Every event carries the full payload a consumer needs
 * (hand values, drawn cards, winner, payout breakdown per bet) so a UI,
 * animator, or audio-cue subagent can react to each event in turn without
 * ever recomputing game logic itself.
 *
 * Two ways to run a hand:
 *  - {@link playHandGenerator}: a generator that yields one event at a time.
 *    Ideal for the animation/UI layer, which can `.next()` through events at
 *    whatever pace matches the card-dealing animation.
 *  - {@link simulateHand}: drains the generator synchronously and returns
 *    the full event list plus the final shoe state. Ideal for tests and for
 *    a QA agent bulk-simulating hundreds of thousands of hands headlessly.
 */

import { drawCard } from './shoe.js';
import { handTotal, isNatural, playerDraws, bankerDraws, determineWinner } from './rules.js';
import { resolveMainBet, STANDARD_COMMISSION_RULESET } from './payouts.js';
import { SIDE_BETS, resolveSideBet } from './sideBets.js';

/**
 * @typedef {import('./shoe.js').Card} Card
 * @typedef {import('./shoe.js').ShoeState} ShoeState
 * @typedef {import('./rules.js').Outcome} Outcome
 * @typedef {import('./payouts.js').PayoutRuleset} PayoutRuleset
 * @typedef {import('./payouts.js').MainBetType} MainBetType
 * @typedef {import('./payouts.js').MainBetResult} MainBetResult
 * @typedef {import('./sideBets.js').SideBetResult} SideBetResult
 */

/** All event types this state machine can emit, in the order they occur within a hand. */
export const EVENT_TYPES = Object.freeze({
  DEAL_INITIAL: 'DEAL_INITIAL',
  PLAYER_DRAW: 'PLAYER_DRAW',
  BANKER_DRAW: 'BANKER_DRAW',
  EVALUATE_WINNER: 'EVALUATE_WINNER',
  PAYOUT: 'PAYOUT',
  RESHUFFLE_REQUIRED: 'RESHUFFLE_REQUIRED',
});

/**
 * @typedef {Object} GameEvent
 * @property {number} sequence - 0-based position of this event within the hand.
 * @property {string} type - One of {@link EVENT_TYPES}.
 * @property {Object} payload - Event-specific data, see per-event typedefs below.
 */

/**
 * @typedef {Object} DealInitialPayload
 * @property {[Card, Card]} playerCards
 * @property {[Card, Card]} bankerCards
 * @property {number} playerTotal
 * @property {number} bankerTotal
 * @property {boolean} playerNatural
 * @property {boolean} bankerNatural
 */

/**
 * @typedef {Object} DrawPayload
 * @property {Card} card - The single card just drawn.
 * @property {Card[]} playerCards - Player's full hand so far (present on PLAYER_DRAW).
 * @property {Card[]} bankerCards - Banker's full hand so far (present on BANKER_DRAW).
 * @property {number} playerTotal - Present on PLAYER_DRAW.
 * @property {number} bankerTotal - Present on BANKER_DRAW.
 */

/**
 * @typedef {Object} EvaluateWinnerPayload
 * @property {Card[]} playerCards - Final hand (2 or 3 cards).
 * @property {Card[]} bankerCards - Final hand (2 or 3 cards).
 * @property {number} playerTotal
 * @property {number} bankerTotal
 * @property {Outcome} winner
 * @property {boolean} playerNatural
 * @property {boolean} bankerNatural
 * @property {boolean} playerDrew
 * @property {boolean} bankerDrew
 */

/**
 * @typedef {Object} PayoutPayload
 * @property {string} payoutRulesetId
 * @property {MainBetResult[]} mainBets
 * @property {SideBetResult[]} sideBets
 */

/**
 * @typedef {Object} MainBetInput
 * @property {MainBetType} betType - 'PLAYER' | 'BANKER' | 'TIE'.
 * @property {number} amount
 */

/**
 * @typedef {Object} SideBetInput
 * @property {string} sideBetId - Key into sideBets.SIDE_BETS, e.g. 'dragon-7'.
 * @property {number} amount
 */

/**
 * @typedef {Object} HandBets
 * @property {MainBetInput[]} [mainBets] - Usually a single Player/Banker/Tie wager; an array so multiple simultaneous main bets are representable if ever allowed.
 * @property {SideBetInput[]} [sideBets]
 */

function makeEvent(sequence, type, payload) {
  return Object.freeze({ sequence, type, payload: Object.freeze(payload) });
}

/**
 * Plays one hand from a shoe, yielding a deterministic, ordered sequence of
 * {@link GameEvent} objects. Consumers step through events with `.next()`;
 * each event's payload is fully self-contained (no need to re-derive hand
 * state from cards). When the generator is fully drained, its return value
 * (available as `.next().value` on the final `{done: true}` step, e.g. by
 * using {@link simulateHand}) is the updated {@link ShoeState}.
 *
 * @param {ShoeState} initialShoe
 * @param {HandBets} [bets]
 * @param {PayoutRuleset} [payoutRuleset]
 * @returns {Generator<GameEvent, ShoeState, void>}
 */
export function* playHandGenerator(initialShoe, bets = {}, payoutRuleset = STANDARD_COMMISSION_RULESET) {
  let shoe = initialShoe;
  let sequence = 0;

  const draw = () => {
    const { card, shoe: nextShoe } = drawCard(shoe);
    shoe = nextShoe;
    return card;
  };

  // Standard deal order: Player, Banker, Player, Banker.
  const playerCard1 = draw();
  const bankerCard1 = draw();
  const playerCard2 = draw();
  const bankerCard2 = draw();

  /** @type {Card[]} */
  let playerCards = [playerCard1, playerCard2];
  /** @type {Card[]} */
  let bankerCards = [bankerCard1, bankerCard2];

  const playerTwoCardTotal = handTotal(playerCards);
  const bankerTwoCardTotal = handTotal(bankerCards);
  const playerNatural = isNatural(playerCards);
  const bankerNatural = isNatural(bankerCards);

  yield makeEvent(sequence++, EVENT_TYPES.DEAL_INITIAL, {
    playerCards,
    bankerCards,
    playerTotal: playerTwoCardTotal,
    bankerTotal: bankerTwoCardTotal,
    playerNatural,
    bankerNatural,
  });

  let playerDrew = false;
  let bankerDrew = false;

  if (!playerNatural && !bankerNatural) {
    if (playerDraws(playerTwoCardTotal)) {
      const card = draw();
      playerCards = [...playerCards, card];
      playerDrew = true;
      yield makeEvent(sequence++, EVENT_TYPES.PLAYER_DRAW, {
        card,
        playerCards,
        playerTotal: handTotal(playerCards),
      });
    }

    const shouldBankerDraw = bankerDraws({
      bankerTotal: bankerTwoCardTotal,
      playerDrew,
      playerThirdCardValue: playerDrew ? playerCards[2].value : null,
    });

    if (shouldBankerDraw) {
      const card = draw();
      bankerCards = [...bankerCards, card];
      bankerDrew = true;
      yield makeEvent(sequence++, EVENT_TYPES.BANKER_DRAW, {
        card,
        bankerCards,
        bankerTotal: handTotal(bankerCards),
      });
    }
  }

  const playerTotal = handTotal(playerCards);
  const bankerTotal = handTotal(bankerCards);
  const winner = determineWinner(playerTotal, bankerTotal);

  yield makeEvent(sequence++, EVENT_TYPES.EVALUATE_WINNER, {
    playerCards,
    bankerCards,
    playerTotal,
    bankerTotal,
    winner,
    playerNatural,
    bankerNatural,
    playerDrew,
    bankerDrew,
  });

  const dealtHand = { playerCards, bankerCards, winner };

  const mainBetResults = (bets.mainBets || []).map((bet) =>
    resolveMainBet(payoutRuleset, {
      betType: bet.betType,
      betAmount: bet.amount,
      winner,
      bankerTotal,
    })
  );

  const sideBetResults = (bets.sideBets || []).map((bet) => {
    const definition = SIDE_BETS[bet.sideBetId];
    if (!definition) {
      throw new Error(`Unknown side bet id: ${bet.sideBetId}`);
    }
    return resolveSideBet(definition, bet.amount, dealtHand);
  });

  yield makeEvent(sequence++, EVENT_TYPES.PAYOUT, {
    payoutRulesetId: payoutRuleset.id,
    mainBets: mainBetResults,
    sideBets: sideBetResults,
  });

  if (shoe.needsReshuffle) {
    yield makeEvent(sequence, EVENT_TYPES.RESHUFFLE_REQUIRED, {
      cardsRemaining: shoe.cards.length - shoe.position,
    });
  }

  return shoe;
}

/**
 * @typedef {Object} SimulatedHand
 * @property {GameEvent[]} events - The full, ordered event log for the hand.
 * @property {ShoeState} shoe - Shoe state after the hand (check `.needsReshuffle`).
 * @property {EvaluateWinnerPayload} result - Convenience accessor for the EVALUATE_WINNER payload.
 * @property {PayoutPayload} payout - Convenience accessor for the PAYOUT payload.
 */

/**
 * Runs {@link playHandGenerator} to completion and collects every event into
 * an array. This is the entry point most callers (tests, a headless QA
 * simulation loop, or any consumer that doesn't need to animate
 * card-by-card) should use.
 *
 * @param {ShoeState} initialShoe
 * @param {HandBets} [bets]
 * @param {PayoutRuleset} [payoutRuleset]
 * @returns {SimulatedHand}
 */
export function simulateHand(initialShoe, bets = {}, payoutRuleset = STANDARD_COMMISSION_RULESET) {
  const generator = playHandGenerator(initialShoe, bets, payoutRuleset);
  const events = [];
  let step = generator.next();
  while (!step.done) {
    events.push(step.value);
    step = generator.next();
  }
  const finalShoe = step.value;

  const result = events.find((e) => e.type === EVENT_TYPES.EVALUATE_WINNER)?.payload;
  const payout = events.find((e) => e.type === EVENT_TYPES.PAYOUT)?.payload;

  return { events, shoe: finalShoe, result, payout };
}
