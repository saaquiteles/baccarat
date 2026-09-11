import { useEffect, useRef } from 'react';

/**
 * useBackgroundMusic.js
 * ---------------------------------------------------------------------------
 * Plays a single looping ambient music track for the whole app session (one
 * HTMLAudioElement created once, never recreated across Menu <-> Settings <->
 * Game transitions) at a caller-supplied target volume, ramping smoothly
 * between volumes rather than snapping so a screen change doesn't produce an
 * audible pop.
 *
 * Deliberately a plain <audio> element, not routed through audioEngine.js's
 * Web Audio graph: that engine is created/torn down per GameScreen mount (see
 * useCasinoAudio.js), which would restart the track's playback position on
 * every screen change. This hook is mounted once at the App root instead, so
 * the same track keeps playing continuously through the whole session -
 * only its volume changes with the current screen.
 */

const FADE_DURATION_MS = 600;
const FADE_STEP_MS = 40;

export function useBackgroundMusic(src, targetVolume) {
  const audioRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    const tryPlay = () => {
      audio.play().then(() => {
        startedRef.current = true;
      }).catch(() => {
        // Autoplay blocked until a real user gesture - retried below.
      });
    };
    tryPlay();

    // Browsers block autoplay before any user interaction; if the initial
    // play() attempt was rejected, start on the first click/keypress/touch
    // anywhere in the app instead (fires once, harmlessly re-tries even if
    // playback already started on its own).
    const onFirstGesture = () => {
      if (!startedRef.current) tryPlay();
    };
    window.addEventListener('pointerdown', onFirstGesture);
    window.addEventListener('keydown', onFirstGesture);

    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
    // Deliberately mount-once: `src` is a static asset import, never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    const startVolume = audio.volume;
    const steps = Math.max(1, Math.round(FADE_DURATION_MS / FADE_STEP_MS));
    let step = 0;
    fadeIntervalRef.current = setInterval(() => {
      step += 1;
      const t = Math.min(1, step / steps);
      audio.volume = startVolume + (targetVolume - startVolume) * t;
      if (t >= 1) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }, FADE_STEP_MS);

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, [targetVolume]);
}

export default useBackgroundMusic;
