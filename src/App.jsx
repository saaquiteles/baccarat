import { useCallback, useEffect, useState } from 'react';
import { PAYOUT_RULESETS, STANDARD_COMMISSION_RULESET } from './game/payouts.js';
import { STARTING_BALANCE } from './ui/constants.js';
import MenuScreen from './ui/MenuScreen.jsx';
import SettingsScreen from './ui/SettingsScreen.jsx';
import GameScreenLoader from './ui/GameScreenLoader.jsx';
import { startGameEnginePreload } from './ui/gameEnginePreload.js';
import './App.css';

/**
 * App.jsx
 * ---------------------------------------------------------------------------
 * A thin screen router: Menu -> (Play -> Game) / (Settings -> back to
 * Menu). No routing library - just a `screen` string and plain conditional
 * rendering. The two settings a player can actually change (which payout
 * ruleset governs the table, and how much they start a session with) live
 * here as lifted state and flow down into GameScreen and SettingsScreen as
 * props; nothing about the game engine itself changed.
 *
 * There's no artificial boot-time "loading" screen: GameScreen (and
 * everything it imports - React Three Fiber, drei, @react-three/
 * postprocessing, three.js, GSAP) is the only heavy, lazily-loaded part of
 * this app, and it isn't needed until Play is actually clicked - see
 * GameScreenLoader.jsx and gameEnginePreload.js for the real, byte-tracked
 * loading screen that covers *that* transition instead. Menu/Settings have
 * zero 3D content and are already in the initial bundle, so showing a
 * "loading" screen before them would just be a fake delay with nothing
 * real to report.
 */
function App() {
  const [screen, setScreen] = useState('menu');
  const [payoutRulesetId, setPayoutRulesetId] = useState(STANDARD_COMMISSION_RULESET.id);
  const [startingBalance, setStartingBalance] = useState(STARTING_BALANCE);

  const goToMenu = useCallback(() => setScreen('menu'), []);
  const goToSettings = useCallback(() => setScreen('settings'), []);
  const goToGame = useCallback(() => setScreen('game'), []);

  // Start fetching GameScreen's chunk as soon as the menu is reachable -
  // well before Play is actually clicked - so it's usually already loaded
  // (or well along) by the time the player commits to playing, instead of
  // the loading screen starting from zero. startGameEnginePreload() is
  // idempotent, so this is safe to call again even if GameScreenLoader
  // already kicked it off itself.
  useEffect(() => {
    if (screen === 'menu' || screen === 'settings') {
      startGameEnginePreload();
    }
  }, [screen]);

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
    <GameScreenLoader
      gameProps={{
        payoutRuleset: PAYOUT_RULESETS[payoutRulesetId],
        startingBalance,
        onExit: goToMenu,
      }}
    />
  );
}

export default App;
