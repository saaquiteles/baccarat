/**
 * constants.js (ui)
 * ---------------------------------------------------------------------------
 * Shared display-only constants for the 2D presentation layer. Nothing here
 * computes a game outcome - odds/labels are read straight from the rules
 * engine's own modules (payouts.js, sideBets.js) so the UI can never drift
 * from what the engine actually pays.
 */

/**
 * Master chip-denomination ladder, smallest to largest. The betting board
 * never shows the whole ladder at once (see `getVisibleChipValues` below) -
 * this is just the full progression a big enough balance can climb through.
 */
export const CHIP_VALUE_LADDER = [1, 5, 25, 100, 500, 1000, 5000, 25000];

/** Starting balance for a fresh session. */
export const STARTING_BALANCE = 1000;

/** Hard cap on how many chip denominations the tray shows at once, so the
 * tray doesn't grow unbounded at very high balances. */
export const MAX_VISIBLE_CHIP_DENOMINATIONS = 5;

/**
 * Which chip denominations the tray should currently offer for a given
 * balance: every denomination the player can afford at least one of
 * (`balance >= denomination`), capped at `maxVisible` by keeping the
 * *largest* affordable denominations - except the smallest denomination (1)
 * is always kept too (whenever `balance >= 1`), so a player can always place
 * a minimal bet and, combined with the spam-to-all-in behavior in
 * GameScreen.jsx, always walk their balance down to exactly zero.
 *
 * @param {number} balance
 * @param {number} [maxVisible]
 * @returns {number[]} Ascending, e.g. [1, 25, 100, 500, 1000].
 */
export function getVisibleChipValues(balance, maxVisible = MAX_VISIBLE_CHIP_DENOMINATIONS) {
  const affordable = CHIP_VALUE_LADDER.filter((value) => balance >= value);
  if (affordable.length <= maxVisible) return affordable;

  const smallest = affordable[0];
  const largestSlice = affordable.slice(affordable.length - (maxVisible - 1));
  return largestSlice[0] === smallest ? largestSlice : [smallest, ...largestSlice];
}

/** Conventional baccarat scoreboard colors: Banker = red, Player = blue, Tie = green. */
export const OUTCOME_COLOR = Object.freeze({
  PLAYER: '#2f6fed',
  BANKER: '#e0433c',
  TIE: '#1f9d55',
});

/** Standard bead-plate / big-road grid height (rows per column) before a column visually overflows. */
export const ROAD_ROWS = 6;
