import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { PAYOUT_RULESETS, STANDARD_COMMISSION_RULESET } from './game/payouts.js';
import { STARTING_BALANCE } from './ui/constants.js';
import LoadingScreen from './ui/LoadingScreen.jsx';
import MenuScreen from './ui/MenuScreen.jsx';
import SettingsScreen from './ui/SettingsScreen.jsx';
import './App.css';

// GameScreen (and everything it imports - React Three Fiber, drei,
// @react-three/postprocessing, three.js, GSAP) is by far the heaviest branch
// of the dependency graph, and is never needed until the player actually
// clicks Play - the Loading/Menu/Settings screens have zero 3D content. Code
// -splitting it behind a dynamic import means the ~1.4 MB 3D/animation
// payload is fetched lazily (and can start warming up in the background the
// moment the menu is visible) instead of blocking/bloating the very first
// paint of the loading screen. See vite.config.js's manualChunks for how the
// underlying vendor libraries are further split for long-term browser
// caching once this chunk itself loads.
const importGameScreen = () => import('./ui/GameScreen.jsx');
const GameScreen = lazy(importGameScreen);

/** Minimal, dependency-free fallback shown only for the brief window (or on
 * a slow connection, longer) between clicking Play and the GameScreen chunk
 * finishing its dynamic import - deliberately not LoadingScreen, since that
 * component's fixed-delay/onDone contract is for the app's initial boot
 * screen, not a Suspense boundary. */
function GameScreenLoadingFallback() {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-indicator" aria-hidden="true">
        <span className="loading-chip" />
        <span className="loading-chip" />
        <span className="loading-chip" />
      </div>
      <p className="loading-label">Setting up the table&hellip;</p>
    </div>
  );
}

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

  // Start fetching the GameScreen chunk as soon as the menu is reachable
  // (well before Play is actually clicked) so the dynamic import below has
  // usually already resolved by the time the player commits to playing,
  // instead of visibly stalling on the fallback screen.
  useEffect(() => {
    if (screen === 'menu' || screen === 'settings') {
      importGameScreen();
    }
  }, [screen]);

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
    <Suspense fallback={<GameScreenLoadingFallback />}>
      <GameScreen
        payoutRuleset={PAYOUT_RULESETS[payoutRulesetId]}
        startingBalance={startingBalance}
        onExit={goToMenu}
      />
    </Suspense>
  );
}

export default App;
