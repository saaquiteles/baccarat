/**
 * chipBreakdown.js
 * ---------------------------------------------------------------------------
 * Pure data helper: turns a staged bet amount into a list of physical chip
 * denominations to render as a stack. No Three.js/R3F/GSAP imports here on
 * purpose - this is "what to draw", not "how to draw it", so it can be
 * unit-tested or reused by a chip-flight animation without touching the
 * renderer.
 *
 * Denomination values are read from materials.js
 * (CHIP_DENOMINATION_VALUES) rather than redefined, so this never drifts
 * from the set of chips the 3D scene actually has real models for (see
 * chipModels.js) - each denomination's *visual* is a real modeled/textured
 * chip (ChipModel.jsx), so this module only needs to decide which
 * denominations, not what they look like.
 */

/** Hard visual cap on how many chips a single stack ever renders - a $5,000
 * bet shouldn't spawn 5,000 chip meshes. Denominations are greedily applied
 * largest-first, so the cap only ever trims low-value filler, never the
 * chips that best represent the bet's size. */
export const CHIP_STACK_VISUAL_CAP = 18;

/**
 * @param {number} amount - Staged bet amount, in the same units as
 *   CHIP_DENOMINATION_VALUES.
 * @param {ReadonlyArray<number>} denominationValues
 * @param {number} [cap]
 * @returns {number[]} One entry per physical chip (its denomination value),
 *   ordered highest-denomination first (bottom of the stack).
 */
export function computeChipBreakdown(amount, denominationValues, cap = CHIP_STACK_VISUAL_CAP) {
  if (!(amount > 0)) return [];

  const sortedDesc = [...denominationValues].sort((a, b) => b - a);
  const smallestValue = sortedDesc[sortedDesc.length - 1] ?? 1;

  const chips = [];
  let remaining = amount;
  for (const value of sortedDesc) {
    if (remaining < smallestValue) break;
    const count = Math.floor(remaining / value);
    for (let i = 0; i < count; i += 1) chips.push(value);
    remaining -= count * value;
  }

  if (chips.length <= cap) return chips;
  // Over the visual cap: keep the highest-denomination chips (most
  // representative of the bet's actual size) and drop the rest.
  return chips.slice(0, cap);
}

/** Picks a single representative chip denomination (the largest present) for
 * a bet amount - used by chip-flight animations, which only need one chip
 * to fly through the air rather than the whole stack breakdown.
 * @param {number} amount
 * @param {ReadonlyArray<number>} denominationValues
 * @returns {number}
 */
export function representativeChip(amount, denominationValues) {
  const breakdown = computeChipBreakdown(amount, denominationValues, CHIP_STACK_VISUAL_CAP);
  return breakdown[0] ?? denominationValues[0];
}
