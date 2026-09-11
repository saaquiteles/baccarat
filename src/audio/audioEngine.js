/**
 * audioEngine.js
 * ---------------------------------------------------------------------------
 * Card and chip SFX are real sample playback - a CC0 pack from Kenney.nl
 * (see src/assets/audio/KENNEY_LICENSE.txt), decoded once per URL and
 * replayed through fresh AudioBufferSourceNodes. Every *category* (card
 * slide, card place/flip, shoe shove, four chip-amount tiers) has several
 * variant files; each call picks one at random plus a small playback-rate
 * jitter, so the same action never sounds like the exact same recording
 * twice in a row. Dealer/announcer speech is still the Web Speech API (see
 * useCasinoAudio.js/announcerVoice.js) - it doesn't route through this
 * engine's Web Audio graph at all.
 *
 * `createAudioEngine()` returns one instance owning exactly one
 * AudioContext plus the SFX gain bus, a tracked voice-volume multiplier
 * (the Web Speech API's own volume knob, kept in sync here for a single
 * mute switch), and every sample-based "voice" function below. Positional
 * sound uses a single StereoPannerNode per voice, panned from a table-space
 * X coordinate - a pragmatic 2-channel approximation rather than a full 3D
 * PannerNode synced to the live camera (see task scope).
 *
 * Lifecycle: create one engine per mounted game screen (see
 * useCasinoAudio.js), and always call `dispose()` on unmount/hand teardown.
 * Every one-shot source node this engine creates is tracked in `activeNodes`
 * and stopped/disconnected on dispose, so no dangling AudioBufferSourceNode
 * survives past a hand or the screen itself - the leak this subagent is
 * explicitly on the hook for avoiding. Decoded AudioBuffers themselves are
 * cached at module scope (keyed by URL), not per engine instance - they're
 * immutable data, safe to replay through any context, and decoding the same
 * ~10-30KB file again on every new hand/screen mount would be pure waste.
 */

// Each import.meta.glob call needs a literal string pattern (Vite resolves
// these at build time, not at runtime) - that's why this isn't a single
// helper function parameterized by pattern. `eager: true` bundles every
// variant upfront (they're tiny - ~400KB total across all categories) so
// there's no separate lazy-chunk fetch waterfall the first time a sound is
// needed; `import: 'default'` gives back each file's resolved URL, the same
// thing a plain `import x from './file.ogg'` would.
const CARD_SLIDE_SAMPLES = Object.values(
  import.meta.glob('../assets/audio/card-slide-*.ogg', { eager: true, import: 'default' })
);
const CARD_PLACE_SAMPLES = Object.values(
  import.meta.glob('../assets/audio/card-place-*.ogg', { eager: true, import: 'default' })
);
const CARD_SHOVE_SAMPLES = Object.values(
  import.meta.glob('../assets/audio/card-shove-*.ogg', { eager: true, import: 'default' })
);
const CARD_SHUFFLE_SAMPLES = Object.values(
  import.meta.glob('../assets/audio/card-shuffle.ogg', { eager: true, import: 'default' })
);
const CHIP_LAY_SAMPLES = Object.values(
  import.meta.glob('../assets/audio/chip-lay-*.ogg', { eager: true, import: 'default' })
);
const CHIP_HANDLE_SAMPLES = Object.values(
  import.meta.glob('../assets/audio/chips-handle-*.ogg', { eager: true, import: 'default' })
);
const CHIP_COLLIDE_SAMPLES = Object.values(
  import.meta.glob('../assets/audio/chips-collide-*.ogg', { eager: true, import: 'default' })
);
const CHIP_STACK_SAMPLES = Object.values(
  import.meta.glob('../assets/audio/chips-stack-*.ogg', { eager: true, import: 'default' })
);

const ALL_SAMPLE_URLS = [
  ...CARD_SLIDE_SAMPLES,
  ...CARD_PLACE_SAMPLES,
  ...CARD_SHOVE_SAMPLES,
  ...CARD_SHUFFLE_SAMPLES,
  ...CHIP_LAY_SAMPLES,
  ...CHIP_HANDLE_SAMPLES,
  ...CHIP_COLLIDE_SAMPLES,
  ...CHIP_STACK_SAMPLES,
];

/** Table X range (meters) used to normalize an anchor's X into a -1..1 stereo
 * pan value. Matches src/scene/layout.js's TABLE.width (1.7m) with a little
 * headroom trimmed off either edge so even the widest anchors (side-bet
 * spots at x = +/-0.6) don't pin hard to a single ear. */
const PAN_X_RANGE = 0.8;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Maps a table-space X coordinate (see scene/layout.js anchors) to a -1..1
 * stereo pan value. x=0 (table center) is dead center. */
export function panForX(x = 0) {
  return clamp(x / PAN_X_RANGE, -1, 1);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Decoded-AudioBuffer cache, keyed by sample URL and shared across every
 * engine instance for the page's whole lifetime - a plain data object, not
 * bound to any one AudioContext, so re-decoding on every hand/screen remount
 * would be pure waste. `decodeAudioData` needs *a* context to decode with,
 * but the resulting buffer is safe to hand to a source node on any other
 * context afterward. */
const bufferPromiseCache = new Map();

function loadBuffer(ctx, url) {
  let promise = bufferPromiseCache.get(url);
  if (!promise) {
    promise = fetch(url)
      .then((response) => response.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data));
    bufferPromiseCache.set(url, promise);
  }
  return promise;
}

/** Fire-and-forget: starts decoding every known sample the moment a real
 * AudioContext exists, so individual sfx calls later almost never have to
 * wait on a fresh decode - only the very first sound of a session risks
 * that race, and it fails silent (see playSample) rather than blocking. */
function preloadAllSamples(ctx) {
  ALL_SAMPLE_URLS.forEach((url) => {
    loadBuffer(ctx, url).catch(() => {
      // A missing/corrupt sample is a build-time problem, not a runtime one
      // to surface to the player - this engine never throws from an SFX call.
    });
  });
}

/**
 * Creates one audio engine instance: an AudioContext, its SFX gain bus, a
 * tracked voice-volume multiplier, and every sample-playback "voice"
 * function. The AudioContext itself is created lazily (on the first sound
 * request) so construction never runs afoul of browsers' autoplay-gesture
 * policies - by the time any sound is actually requested (a bet click, a
 * deal click), a real user gesture has already happened.
 */
export function createAudioEngine() {
  /** @type {AudioContext|null} */
  let ctx = null;
  /** @type {GainNode|null} */
  let sfxBus = null;
  let disposed = false;
  let muted = false;
  /** Independent from the SFX GainNode bus (the Web Speech API doesn't
   * route through Web Audio) but conceptually the same thing: a volume
   * multiplier every spoken utterance is scaled by. */
  let voiceVolume = 1;

  /** Every currently-live one-shot node (buffer sources and the gain/panner
   * nodes hung off them), so dispose() can stop and disconnect all of them
   * even if their natural envelope hasn't finished yet (e.g. the screen
   * unmounts mid-sound). */
  const activeNodes = new Set();

  function ensureContext() {
    if (disposed) return null;
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null; // Web Audio unsupported - fail silent, never throw.
      ctx = new Ctor();
      sfxBus = ctx.createGain();
      sfxBus.gain.value = muted ? 0 : 1;
      sfxBus.connect(ctx.destination);
      preloadAllSamples(ctx);
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function track(node) {
    activeNodes.add(node);
    return node;
  }

  function untrack(node) {
    activeNodes.delete(node);
  }

  /** Registers a chain's terminal source node so it self-untracks once its
   * envelope naturally finishes, and stops+disconnects everything in the
   * chain up front if the engine is torn down first. */
  function scheduleCleanup(sourceNode, chainNodes, stopAt) {
    track(sourceNode);
    const cleanup = () => {
      untrack(sourceNode);
      chainNodes.forEach((n) => {
        try {
          n.disconnect();
        } catch {
          /* already disconnected */
        }
      });
    };
    sourceNode.onended = cleanup;
    // Belt-and-suspenders: onended isn't guaranteed to fire in every browser
    // in every case (e.g. a context that's about to close), so also clean up
    // shortly after the scheduled stop time.
    if (typeof stopAt === 'number') {
      setTimeout(cleanup, Math.max(0, (stopAt - (ctx?.currentTime ?? 0)) * 1000) + 250);
    }
  }

  /** Plays one randomly-picked sample from `urls` through the panner/SFX
   * bus - the shared building block behind every card/chip sound below.
   * `delay` (seconds) staggers layered chip plays; `playbackRateJitter`
   * randomizes pitch slightly (+/- the given fraction) so repeated plays of
   * the same underlying file don't sound identical back-to-back. */
  function playSample(urls, { x = 0, peakGain = 0.85, delay = 0, playbackRateJitter = 0.05 } = {}) {
    if (!urls || urls.length === 0) return;
    const audioCtx = ensureContext();
    if (!audioCtx || muted) return;
    const url = pickRandom(urls);

    loadBuffer(audioCtx, url)
      .then((buffer) => {
        // The engine may have been muted or torn down while this sample was
        // still decoding - re-check rather than trusting the guard above.
        if (disposed || muted || !sfxBus) return;

        const now = audioCtx.currentTime + delay;
        const playbackRate = 1 + (Math.random() * 2 - 1) * playbackRateJitter;

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;

        const gain = audioCtx.createGain();
        gain.gain.value = peakGain;

        const panner = audioCtx.createStereoPanner();
        panner.pan.value = panForX(x);

        source.connect(gain);
        gain.connect(panner);
        panner.connect(sfxBus);

        const stopAt = now + buffer.duration / playbackRate + 0.05;
        source.start(now);
        scheduleCleanup(source, [source, gain, panner], stopAt);
      })
      .catch(() => {
        // Decode/network failure - fail silent, matching this engine's
        // existing philosophy (never throw from an SFX call site).
      });
  }

  /** Chip clink, varied by stack size so a $5 bet and a $500 bet are
   * audibly different - not the same sample replayed. Each tier reaches for
   * a different Kenney sample category (a single light "lay" for a small
   * bet, up through several staggered "stack" plays for a big one) rather
   * than just changing volume, so bigger bets read as a fuller stack, not
   * just a louder one. */
  function chipClink(x = 0, amount = 0) {
    let urls;
    let layerCount;
    let stagger;
    if (amount < 25) {
      urls = CHIP_LAY_SAMPLES;
      layerCount = 1;
      stagger = 0;
    } else if (amount < 100) {
      urls = CHIP_HANDLE_SAMPLES;
      layerCount = 2;
      stagger = 0.04;
    } else if (amount < 500) {
      urls = CHIP_COLLIDE_SAMPLES;
      layerCount = 3;
      stagger = 0.032;
    } else {
      urls = CHIP_STACK_SAMPLES;
      layerCount = 4;
      stagger = 0.026;
    }
    for (let i = 0; i < layerCount; i += 1) {
      playSample(urls, { x, peakGain: 0.85 - i * 0.06, delay: i * stagger });
    }
  }

  /** Card slide: plays whenever a card starts flying, whether the opening
   * deal or a hit (see useCasinoAudio's cardSlide()). */
  function cardSlide(x = 0) {
    playSample(CARD_SLIDE_SAMPLES, { x, peakGain: 0.8 });
  }

  /** Card flip/reveal: a crisp placement sound - distinct from the longer
   * in-flight slide. */
  function cardFlip(x = 0) {
    playSample(CARD_PLACE_SAMPLES, { x, peakGain: 0.85 });
  }

  /** Shoe slide: a longer, "thicker" push distinct from a per-card slide -
   * plays once at the start of a deal sequence. */
  function shoeSlide(x = 0) {
    playSample(CARD_SHOVE_SAMPLES, { x, peakGain: 0.8 });
  }

  /** Shoe reshuffle: plays once whenever the shoe is replaced with a fresh
   * one (see GameScreen.jsx's needsReshuffle handling in deal()). */
  function shuffle(x = 0) {
    playSample(CARD_SHUFFLE_SAMPLES, { x, peakGain: 0.7 });
  }

  function setMuted(nextMuted) {
    muted = nextMuted;
    voiceVolume = nextMuted ? 0 : 1;
    if (sfxBus && ctx) {
      const now = ctx.currentTime;
      sfxBus.gain.cancelScheduledValues(now);
      sfxBus.gain.linearRampToValueAtTime(nextMuted ? 0 : 1, now + 0.05);
    }
  }

  function isMuted() {
    return muted;
  }

  function getVoiceVolume() {
    return voiceVolume;
  }

  /** Stops and disconnects every currently-live node immediately (used on
   * hand reset, not just final unmount) without tearing down the
   * AudioContext itself, so the next hand can keep using it. */
  function stopAll() {
    activeNodes.forEach((node) => {
      try {
        node.onended = null;
        node.stop?.(0);
      } catch {
        /* already stopped */
      }
      try {
        node.disconnect();
      } catch {
        /* already disconnected */
      }
    });
    activeNodes.clear();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopAll();
    if (ctx) {
      ctx.close().catch(() => {});
    }
    ctx = null;
    sfxBus = null;
  }

  return {
    cardSlide,
    cardFlip,
    shoeSlide,
    shuffle,
    chipClink,
    setMuted,
    isMuted,
    getVoiceVolume,
    stopAll,
    dispose,
    /** Exposed for verification/instrumentation only (tests, QA probes) -
     * not used by app code. */
    _debugGetContext: () => ctx,
    _debugActiveNodeCount: () => activeNodes.size,
  };
}
