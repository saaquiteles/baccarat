/**
 * animationTiming.js
 * ---------------------------------------------------------------------------
 * Shared timing/tuning constants for the deal, squeeze, and chip animations.
 * Centralized so GameScreen.jsx's orchestration (the "what/when") and the
 * scene components' tweens (the "how") agree on pacing without duplicating
 * magic numbers in both places.
 */

/** Seconds for one card's flight from the shoe to its hand slot. */
export const CARD_FLIGHT_DURATION = 0.5;

/** Seconds between successive cards starting their deal, in dealing order. */
export const CARD_DEAL_STAGGER = 0.32;

/** Seconds for a single chip's throw/rake arc. */
export const CHIP_FLIGHT_DURATION = 0.55;

/** Drag progress (0-1) a squeeze must cross before it locks in as a reveal. */
export const SQUEEZE_REVEAL_THRESHOLD = 0.72;

/** Screen pixels of upward drag that map to a full (progress = 1) squeeze. */
export const SQUEEZE_DRAG_RANGE_PX = 130;

/** Seconds for an incomplete squeeze to spring back to flat once released. */
export const SQUEEZE_SPRING_BACK_DURATION = 0.35;

/** Seconds the table holds a fully-revealed hand before clearing for the
 * next deal (cards fading/moving off, chips settled). */
export const SETTLE_DISPLAY_DURATION = 1.3;

export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
