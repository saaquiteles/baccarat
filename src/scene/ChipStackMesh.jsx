import { useMemo } from 'react';
import { CHIP_HEIGHT } from './ChipRack.jsx';
import { CHIP_DENOMINATION_VALUES } from './materials.js';
import { computeChipBreakdown } from './chipBreakdown.js';
import ChipModel from './ChipModel.jsx';

/**
 * ChipStackMesh.jsx
 * ---------------------------------------------------------------------------
 * The "resting" chip stack for one betting spot (see layout.js
 * BETTING_SPOTS), reflecting the currently-staged bet amount. Height/count
 * update immediately and reactively whenever `amount` changes (no animation
 * of its own - the transient throw/rake motion between the rack, this spot,
 * and the discard tray is ChipFlight.jsx's job).
 *
 * Renders one real modeled/textured <ChipModel> per physical chip in the
 * breakdown (see chipBreakdown.js), stacked with a little jitter so a pile
 * reads as loose chips rather than a perfect column - simpler than the
 * earlier single fixed-capacity `<instancedMesh>` approach, which could only
 * tint one shared cylinder geometry a solid color and can't represent each
 * denomination's distinct baked artwork. Chip counts here are already
 * capped (CHIP_STACK_VISUAL_CAP) and typically small, so plain per-chip
 * primitives (each cheaply cloned from a shared cached GLTF scene - see
 * ChipModel.jsx) are simple and cheap enough without instancing.
 */
function ChipStackMesh({ position, amount }) {
  const breakdown = useMemo(
    () => computeChipBreakdown(amount, CHIP_DENOMINATION_VALUES),
    [amount]
  );

  return (
    <group position={[position.x, position.y, position.z]}>
      {breakdown.map((value, i) => {
        const jitterX = (((i * 37) % 7) - 3) * 0.0015;
        const jitterZ = (((i * 53) % 7) - 3) * 0.0015;
        const jitterRot = (((i * 17) % 11) - 5) * 0.05;
        return (
          <ChipModel
            key={i}
            value={value}
            position={[jitterX, CHIP_HEIGHT / 2 + i * CHIP_HEIGHT, jitterZ]}
            rotation={[0, jitterRot, 0]}
          />
        );
      })}
    </group>
  );
}

export default ChipStackMesh;
