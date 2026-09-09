import { useEffect, useState } from 'react';

const ZERO_INSETS = { top: 0, bottom: 0 };

/**
 * useHudInsets.js
 * ---------------------------------------------------------------------------
 * Measures the live pixel height of the top bar and bottom dock - the two
 * opaque HUD layers that sit *on top of* the full-bleed 3D canvas rather
 * than taking layout space away from it (see .hud-topbar/.hud-bottom-dock
 * in App.css) - so CameraRig.jsx can keep the felt/cards framed within
 * whatever canvas area is actually still visible, instead of centering the
 * shot in the full canvas and letting the docked betting board's own
 * height (which grows a lot on a narrow phone once side bets/roadmaps
 * stack up) silently cover the cards. Updates live via ResizeObserver, so
 * expanding/collapsing the side-bet or roadmap picker mid-session
 * reframes the table immediately rather than only on the next resize.
 */
export function useHudInsets(topRef, bottomRef) {
  const [insets, setInsets] = useState(ZERO_INSETS);

  useEffect(() => {
    const topEl = topRef.current;
    const bottomEl = bottomRef.current;
    if (!topEl || !bottomEl) return undefined;

    const measure = () => {
      setInsets({
        top: topEl.getBoundingClientRect().height,
        bottom: bottomEl.getBoundingClientRect().height,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(topEl);
    observer.observe(bottomEl);
    return () => observer.disconnect();
  }, [topRef, bottomRef]);

  return insets;
}
