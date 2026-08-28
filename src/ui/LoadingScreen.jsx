import { useEffect } from 'react';
import buriccatLogoStacked from '../assets/logos/buriccat-logo-stacked.svg';

/** How long the loading screen stays up before handing off to the menu. */
const LOADING_DELAY_MS = 1500;

/**
 * LoadingScreen.jsx
 * ---------------------------------------------------------------------------
 * The very first thing the player sees: the stacked logo plus a simple,
 * indeterminate loading indicator. There is no real asset pipeline to track
 * yet, so this just waits out a fixed delay and calls `onDone` - but it's
 * structured as its own timed screen so a later subagent can swap the fixed
 * `setTimeout` for real progress (3D model/texture loading, etc.) without
 * touching anything else in the screen flow.
 */
function LoadingScreen({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, LOADING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <img
        src={buriccatLogoStacked}
        alt="Buriccat"
        className="loading-logo"
      />
      <div className="loading-indicator" aria-hidden="true">
        <span className="loading-chip" />
        <span className="loading-chip" />
        <span className="loading-chip" />
      </div>
      <p className="loading-label">Shuffling the shoe&hellip;</p>
    </div>
  );
}

export default LoadingScreen;
