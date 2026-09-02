/**
 * audioEngine.js
 * ---------------------------------------------------------------------------
 * All SFX in Buriccat are synthesized live via the Web Audio API - there are
 * no sampled audio asset files in this repo (see casino-audio-director's
 * agent definition for the sourcing decision). Every sound here is built
 * from oscillators and/or filtered white-noise bursts shaped with GainNode
 * envelopes; nothing is loaded from disk/network.
 *
 * `createAudioEngine()` returns one instance owning exactly one
 * AudioContext plus two gain buses (SFX and "voice" - the latter is a plain
 * JS volume multiplier applied to `SpeechSynthesisUtterance.volume`, since
 * the Web Speech API doesn't route through the Web Audio graph). Positional
 * sound uses a single StereoPannerNode per voice, panned from a table-space
 * X coordinate - a pragmatic 2-channel approximation rather than a full 3D
 * PannerNode synced to the live camera (see task scope).
 *
 * Lifecycle: create one engine per mounted game screen (see
 * useCasinoAudio.js), and always call `dispose()` on unmount/hand teardown.
 * Every one-shot source node this engine creates is tracked in `activeNodes`
 * and stopped/disconnected on dispose, so no dangling
 * AudioBufferSourceNode/OscillatorNode survives past a hand or the screen
 * itself - the leak this subagent is explicitly on the hook for avoiding.
 */

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

/** Builds one reusable white-noise AudioBuffer. Many independent
 * AudioBufferSourceNodes can reference the same buffer concurrently - only
 * the (cheap, one-shot) source nodes need to be created/torn down per play,
 * never the buffer itself. */
function createNoiseBuffer(ctx, seconds = 1) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Creates one audio engine instance: an AudioContext, its SFX gain bus, a
 * tracked voice-volume multiplier, and every synth "voice" function. The
 * AudioContext itself is created lazily (on the first sound request) so
 * construction never runs afoul of browsers' autoplay-gesture policies -
 * by the time any sound is actually requested (a bet click, a deal click),
 * a real user gesture has already happened.
 */
export function createAudioEngine() {
  /** @type {AudioContext|null} */
  let ctx = null;
  /** @type {GainNode|null} */
  let sfxBus = null;
  /** @type {AudioBuffer|null} */
  let noiseBuffer = null;
  let disposed = false;
  let muted = false;
  /** Independent from the SFX GainNode bus (the Web Speech API doesn't
   * route through Web Audio) but conceptually the same thing: a volume
   * multiplier every spoken utterance is scaled by. */
  let voiceVolume = 1;

  /** Every currently-live one-shot node (oscillators, buffer sources, and
   * the gain/filter/panner nodes hung off them), so dispose() can stop and
   * disconnect all of them even if their natural envelope hasn't finished
   * yet (e.g. the screen unmounts mid-sound). */
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
      noiseBuffer = createNoiseBuffer(ctx, 1);
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

  /** Plays a filtered noise burst: the shared building block behind card
   * slide/flip and the shoe slide. */
  function playNoiseBurst({
    x = 0,
    duration = 0.15,
    peakGain = 0.3,
    filterType = 'bandpass',
    freqFrom = 3000,
    freqTo = 800,
    q = 0.7,
  }) {
    const audioCtx = ensureContext();
    if (!audioCtx || muted) return;
    const now = audioCtx.currentTime;

    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = false;

    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freqFrom, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), now + duration);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + Math.min(0.01, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const panner = audioCtx.createStereoPanner();
    panner.pan.value = panForX(x);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(sfxBus);

    const stopAt = now + duration + 0.02;
    source.start(now);
    source.stop(stopAt);
    scheduleCleanup(source, [source, filter, gain, panner], stopAt);
  }

  /** Plays a single short tonal "ping" - the building block behind chip
   * clinks (layered, several pings per call, varied by stack size). */
  function playPing({ x = 0, frequency = 1600, duration = 0.18, peakGain = 0.25, type = 'triangle', delay = 0 }) {
    const audioCtx = ensureContext();
    if (!audioCtx || muted) return;
    const now = audioCtx.currentTime + delay;

    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.85), now + duration);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const panner = audioCtx.createStereoPanner();
    panner.pan.value = panForX(x);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(sfxBus);

    const stopAt = now + duration + 0.02;
    osc.start(now);
    osc.stop(stopAt);
    scheduleCleanup(osc, [osc, gain, panner], stopAt);
  }

  /** Chip clink, layered/varied by stack size so a $5 bet and a $5000 bet
   * are audibly different - not the same sample replayed. Larger amounts
   * get more layers (a fuller, "thicker" stack sound), staggered slightly
   * and pitched lower (bigger chip stack = deeper clatter), smaller amounts
   * get a single bright, high ping. */
  function chipClink(x = 0, amount = 0) {
    let layerCount;
    let baseFreq;
    let stagger;
    if (amount < 25) {
      layerCount = 1;
      baseFreq = 2000;
      stagger = 0;
    } else if (amount < 100) {
      layerCount = 2;
      baseFreq = 1600;
      stagger = 0.035;
    } else if (amount < 500) {
      layerCount = 3;
      baseFreq = 1200;
      stagger = 0.028;
    } else {
      layerCount = 4;
      baseFreq = 900;
      stagger = 0.022;
    }
    for (let i = 0; i < layerCount; i += 1) {
      const jitter = 1 + (Math.random() - 0.5) * 0.18;
      playPing({
        x,
        frequency: baseFreq * jitter * (1 - i * 0.08),
        duration: 0.16 + i * 0.03,
        peakGain: 0.22 - i * 0.02,
        type: i === 0 ? 'triangle' : 'sine',
        delay: i * stagger,
      });
    }
  }

  /** Card slide: plays whenever a card starts flying, whether the opening
   * deal or a hit (see useCasinoAudio's cardSlide()). */
  function cardSlide(x = 0) {
    playNoiseBurst({
      x,
      duration: 0.14,
      peakGain: 0.22,
      filterType: 'bandpass',
      freqFrom: 3200,
      freqTo: 900,
      q: 1.1,
    });
  }

  /** Card flip/reveal: a short, snappy click - distinct from the longer,
   * softer slide. */
  function cardFlip(x = 0) {
    playNoiseBurst({
      x,
      duration: 0.07,
      peakGain: 0.3,
      filterType: 'bandpass',
      freqFrom: 4200,
      freqTo: 2200,
      q: 2.2,
    });
  }

  /** Shoe slide: a longer, lower, "thicker" whoosh distinct from a per-card
   * slide - plays once at the start of a deal sequence. */
  function shoeSlide(x = 0) {
    playNoiseBurst({
      x,
      duration: 0.34,
      peakGain: 0.2,
      filterType: 'lowpass',
      freqFrom: 1400,
      freqTo: 300,
      q: 0.5,
    });
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
    noiseBuffer = null;
  }

  return {
    cardSlide,
    cardFlip,
    shoeSlide,
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
