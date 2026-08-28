import { SIDE_BETS } from '../game/sideBets.js';
import { OUTCOME_COLOR } from './constants.js';

/**
 * ResultOverlay.jsx
 * ---------------------------------------------------------------------------
 * Displays the outcome of the most recently resolved hand: the
 * win/loss/tie call, and a per-bet payout breakdown (main bet, including
 * commission where the ruleset charges it, and each side bet). Every
 * number here is read verbatim from the rules engine's PAYOUT event
 * (`payout.mainBets` / `payout.sideBets`, see stateMachine.js) - nothing on
 * this screen is computed from cards or odds a second time.
 */

function BetRow({ label, betAmount, won, pushed, breakdownDetail, netWinnings, totalReturned }) {
  const outcomeLabel = won ? 'Win' : pushed ? 'Push' : 'Lose';
  const outcomeClass = won ? 'outcome-win' : pushed ? 'outcome-push' : 'outcome-lose';
  return (
    <tr className={outcomeClass}>
      <td className="bet-row-label">{label}</td>
      <td className="bet-row-amount">{betAmount}</td>
      <td className="bet-row-outcome">{outcomeLabel}</td>
      <td className="bet-row-detail">{breakdownDetail}</td>
      <td className="bet-row-net">{won ? `+${netWinnings}` : pushed ? '0' : `-${betAmount}`}</td>
      <td className="bet-row-returned">{totalReturned}</td>
    </tr>
  );
}

function ResultOverlay({ result, payout, visible, onDismiss }) {
  // Rendered as a compact toast overlaid on top of the dashboard (see
  // .result-overlay in App.css) - it never reserves layout space, so there
  // is no "empty" placeholder state to render here.
  if (!visible || !result || !payout) {
    return null;
  }

  const totalStaked =
    payout.mainBets.reduce((a, b) => a + b.betAmount, 0) +
    payout.sideBets.reduce((a, b) => a + b.betAmount, 0);
  const totalReturned =
    payout.mainBets.reduce((a, b) => a + b.totalReturned, 0) +
    payout.sideBets.reduce((a, b) => a + b.totalReturned, 0);
  const netChange = totalReturned - totalStaked;

  return (
    <section className="result-overlay" aria-label="Hand result">
      <button type="button" className="result-overlay-dismiss" onClick={onDismiss} aria-label="Dismiss result">
        &times;
      </button>

      <div className="result-banner" style={{ '--mark-color': OUTCOME_COLOR[result.winner] }}>
        <span className="result-winner">{result.winner} WINS</span>
        <span className="result-totals">
          Player {result.playerTotal} &ndash; Banker {result.bankerTotal}
        </span>
        {(payout.mainBets.length > 0 || payout.sideBets.length > 0) && (
          <span className={`result-net ${netChange >= 0 ? 'result-net--positive' : 'result-net--negative'}`}>
            {netChange >= 0 ? `+${netChange}` : netChange} this hand
          </span>
        )}
      </div>

      {(payout.mainBets.length > 0 || payout.sideBets.length > 0) && (
        <table className="payout-table">
          <thead>
            <tr>
              <th>Bet</th>
              <th>Amount</th>
              <th>Result</th>
              <th>Detail</th>
              <th>Net</th>
              <th>Returned</th>
            </tr>
          </thead>
          <tbody>
            {payout.mainBets.map((bet) => (
              <BetRow
                key={bet.betType}
                label={bet.betType}
                betAmount={bet.betAmount}
                won={bet.won}
                pushed={bet.pushed}
                netWinnings={bet.netWinnings}
                totalReturned={bet.totalReturned}
                breakdownDetail={
                  bet.commission > 0
                    ? `${bet.winningsBeforeCommission} gross - ${bet.commission} commission`
                    : bet.won
                      ? `${bet.winningsBeforeCommission} gross`
                      : bet.pushed
                        ? 'stake returned'
                        : '-'
                }
              />
            ))}
            {payout.sideBets.map((bet) => (
              <BetRow
                key={bet.betType}
                label={SIDE_BETS[bet.betType]?.name ?? bet.betType}
                betAmount={bet.betAmount}
                won={bet.won}
                pushed={false}
                netWinnings={bet.netWinnings}
                totalReturned={bet.totalReturned}
                breakdownDetail={bet.won ? `${bet.odds}:1` : '-'}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default ResultOverlay;
