import { useCallback, useState } from 'react';
import { PAYOUT_RULESETS, STANDARD_COMMISSION_RULESET } from './game/payouts.js';
import { STARTING_BALANCE } from './ui/constants.js';
import LoadingScreen from './ui/LoadingScreen.jsx';
import MenuScreen from './ui/MenuScreen.jsx';
import SettingsScreen from './ui/SettingsScreen.jsx';
import GameScreen from './ui/GameScreen.jsx';
import './App.css';

/**
 * App.jsx
 * ---------------------------------------------------------------------------
 * A thin screen router: Loading -> Menu -> (Play -> Game) / (Settings -> back
 * to Menu). No routing library - just a `screen` string and plain
 * conditional rendering. The two settings a player can actually change
 * (which payout ruleset governs the table, and how much they start a
 * session with) live here as lifted state and flow down into GameScreen and
 * SettingsScreen as props; nothing about the game engine itself changed.
 */
function App() {
  const [screen, setScreen] = useState('loading');
  const [payoutRulesetId, setPayoutRulesetId] = useState(STANDARD_COMMISSION_RULESET.id);
  const [startingBalance, setStartingBalance] = useState(STARTING_BALANCE);

  const goToMenu = useCallback(() => setScreen('menu'), []);
  const goToSettings = useCallback(() => setScreen('settings'), []);
  const goToGame = useCallback(() => setScreen('game'), []);

  if (screen === 'loading') {
    return <LoadingScreen onDone={goToMenu} />;
  }

  if (screen === 'menu') {
    return <MenuScreen onPlay={goToGame} onOpenSettings={goToSettings} />;
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        payoutRulesetId={payoutRulesetId}
        onChangeRuleset={setPayoutRulesetId}
        startingBalance={startingBalance}
        onChangeStartingBalance={setStartingBalance}
        onBack={goToMenu}
      />
    );
  }

  // screen === 'game'
  return (
    <GameScreen
      payoutRuleset={PAYOUT_RULESETS[payoutRulesetId]}
      startingBalance={startingBalance}
      onExit={goToMenu}
    />
  );
}

export default App;
