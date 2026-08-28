/**
 * rules.js
 * ---------------------------------------------------------------------------
 * Core Punto Banco drawing rules: hand values, naturals, the Player's fixed
 * draw rule, and the Banker's third-card drawing matrix. Pure functions only
 * - no shoe/state mutation, no I/O. Every function here takes plain data
 * (cards, totals) and returns plain data.
 */

/**
 * @typedef {import('./shoe.js').Card} Card
 */

/** @typedef {'PLAYER'|'BANKER'|'TIE'} Outcome */

/**
 * Sums card point values and reduces mod 10, per baccarat scoring rules.
 * @param {Card[]} cards
 * @returns {number} A single digit 0-9.
 */
export function handTotal(cards) {
  const sum = cards.reduce((acc, card) => acc + card.value, 0);
  return sum % 10;
}

/**
 * A "natural" is an initial two-card total of 8 or 9. Naturals are only
 * meaningful when the hand has exactly two cards.
 * @param {Card[]} cards
 * @returns {boolean}
 */
export function isNatural(cards) {
  return cards.length === 2 && handTotal(cards) >= 8;
}

/**
 * Whether the Player hand draws a third card, per the fixed Player rule.
 * Only applies when neither initial hand is a natural - callers must check
 * naturals first.
 *
 * Player draws on an initial total of 0-5, stands on 6-7.
 *
 * @param {number} playerTotal - Player's two-card total (0-9).
 * @returns {boolean}
 */
export function playerDraws(playerTotal) {
  return playerTotal <= 5;
}

/**
 * Whether the Banker hand draws a third card.
 *
 * Two cases:
 *  - The Player stood (did not draw a third card): Banker draws on 0-5,
 *    stands on 6-7 - identical shape to the Player rule.
 *  - The Player drew a third card: Banker's decision depends on both the
 *    Banker's own two-card total and the value of the Player's third card,
 *    per the standard tableau:
 *
 *      Banker total | Draws when Player's 3rd card is
 *      -------------+---------------------------------
 *          0,1,2     | always draws
 *          3         | 0-7 or 9  (stands only on 8)
 *          4         | 2-7       (stands on 0,1,8,9)
 *          5         | 4-7       (stands on 0,1,2,3,8,9)
 *          6         | 6,7       (stands on 0,1,2,3,4,5,8,9)
 *          7         | never (always stands)
 *
 * Only applies when neither initial hand is a natural - callers must check
 * naturals first.
 *
 * @param {Object} params
 * @param {number} params.bankerTotal - Banker's two-card total (0-9).
 * @param {boolean} params.playerDrew - Whether the Player drew a third card.
 * @param {number|null} [params.playerThirdCardValue] - Point value (0-9) of
 *   the Player's third card; required and only meaningful when playerDrew is true.
 * @returns {boolean}
 */
export function bankerDraws({ bankerTotal, playerDrew, playerThirdCardValue = null }) {
  if (bankerTotal >= 7) return false;

  if (!playerDrew) {
    // Same shape as the Player's own stand/draw rule.
    return bankerTotal <= 5;
  }

  if (playerThirdCardValue === null || playerThirdCardValue === undefined) {
    throw new Error('playerThirdCardValue is required when playerDrew is true');
  }

  switch (bankerTotal) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return playerThirdCardValue !== 8;
    case 4:
      return playerThirdCardValue >= 2 && playerThirdCardValue <= 7;
    case 5:
      return playerThirdCardValue >= 4 && playerThirdCardValue <= 7;
    case 6:
      return playerThirdCardValue === 6 || playerThirdCardValue === 7;
    default:
      return false;
  }
}

/**
 * Determines the hand winner by comparing final totals.
 * @param {number} playerTotal
 * @param {number} bankerTotal
 * @returns {Outcome}
 */
export function determineWinner(playerTotal, bankerTotal) {
  if (playerTotal > bankerTotal) return 'PLAYER';
  if (bankerTotal > playerTotal) return 'BANKER';
  return 'TIE';
}

/**
 * @typedef {Object} PlayedHand
 * @property {Card[]} playerCards - Final player hand (2 or 3 cards).
 * @property {Card[]} bankerCards - Final banker hand (2 or 3 cards).
 * @property {number} playerTotal - Final player total (0-9).
 * @property {number} bankerTotal - Final banker total (0-9).
 * @property {Outcome} winner
 * @property {boolean} playerNatural - True if Player's initial 2 cards were a natural 8/9.
 * @property {boolean} bankerNatural - True if Banker's initial 2 cards were a natural 8/9.
 * @property {boolean} playerDrew - True if the Player drew a third card.
 * @property {boolean} bankerDrew - True if the Banker drew a third card.
 */

/**
 * Plays out a complete hand's draw logic given four already-dealt initial
 * cards (Player, Banker, Player, Banker - the standard deal order) and a
 * `draw()` callback used to obtain any needed third cards. This function
 * contains ALL of the rule decisions; `draw` is only asked for a card when
 * the rules say a card must be drawn, and is asked for at most one card per
 * side, matching real Punto Banco play exactly.
 *
 * This is deliberately decoupled from the shoe: the state machine supplies
 * `draw` (backed by shoe.drawCard) so this module has zero knowledge of
 * shoe internals, and so it can be unit tested with canned cards.
 *
 * @param {Object} params
 * @param {[Card, Card]} params.initialPlayerCards
 * @param {[Card, Card]} params.initialBankerCards
 * @param {() => Card} params.draw - Returns the next card from the shoe.
 * @returns {PlayedHand}
 */
export function playHandRules({ initialPlayerCards, initialBankerCards, draw }) {
  const playerTwoCardTotal = handTotal(initialPlayerCards);
  const bankerTwoCardTotal = handTotal(initialBankerCards);

  const playerNatural = isNatural(initialPlayerCards);
  const bankerNatural = isNatural(initialBankerCards);

  let playerCards = initialPlayerCards;
  let bankerCards = initialBankerCards;
  let playerDrew = false;
  let bankerDrew = false;

  if (!playerNatural && !bankerNatural) {
    if (playerDraws(playerTwoCardTotal)) {
      const thirdCard = draw();
      playerCards = [...playerCards, thirdCard];
      playerDrew = true;
    }

    const shouldBankerDraw = bankerDraws({
      bankerTotal: bankerTwoCardTotal,
      playerDrew,
      playerThirdCardValue: playerDrew ? playerCards[2].value : null,
    });

    if (shouldBankerDraw) {
      const thirdCard = draw();
      bankerCards = [...bankerCards, thirdCard];
      bankerDrew = true;
    }
  }

  const playerTotal = handTotal(playerCards);
  const bankerTotal = handTotal(bankerCards);
  const winner = determineWinner(playerTotal, bankerTotal);

  return {
    playerCards,
    bankerCards,
    playerTotal,
    bankerTotal,
    winner,
    playerNatural,
    bankerNatural,
    playerDrew,
    bankerDrew,
  };
}
