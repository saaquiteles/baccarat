import { useEffect, useState } from 'react';
import { startGameEnginePreload } from './gameEnginePreload.js';
import { useGameEnginePreload } from './useGameEnginePreload.js';
import EngineLoadingScreen from './EngineLoadingScreen.jsx';

// Once GameScreen's module has resolved, it's mounted immediately but stays
// hidden under the loading overlay for this long before the crossfade
// starts - a short grace period for its <Canvas> to get a few real paints
// in (shader compile, first frame) while still hidden, so the reveal never
// uncovers a black/empty canvas mid-warm-up.
const REVEAL_GRACE_MS = 300;
// How long the crossfade itself takes - kept in sync with the CSS
// transition duration on .engine-loader-game/.engine-loader-overlay in
// App.css.
const FADE_MS = 500;

/**
 * GameScreenLoader.jsx
 * ---------------------------------------------------------------------------
 * Sits where a <Suspense fallback={...}><GameScreen/></Suspense> pair used
 * to: renders EngineLoadingScreen while GameScreen's lazy chunk loads, then
 * mounts the real GameScreen underneath it (still invisible) and crossfades
 * the two once it's had a moment to render for real - see the constants
 * above. Suspense's own fallback swap is abrupt (unmount the instant the
 * lazy factory's promise resolves); this manual version is what makes a
 * smooth fade - and the brief hidden-render grace period - possible.
 */
function GameScreenLoader({ gameProps }) {
  const preload = useGameEnginePreload();
  const [revealing, setRevealing] = useState(false);
  const [overlayGone, setOverlayGone] = useState(false);

  // Safe even if App.jsx's own Menu/Settings-reached prefetch already
  // started this - startGameEnginePreload() is idempotent.
  useEffect(() => {
    startGameEnginePreload();
  }, []);

  useEffect(() => {
    if (!preload.component) return undefined;
    const timer = setTimeout(() => setRevealing(true), REVEAL_GRACE_MS);
    return () => clearTimeout(timer);
  }, [preload.component]);

  useEffect(() => {
    if (!revealing) return undefined;
    const timer = setTimeout(() => setOverlayGone(true), FADE_MS);
    return () => clearTimeout(timer);
  }, [revealing]);

  const GameScreen = preload.component;

  return (
    <div className="engine-loader">
      {GameScreen && (
        <div className={`engine-loader-game${revealing ? ' engine-loader-game--visible' : ''}`}>
          <GameScreen {...gameProps} />
        </div>
      )}
      {!overlayGone && (
        <div className={`engine-loader-overlay${revealing ? ' engine-loader-overlay--fading' : ''}`}>
          <EngineLoadingScreen loaded={preload.loaded} total={preload.total} ready={!!GameScreen} />
        </div>
      )}
    </div>
  );
}

export default GameScreenLoader;
