/**
 * payouts.js
 * ---------------------------------------------------------------------------
 * Pluggable payout rulesets for the three main wagers (Player, Banker, Tie).
 * The commission rule is the one thing that varies between "standard" and
 * "no-commission" Punto Banco tables, so it's modeled as data (a ruleset
 * object) rather than as hardcoded if/else branches scattered through the
 * codebase - callers pick a ruleset and pass it into {@link resolveMainBet}.
 *
 * Side bets (Player Pair, Banker Pair, Perfect Pair, Dragon 7, Panda 8) are
 * NOT part of a commission ruleset - they resolve identically regardless of
 * which main-bet ruleset is active, and live in sideBets.js.
 */

/** @typedef {'PLAYER'|'BANKER'|'TIE'} Outcome */
/** @typedef {'PLAYER'|'BANKER'|'TIE'} MainBetType */

export const MAIN_BET_TYPES = Object.freeze({
  PLAYER: 'PLAYER',
  BANKER: 'BANKER',
  TIE: 'TIE',
});

/**
 * @typedef {Object} MainBetResult
 * @property {MainBetType} betType
 * @property {number} betAmount
 * @property {boolean} won - True if this bet won outright.
 * @property {boolean} pushed - True if the bet neither won nor lost (a Player
 *   or Banker bet is returned, un-worked, when the hand ties).
 * @property {number} winningsBeforeCommission - Gross winnings before any commission is deducted (0 if lost/pushed).
 * @property {number} commission - Commission deducted from winnings (0 unless a Banker win under the standard-commission ruleset).
 * @property {number} netWinnings - Winnings actually credited, after commission (excludes the original stake).
 * @property {number} totalReturned - Total handed back to the player: stake + netWinnings if won, just the stake if pushed, 0 if lost.
 */

/**
 * @typedef {Object} PayoutRuleset
 * @property {string} id - Stable identifier, e.g. "standard-commission".
 * @property {string} name - Human-readable label.
 * @property {number} tieOdds - Tie bet payout odds, e.g. 8 means 8:1.
 * @property {(betAmount: number, bankerTotal: number) => { winningsBeforeCommission: number, commission: number, netWinnings: number }} resolveBankerWin -
 *   Computes the gross/commission/net breakdown for a *winning* Banker bet.
 *   `bankerTotal` is the Banker's final hand total (needed by the
 *   no-commission variant, which pays a winning Banker-6 at 1:2 instead of 1:1).
 */

function makeResult({
  betType,
  betAmount,
  won,
  pushed,
  winningsBeforeCommission = 0,
  commission = 0,
  netWinnings = 0,
}) {
  const totalReturned = won ? betAmount + netWinnings : pushed ? betAmount : 0;
  return Object.freeze({
    betType,
    betAmount,
    won,
    pushed,
    winningsBeforeCommission,
    commission,
    netWinnings,
    totalReturned,
  });
}

/**
 * Standard Punto Banco: Player and Banker both pay even money (1:1) when they
 * win; the house edge on Banker is instead recouped via a flat 5% commission
 * charged on Banker winnings only.
 * @type {PayoutRuleset}
 */
export const STANDARD_COMMISSION_RULESET = Object.freeze({
  id: 'standard-commission',
  name: 'Standard 5% Commission',
  description: 'Player and Banker both pay 1:1. A 5% commission is deducted from Banker wins only.',
  tieOdds: 8,
  resolveBankerWin(betAmount) {
    const winningsBeforeCommission = betAmount * 1;
    const commission = round2(winningsBeforeCommission * 0.05);
    const netWinnings = round2(winningsBeforeCommission - commission);
    return { winningsBeforeCommission, commission, netWinnings };
  },
});

/**
 * "No commission" (a.k.a. EZ Baccarat-style) Punto Banco: no commission is
 * ever charged, but a Banker win with a final total of exactly 6 pays only
 * 1:2 instead of 1:1 - that reduced payout on 6 is how the house recoups the
 * edge it would otherwise have taken as commission. All other Banker wins
 * pay full 1:1.
 * @type {PayoutRuleset}
 */
export const NO_COMMISSION_RULESET = Object.freeze({
  id: 'no-commission',
  name: 'No Commission (Banker-6 pays 1:2)',
  description: 'No commission is ever charged, but a winning Banker hand totaling exactly 6 pays only 1:2 instead of 1:1.',
  tieOdds: 8,
  resolveBankerWin(betAmount, bankerTotal) {
    const ratio = bankerTotal === 6 ? 0.5 : 1;
    const winningsBeforeCommission = round2(betAmount * ratio);
    return {
      winningsBeforeCommission,
      commission: 0,
      netWinnings: winningsBeforeCommission,
    };
  },
});

/** Map of all built-in rulesets, keyed by id, handy for UI selection. */
export const PAYOUT_RULESETS = Object.freeze({
  [STANDARD_COMMISSION_RULESET.id]: STANDARD_COMMISSION_RULESET,
  [NO_COMMISSION_RULESET.id]: NO_COMMISSION_RULESET,
});

function round2(n) {
  // Avoid floating point crumbs (e.g. 0.05 * 19 = 0.9500000000000001).
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Resolves a single main-bet wager (Player, Banker, or Tie) against a hand
 * outcome, under the given payout ruleset.
 *
 * @param {PayoutRuleset} ruleset - e.g. STANDARD_COMMISSION_RULESET or NO_COMMISSION_RULESET.
 * @param {Object} params
 * @param {MainBetType} params.betType
 * @param {number} params.betAmount - Must be > 0; pass 0 or omit the bet entirely for "no bet placed".
 * @param {Outcome} params.winner - Hand outcome from rules.determineWinner.
 * @param {number} params.bankerTotal - Banker's final total (0-9); required for Banker bets.
 * @returns {MainBetResult}
 */
export function resolveMainBet(ruleset, { betType, betAmount, winner, bankerTotal }) {
  if (!Object.values(MAIN_BET_TYPES).includes(betType)) {
    throw new Error(`Unknown main bet type: ${betType}`);
  }
  if (!(betAmount > 0)) {
    throw new Error('betAmount must be greater than 0');
  }

  if (betType === MAIN_BET_TYPES.TIE) {
    if (winner === 'TIE') {
      const winningsBeforeCommission = betAmount * ruleset.tieOdds;
      return makeResult({
        betType,
        betAmount,
        won: true,
        pushed: false,
        winningsBeforeCommission,
        commission: 0,
        netWinnings: winningsBeforeCommission,
      });
    }
    return makeResult({ betType, betAmount, won: false, pushed: false });
  }

  if (betType === MAIN_BET_TYPES.PLAYER) {
    if (winner === 'PLAYER') {
      const winningsBeforeCommission = betAmount * 1;
      return makeResult({
        betType,
        betAmount,
        won: true,
        pushed: false,
        winningsBeforeCommission,
        commission: 0,
        netWinnings: winningsBeforeCommission,
      });
    }
    if (winner === 'TIE') {
      // Standard house rule: Player/Banker bets push (stake returned) on a tie.
      return makeResult({ betType, betAmount, won: false, pushed: true });
    }
    return makeResult({ betType, betAmount, won: false, pushed: false });
  }

  // betType === 'BANKER'
  if (winner === 'BANKER') {
    const { winningsBeforeCommission, commission, netWinnings } = ruleset.resolveBankerWin(
      betAmount,
      bankerTotal
    );
    return makeResult({
      betType,
      betAmount,
      won: true,
      pushed: false,
      winningsBeforeCommission,
      commission,
      netWinnings,
    });
  }
  if (winner === 'TIE') {
    return makeResult({ betType, betAmount, won: false, pushed: true });
  }
  return makeResult({ betType, betAmount, won: false, pushed: false });
}
