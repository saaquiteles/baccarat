import { GLTFLoader } from 'three-stdlib';

/**
 * chipModels.js
 * ---------------------------------------------------------------------------
 * Maps a chip denomination value (see src/ui/constants.js CHIP_VALUE_LADDER)
 * to the real 3D model backing it - a set of individually-modeled/textured
 * casino chips (see src/assets/models/chips/), one per denomination, each
 * with its own baked face/edge artwork rather than a flat procedural color.
 * Replaces the earlier plain-cylinder-plus-tinted-material chip geometry.
 *
 * The source model pack ships more denominations (10, 50, 10000, 50000)
 * than this game's CHIP_VALUE_LADDER currently uses - only the ladder's own
 * eight values are copied into src/assets/models/chips/, so this map is
 * exactly the denominations the game can actually stake.
 *
 * Loads are independent per URL (deduped via sceneCache, same as any other
 * fetch-backed cache), NOT funneled through one shared queue - an earlier
 * version serialized every load to work around a suspected GLTFLoader
 * concurrency issue, but that queue had no timeout: the very first queued
 * load never calling back (observed on the live deployed build - only the
 * first denomination's .glb was ever even requested, every later one queued
 * behind it and stuck forever) permanently blocked every chip denomination
 * behind it, with no way to recover. A single stuck/slow load should never
 * be able to take every other chip down with it - see LOAD_TIMEOUT_MS below,
 * the actual fix: whatever the cause of one load never calling back, it
 * can't block anything else, and a timed-out load is evicted from the cache
 * so the next caller gets a fresh retry instead of a permanently poisoned
 * entry.
 */
const CHIP_MODEL_MODULES = import.meta.glob('../assets/models/chips/chip_*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** @type {Record<number, string>} denomination value -> resolved model URL. */
export const CHIP_MODEL_URL_BY_VALUE = Object.fromEntries(
  Object.entries(CHIP_MODEL_MODULES).map(([path, url]) => {
    const value = Number(path.match(/chip_(\d+)\.glb$/)[1]);
    return [value, url];
  })
);

/** Every denomination a real chip model exists for, ascending. */
export const CHIP_MODEL_VALUES = Object.keys(CHIP_MODEL_URL_BY_VALUE)
  .map(Number)
  .sort((a, b) => a - b);

const FALLBACK_VALUE = CHIP_MODEL_VALUES[0];

/** Resolves a denomination to its model URL, falling back to the smallest
 * known denomination's model for any value this pack doesn't cover (should
 * never happen in practice - every caller here sources values from
 * CHIP_VALUE_LADDER/CHIP_DENOMINATION_VALUES, which this pack fully covers -
 * but a model component must resolve to *something* rather than throw). */
export function chipModelUrlForValue(value) {
  return CHIP_MODEL_URL_BY_VALUE[value] ?? CHIP_MODEL_URL_BY_VALUE[FALLBACK_VALUE];
}

/** One decoded scene per URL, shared by every <ChipModel> requesting that
 * denomination - each consumer clones it (see ChipModel.jsx), never mutates
 * the cached original. */
const sceneCache = new Map();

/** How long a single chip model gets to load before it's treated as failed
 * and evicted from the cache. Generous for a file this small (tens of KB)
 * on any real connection - this exists purely as a backstop against a load
 * that never calls back at all, not to police normal network speed. */
const LOAD_TIMEOUT_MS = 15000;

/**
 * Resolves to the shared (uncloned) THREE.Group for a chip denomination's
 * model, loading it at most once per URL. Never leaves a failed/timed-out
 * load poisoning the cache - the entry is evicted so the next caller gets a
 * fresh retry instead of an entry that will never resolve.
 * @param {number} value
 * @returns {Promise<import('three').Group>}
 */
export function loadChipModelScene(value) {
  const url = chipModelUrlForValue(value);
  const cached = sceneCache.get(url);
  if (cached) return cached;

  const promise = new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      sceneCache.delete(url);
      reject(new Error(`Timed out loading chip model: ${url}`));
    }, LOAD_TIMEOUT_MS);

    new GLTFLoader().load(
      url,
      (gltf) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(gltf.scene);
      },
      undefined,
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        sceneCache.delete(url);
        reject(error);
      }
    );
  });

  sceneCache.set(url, promise);
  return promise;
}
