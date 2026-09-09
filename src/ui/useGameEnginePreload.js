import { useSyncExternalStore } from 'react';
import { subscribeGameEnginePreload, getGameEnginePreloadSnapshot } from './gameEnginePreload.js';

/** Reads the singleton game-engine preload store (see gameEnginePreload.js)
 * as reactive state - safe to call from multiple components at once (the
 * silent Menu-reached prefetch effect and the visible loading screen both
 * end up observing the same load). */
export function useGameEnginePreload() {
  return useSyncExternalStore(subscribeGameEnginePreload, getGameEnginePreloadSnapshot);
}
