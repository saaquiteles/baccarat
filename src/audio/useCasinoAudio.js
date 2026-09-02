import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createAudioEngine } from './audioEngine.js';
import { VOICE_CUES, resolveVoiceLine } from './voiceLines.js';

/**
 * useCasinoAudio.js
 * ---------------------------------------------------------------------------
 * The one hook GameScreen.jsx (and only GameScreen.jsx) mounts to get every
 * SFX/voice trigger used across a hand, plus the mute toggle. Owns the
 * lifecycle of exactly one audioEngine instance (Web Audio) and every
 * in-flight SpeechSynthesisUtterance for as long as this screen is mounted;
 * both are fully torn down on unmount, and `resetForNewHand()` (call this at
 * the start of every deal/reset) stops any straggling sound/speech left over
 * from a previous hand before the new one's cues start firing.
 *
 * Deliberately additive: this hook does not decide *when* anything happens -
 * every call site in GameScreen.jsx/scene components already has its own
 * event/animation-cue reason to fire (see casino-audio-director's agent
 * definition). This hook only turns "a card started flying at x=0.3" into an
 * actual synthesized sound.
 *
 * Ambient bed: intentionally out of scope this pass (see agent definition).
 * `busVolumes` below is the seam a later pass drops a real ambient loop's
 * gain node into, ducked under `voice`/big result moments, without touching
 * any call site in GameScreen.jsx.
 */
export function useCasinoAudio() {
  // The engine is created *inside* the mount effect below, not via a
  // useState/useRef one-time initializer - React 18/19 StrictMode
  // deliberately double-invokes effects in development (mount -> cleanup ->
  // mount again) to catch exactly this class of bug. An engine created once
  // via useState() persists across that simulated remount, but the first
  // cleanup pass calls dispose() on it - so the second "mount" would be left
  // holding a permanently-disposed engine and every SFX call would silently
  // no-op forever (caught via live instrumentation: chipClink() was reliably
  // invoked with the right arguments, but no AudioContext/oscillator/buffer
  // node was ever actually created). Creating the engine fresh inside the
  // effect means the second mount pass gets a brand new, live instance, and
  // this is also simply the more correct pattern for any real remount, not
  // just StrictMode's simulated one.
  const engineRef = useRef(null);
  const pendingUtterancesRef = useRef(new Set());
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    const engine = createAudioEngine();
    engineRef.current = engine;
    engine.setMuted(muted);
    // Captured once here rather than read fresh inside the cleanup below:
    // not because it could go stale (pendingUtterancesRef.current is the
    // same Set object for this hook's whole lifetime - it's a plain data
    // ref, never reassigned, not a DOM node ref that React might null out),
    // but to satisfy react-hooks/exhaustive-deps' generic "ref read in a
    // cleanup" warning without an inline disable comment.
    const pendingUtterances = pendingUtterancesRef.current;

    return () => {
      // Unmount (or StrictMode's simulated one): stop everything, cancel
      // every pending utterance, close the AudioContext. No dangling
      // AudioBufferSourceNode/OscillatorNode or SpeechSynthesisUtterance
      // callback should survive this screen.
      pendingUtterances.forEach((utterance) => {
        utterance.onend = null;
        utterance.onerror = null;
      });
      pendingUtterances.clear();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      engine.dispose();
      if (engineRef.current === engine) engineRef.current = null;
    };
    // Deliberately empty: this must run exactly once per real mount (and
    // once per StrictMode-simulated mount) - `muted` is read into the fresh
    // engine above, and kept in sync thereafter via toggleMuted() calling
    // engineRef.current.setMuted() directly, not by re-running this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = useCallback((cueId, payload) => {
    const engine = engineRef.current;
    if (!engine || engine.isMuted()) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const text = resolveVoiceLine(cueId, payload);
    if (!text) return;

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.volume = engine.getVoiceVolume();
    utterance.rate = 0.98;
    utterance.pitch = 0.95;

    const set = pendingUtterancesRef.current;
    set.add(utterance);
    const cleanup = () => set.delete(utterance);
    utterance.onend = cleanup;
    utterance.onerror = cleanup;

    window.speechSynthesis.speak(utterance);
  }, []);

  /** Stops all currently-playing/queued sound and speech from a previous
   * hand without tearing down the engine - call at the start of a fresh
   * deal/reset so nothing from a prior hand bleeds into the next one. */
  const resetForNewHand = useCallback(() => {
    engineRef.current?.stopAll();
    pendingUtterancesRef.current.forEach((utterance) => {
      utterance.onend = null;
      utterance.onerror = null;
    });
    pendingUtterancesRef.current.clear();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const toggleMuted = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      engineRef.current?.setMuted(next);
      if (next && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  }, []);

  const sfx = useMemo(
    () => ({
      cardSlide: (x) => engineRef.current?.cardSlide(x),
      cardFlip: (x) => engineRef.current?.cardFlip(x),
      shoeSlide: (x) => engineRef.current?.shoeSlide(x),
      chipClink: (x, amount) => engineRef.current?.chipClink(x, amount),
    }),
    []
  );

  const voice = useMemo(
    () => ({
      betsOpen: () => speak(VOICE_CUES.BETS_OPEN),
      bettingClosed: () => speak(VOICE_CUES.BETTING_CLOSED),
      playerDraw: () => speak(VOICE_CUES.PLAYER_DRAW),
      bankerDraw: () => speak(VOICE_CUES.BANKER_DRAW),
      result: (payload) => speak(VOICE_CUES.RESULT, payload),
    }),
    [speak]
  );

  // Memoized so the returned object is referentially stable across renders
  // that don't actually change anything about it (every field here besides
  // `muted` is itself already stable - see sfx/voice/resetForNewHand above).
  // GameScreen.jsx's callbacks/effects depend on this whole `audio` object;
  // without this memo a fresh object identity on every render would make
  // every dependent useCallback/useEffect re-run on every unrelated
  // re-render (e.g. every card-deal tick), which for the hit-card drawing
  // effect in particular means repeatedly restarting its GSAP timeline -
  // a real bug caught via Playwright instrumentation (a hand with a hit
  // never reached settle).
  return useMemo(
    () => ({ muted, toggleMuted, sfx, voice, resetForNewHand }),
    [muted, toggleMuted, sfx, voice, resetForNewHand]
  );
}

export default useCasinoAudio;
