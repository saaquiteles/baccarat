import { useState } from 'react';
import { PAYOUT_RULESETS } from '../game/payouts.js';

/** Quick preset starting-balance amounts, shown as one-click buttons. */
const BALANCE_PRESETS = [500, 1000, 2500, 5000];

/**
 * SettingsScreen.jsx
 * ---------------------------------------------------------------------------
 * Lets the player pick which payout ruleset governs the table (read straight
 * from `PAYOUT_RULESETS` in payouts.js - the only genuinely functional
 * table-rules toggle in this codebase today) and how much they start a
 * session with. Both choices are lifted to App.jsx state; this component is
 * a controlled view over `payoutRulesetId` / `startingBalance` plus their
 * `onChange*` callbacks.
 */
function SettingsScreen({ payoutRulesetId, onChangeRuleset, startingBalance, onChangeStartingBalance, onBack }) {
  // Local text-field draft so the player can clear/retype the balance field
  // without every keystroke needing to already be a valid positive number.
  const [balanceDraft, setBalanceDraft] = useState(String(startingBalance));

  const commitBalance = (raw) => {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      onChangeStartingBalance(Math.floor(parsed));
    } else {
      // Invalid/empty/zero/negative input - snap the field back to the last
      // known-good value rather than letting an invalid balance stick.
      setBalanceDraft(String(startingBalance));
    }
  };

  const selectPreset = (amount) => {
    setBalanceDraft(String(amount));
    onChangeStartingBalance(amount);
  };

  return (
    <div className="settings-screen">
      <header className="settings-header">
        <h1>Settings</h1>
      </header>

      <section className="settings-section" aria-label="Table rules">
        <h2>Table Rules</h2>
        <div className="ruleset-cards" role="radiogroup" aria-label="Payout ruleset">
          {Object.values(PAYOUT_RULESETS).map((ruleset) => (
            <label
              key={ruleset.id}
              className={`ruleset-card${payoutRulesetId === ruleset.id ? ' ruleset-card--selected' : ''}`}
            >
              <input
                type="radio"
                name="payout-ruleset"
                value={ruleset.id}
                checked={payoutRulesetId === ruleset.id}
                onChange={() => onChangeRuleset(ruleset.id)}
              />
              <span className="ruleset-card-name">{ruleset.name}</span>
              <span className="ruleset-card-description">{ruleset.description}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="settings-section" aria-label="Starting balance">
        <h2>Starting Balance</h2>
        <div className="balance-presets">
          {BALANCE_PRESETS.map((amount) => (
            <button
              key={amount}
              type="button"
              className={`balance-preset${startingBalance === amount ? ' balance-preset--selected' : ''}`}
              onClick={() => selectPreset(amount)}
            >
              {amount.toLocaleString()}
            </button>
          ))}
        </div>
        <label className="balance-input-row">
          <span>Custom amount</span>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            className="balance-input"
            value={balanceDraft}
            onChange={(e) => setBalanceDraft(e.target.value)}
            onBlur={(e) => commitBalance(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitBalance(e.currentTarget.value);
            }}
          />
        </label>
      </section>

      <div className="settings-actions">
        <button type="button" className="board-action" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

export default SettingsScreen;
