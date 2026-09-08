import { useState } from 'react';
import { MAIN_BET_TYPES } from '../game/payouts.js';
import {
  SIDE_BETS,
  PLAYER_PAIR_ODDS,
  BANKER_PAIR_ODDS,
  DRAGON_7_ODDS,
  PANDA_8_ODDS,
  PERFECT_PAIR_ODDS,
} from '../game/sideBets.js';

/**
 * BettingBoard.jsx
 * ---------------------------------------------------------------------------
 * Player/Banker/Tie main-bet spots, the five side-bet spots, a chip
 * denomination selector, and the live balance. This component never
 * decides who won or what anything pays - it only lets the player stage a
 * `HandBets`-shaped wager (see stateMachine.js) and stops them from staging
 * more than their balance can cover. The rules engine's PAYOUT event is the
 * only authority on outcomes; this is purely pre-deal bet entry.
 *
 * Side-bet odds shown here are read directly from src/game/sideBets.js
 * (the engine's own constants), not restated, so a payout-table change in
 * the engine can never fall out of sync with what's displayed.
 *
 * `locked` (set by GameScreen while a dealt hand is animating/awaiting its
 * squeeze reveal) disables every staking/clearing control so the bets the
 * engine already resolved for the in-flight hand can never be second-
 * guessed mid-animation; the Deal button's own enablement is handled by the
 * caller via `canDeal`.
 */

const SIDE_BET_ODDS_LABEL = {
  'player-pair': `${PLAYER_PAIR_ODDS}:1`,
  'banker-pair': `${BANKER_PAIR_ODDS}:1`,
  'perfect-pair': `${PERFECT_PAIR_ODDS}:1`,
  'dragon-7': `${DRAGON_7_ODDS}:1`,
  'panda-8': `${PANDA_8_ODDS}:1`,
};

const MAIN_BET_LABELS = {
  [MAIN_BET_TYPES.PLAYER]: { label: 'Player', hint: 'Pays 1:1' },
  [MAIN_BET_TYPES.BANKER]: { label: 'Banker', hint: 'Pays 1:1, 5% commission on wins' },
  [MAIN_BET_TYPES.TIE]: { label: 'Tie', hint: 'Pays 8:1' },
};

// Rendered left-to-right as Player / Tie / Banker - the felt's real-world
// reading order, with Tie's smaller spot sitting between the two main hands
// rather than off to one side - independent of MAIN_BET_TYPES' own key
// order (which the rules engine/tests use and shouldn't have to match a UI
// layout choice).
const MAIN_BET_DISPLAY_ORDER = [MAIN_BET_TYPES.PLAYER, MAIN_BET_TYPES.TIE, MAIN_BET_TYPES.BANKER];

function BettingBoard({
  mainBetAmounts,
  sideBetAmounts,
  chipValues,
  chipValue,
  onSelectChip,
  onPlaceMainBet,
  onPlaceSideBet,
  onClearBets,
  onDeal,
  canDeal,
  locked = false,
}) {
  const totalWagered =
    Object.values(mainBetAmounts).reduce((a, b) => a + b, 0) +
    Object.values(sideBetAmounts).reduce((a, b) => a + b, 0);

  // Side bets collapse behind a toggle on narrow screens (see .betting-board
  // in App.css) - the docked HUD bar can otherwise run out of vertical room
  // before reaching the Deal button, the one control that must never sit
  // below a scroll fold. Defaults open (matching the previous always-shown
  // behavior on anything roomier than a phone); the toggle's own label
  // always states how many side bets are staged, even while collapsed, so
  // collapsing never hides an active wager from view, only the picker.
  const [sideBetsOpen, setSideBetsOpen] = useState(true);
  const stagedSideBetCount = Object.values(sideBetAmounts).filter((amount) => amount > 0).length;

  // A bet spot stays clickable as long as *some* visible chip denomination
  // is affordable - GameScreen's placeMainBet/placeSideBet fall back to the
  // largest affordable one when the selected chipValue itself exceeds the
  // balance (see the spam-click-to-all-in behavior there), so disabling on
  // "the exact selected chip is unaffordable" would block that fallback
  // from ever firing.
  const canPlaceAnyChip = chipValues.length > 0;

  return (
    <section className="betting-board" aria-label="Betting board">
      <div className="balance-bar">
        <div className="balance-display balance-display--wagered">
          <span className="balance-label">Wagered</span>
          <span className="balance-amount">{totalWagered.toLocaleString()}</span>
        </div>
      </div>

      <div className="chip-tray" role="radiogroup" aria-label="Chip denomination">
        {chipValues.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={chipValue === value}
            className={`chip chip--${value}${chipValue === value ? ' chip--selected' : ''}`}
            onClick={() => onSelectChip(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="main-bet-spots">
        {MAIN_BET_DISPLAY_ORDER.map((betType) => {
          const { label, hint } = MAIN_BET_LABELS[betType];
          return (
            <button
              key={betType}
              type="button"
              className={`bet-spot bet-spot--main bet-spot--${betType.toLowerCase()}`}
              onClick={() => onPlaceMainBet(betType)}
              disabled={!canPlaceAnyChip || locked}
              title={locked ? 'Betting is locked while a hand is in progress' : hint}
            >
              <span className="bet-spot-ring">
                <span className="bet-spot-label">{label}</span>
                <span className="bet-spot-hint">{hint}</span>
              </span>
              {mainBetAmounts[betType] > 0 && (
                <span className="bet-spot-amount">{mainBetAmounts[betType]}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="side-bet-group">
        <button
          type="button"
          className="side-bet-toggle"
          onClick={() => setSideBetsOpen((v) => !v)}
          aria-expanded={sideBetsOpen}
        >
          <span aria-hidden="true">{sideBetsOpen ? '▾' : '▸'}</span> Side Bets
          {stagedSideBetCount > 0 && ` · ${stagedSideBetCount} staged`}
        </button>

        {sideBetsOpen && (
          <div className="side-bet-spots">
            {Object.values(SIDE_BETS).map((sideBet) => (
              <button
                key={sideBet.id}
                type="button"
                className="bet-spot bet-spot--side"
                onClick={() => onPlaceSideBet(sideBet.id)}
                disabled={!canPlaceAnyChip || locked}
                title={locked ? 'Betting is locked while a hand is in progress' : sideBet.description}
              >
                <span className="bet-spot-ring">
                  <span className="bet-spot-label">{sideBet.name}</span>
                  <span className="bet-spot-hint">{SIDE_BET_ODDS_LABEL[sideBet.id]}</span>
                </span>
                {sideBetAmounts[sideBet.id] > 0 && (
                  <span className="bet-spot-amount">{sideBetAmounts[sideBet.id]}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="board-actions">
        <button
          type="button"
          className="board-action board-action--clear"
          onClick={onClearBets}
          disabled={totalWagered === 0 || locked}
        >
          Clear Bets
        </button>
        <button type="button" className="board-action board-action--deal" onClick={onDeal} disabled={!canDeal}>
          Deal
        </button>
      </div>
    </section>
  );
}

export default BettingBoard;
