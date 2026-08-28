/**
 * chipBreakdown.js
 * ---------------------------------------------------------------------------
 * Pure data helper: turns a staged bet amount into a list of physical chips
 * (denomination + color) to render as a stack. No Three.js/R3F/GSAP imports
 * here on purpose - this is "what to draw", not "how to draw it", so it can
 * be unit-tested or reused by a chip-flight animation without touching the
 * renderer.
 *
 * Denomination colors are read from materials.js (CHIP_DENOMINATION_COLORS)
 * rather than redefined, so the 3D chip palette never drifts from the 2D
 * betting board's.
 */

/** Hard visual cap on how many chips a single stack ever renders - a $5,000
 * bet shouldn't spawn 5,000 chip meshes. Denominations are greedily applied
 * largest-first, so the cap only ever trims low-value filler, never the
 * chips that best represent the bet's size. */
export const CHIP_STACK_VISUAL_CAP = 18;

/**
 * @param {number} amount - Staged bet amount, in the same units as
 *   CHIP_DENOMINATION_COLORS' `value` fields.
 * @param {ReadonlyArray<{value: number, color: string}>} denominationColors
 * @param {number} [cap]
 * @returns {Array<{value: number, color: string}>} One entry per physical
 *   chip, ordered highest-denomination first (bottom of the stack).
 */
export function computeChipBreakdown(amount, denominationColors, cap = CHIP_STACK_VISUAL_CAP) {
  if (!(amount > 0)) return [];

  const sortedDesc = [...denominationColors].sort((a, b) => b.value - a.value);
  const smallestValue = sortedDesc[sortedDesc.length - 1]?.value ?? 1;

  const chips = [];
  let remaining = amount;
  for (const denom of sortedDesc) {
    if (remaining < smallestValue) break;
    const count = Math.floor(remaining / denom.value);
    for (let i = 0; i < count; i += 1) chips.push(denom);
    remaining -= count * denom.value;
  }

  if (chips.length <= cap) return chips;
  // Over the visual cap: keep the highest-denomination chips (most
  // representative of the bet's actual size) and drop the rest.
  return chips.slice(0, cap);
}

/** Picks a single representative chip (largest denomination present) for a
 * bet amount - used by chip-flight animations, which only need one chip
 * color/value to fly through the air rather than the whole stack breakdown.
 * @param {number} amount
 * @param {ReadonlyArray<{value: number, color: string}>} denominationColors
 * @returns {{value: number, color: string}}
 */
export function representativeChip(amount, denominationColors) {
  const breakdown = computeChipBreakdown(amount, denominationColors, CHIP_STACK_VISUAL_CAP);
  return breakdown[0] ?? denominationColors[0];
}
