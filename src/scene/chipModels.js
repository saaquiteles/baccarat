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
 * Loading deliberately does NOT go through drei's `useGLTF`/React Suspense:
 * with this many chip instances sharing a handful of denominations (the
 * rack alone mounts 16 <ChipModel>s per denomination), more than one
 * concurrent GLTFLoader parse in flight at once - even for the exact same
 * cached URL - was observed to hang forever with no error in this
 * three@0.182/@react-three/fiber@9/drei@10/React 19 combination (verified
 * directly against raw GLTFLoader.load(), independent of drei or Suspense:
 * two concurrent `new GLTFLoader().load()` calls for the same file never
 * called either their success or error callback, in both the dev server and
 * a production build, while the identical loads run one-after-another
 * resolved instantly). Serializing every load through one queue - only ever
 * one GLTFLoader parse in flight at a time - reliably sidesteps whatever
 * that concurrency issue is, at a trivial cost given how small/few these
 * files are (8 files, tens of KB each).
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

/** Every load is chained onto this single promise so at most one
 * GLTFLoader parse is ever in flight at once - see the module doc comment
 * above for why. */
let loadQueueTail = Promise.resolve();

/**
 * Resolves to the shared (uncloned) THREE.Group for a chip denomination's
 * model, loading it at most once per URL. Never rejects the shared cache
 * entry on failure - a failed load is retried by the next caller instead of
 * poisoning every future request for that denomination.
 * @param {number} value
 * @returns {Promise<import('three').Group>}
 */
export function loadChipModelScene(value) {
  const url = chipModelUrlForValue(value);
  const cached = sceneCache.get(url);
  if (cached) return cached;

  const promise = new Promise((resolve, reject) => {
    loadQueueTail = loadQueueTail.then(
      () =>
        new Promise((advanceQueue) => {
          new GLTFLoader().load(
            url,
            (gltf) => {
              resolve(gltf.scene);
              advanceQueue();
            },
            undefined,
            (error) => {
              sceneCache.delete(url); // let a later call retry instead of caching the failure
              reject(error);
              advanceQueue();
            }
          );
        })
    );
  });

  sceneCache.set(url, promise);
  return promise;
}
