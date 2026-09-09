/**
 * gameEnginePreload.js
 * ---------------------------------------------------------------------------
 * Owns the one real async cost in Buriccat's boot sequence: fetching and
 * evaluating GameScreen's lazy chunk (three.js/React Three Fiber/drei/
 * @react-three/postprocessing/GSAP - see vite.config.js's manualChunks
 * comment for why it's a single ~1.2 MB chunk). There are no texture/model/
 * sample-audio files anywhere in this project to preload - table materials
 * are procedural (src/scene/materials.js) and every sound is synthesized
 * live via the Web Audio API (src/audio/audioEngine.js) - so this chunk load
 * is the only thing a loading screen can honestly measure. See PRODUCT.md's
 * "never fabricate progress" principle.
 *
 * A plain external store (subscribe/getSnapshot, read via useSyncExternalStore
 * in useGameEnginePreload.js) rather than a hook that owns its own state,
 * because the load itself must be a *singleton*: the silent background
 * prefetch kicked off the moment the Menu is reachable (see App.jsx) and the
 * visible, user-facing loading screen shown after Play is clicked need to
 * observe the exact same in-flight load and byte-progress numbers, not race
 * two independent dynamic imports against each other.
 */

let state = { loaded: 0, total: 0, done: false, component: null, error: null };
let started = false;
const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribeGameEnginePreload(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGameEnginePreloadSnapshot() {
  return state;
}

/** Tracks live, in-flight byte progress for a set of already-discovered
 * chunk URLs. The Resource Timing API only ever reports *completed*
 * transfers, never a partial one mid-flight, so genuine "45% loaded"
 * numbers require a real ReadableStream read loop against each URL's own
 * response - this fetch() rides alongside (and is coalesced by the browser
 * with) the module loader's own fetch of the same same-origin URL, it does
 * not replace it. */
function trackBytes(urls) {
  const sizes = new Map(urls.map((url) => [url, { loaded: 0, total: null }]));

  const report = () => {
    let loaded = 0;
    let total = 0;
    let knowsEveryTotal = true;
    sizes.forEach((entry) => {
      loaded += entry.loaded;
      if (entry.total == null) knowsEveryTotal = false;
      else total += entry.total;
    });
    // Only report a percentage once every tracked file's Content-Length is
    // known - a partial total would understate how much is really left.
    if (knowsEveryTotal && total > 0) setState({ loaded, total });
  };

  urls.forEach((url) => {
    fetch(url)
      .then(async (response) => {
        const contentLength = Number(response.headers.get('content-length'));
        if (contentLength) sizes.get(url).total = contentLength;
        if (!response.body) return;
        const reader = response.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          sizes.get(url).loaded += value.byteLength;
          report();
        }
      })
      .catch(() => {
        // Progress-metering only - the real load rides the dynamic import()
        // in startGameEnginePreload, which has its own error handling.
      });
  });
}

/** Idempotent - safe to call from both the silent Menu-reached prefetch and
 * the Play-triggered loading screen; only the first call does any real
 * work, every later call is a no-op. */
export function startGameEnginePreload() {
  if (started) return;
  started = true;

  const existingHrefs = new Set(
    Array.from(document.head.querySelectorAll('link[rel="modulepreload"]')).map((link) => link.href)
  );

  const modulePromise = import('./GameScreen.jsx');

  // A production Vite build injects a <link rel="modulepreload"> for every
  // chunk a dynamic import needs *before* fetching any of them, synchronously
  // as part of resolving the import() call above - so the exact, complete
  // set of files this load will fetch already exists in the DOM one
  // microtask later. If the chunk was already preloaded earlier (or this is
  // the dev server, which never bundles/preloads), no new link appears and
  // progress honestly stays indeterminate rather than a fabricated number.
  queueMicrotask(() => {
    const newLinks = Array.from(document.head.querySelectorAll('link[rel="modulepreload"]')).filter(
      (link) => !existingHrefs.has(link.href)
    );
    if (newLinks.length > 0) trackBytes(newLinks.map((link) => link.href));
  });

  modulePromise
    .then((mod) => setState({ component: mod.default, done: true }))
    .catch((error) => setState({ error, done: true }));
}
