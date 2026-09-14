import { PLASTIC_MATERIAL_PROPS, CHIP_DENOMINATION_VALUES } from './materials.js';
import ChipModel from './ChipModel.jsx';

// Exported so other dynamic-chip components (see ChipStackMesh.jsx,
// ChipFlight.jsx) reuse the exact same physical chip size rather than
// inventing a second set of dimensions - matches the real chip models'
// own bounds (see src/assets/models/chips/), not an arbitrary guess.
export const CHIP_RADIUS = 0.0195;
export const CHIP_HEIGHT = 0.0033;
const CHIPS_PER_STACK = 16;
const SLOT_WIDTH = 0.052;
const SLOT_DEPTH = 0.09;
const WALL_HEIGHT = CHIP_HEIGHT * CHIPS_PER_STACK + 0.012;
const WALL_THICKNESS = 0.008;
const RACK_WIDTH = SLOT_WIDTH * CHIP_DENOMINATION_VALUES.length + WALL_THICKNESS;
const BASE_THICKNESS = 0.012;

/**
 * ChipRack.jsx
 * ---------------------------------------------------------------------------
 * The dealer's chip tray: a shallow slotted frame holding one stack per
 * denomination, one slot per value in CHIP_DENOMINATION_VALUES. Each chip is
 * a real modeled/textured GLTF asset (see ChipModel.jsx/chipModels.js)
 * rather than a procedural cylinder, so - unlike the betting-spot stacks,
 * which vary in height with the live bet - this rack's chips never change
 * and are simply laid out once as plain positioned <ChipModel> instances.
 *
 * Positioned by the caller (see CasinoScene.jsx, layout.js
 * CHIP_RACK_POSITION) - local (0,0,0) is the resting point on the felt.
 */
function ChipRack() {
  const totalWidth = SLOT_WIDTH * CHIP_DENOMINATION_VALUES.length;

  return (
    <group name="chip-rack">
      {/* Base plate. */}
      <mesh position={[0, BASE_THICKNESS / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[RACK_WIDTH, BASE_THICKNESS, SLOT_DEPTH]} />
        <meshStandardMaterial {...PLASTIC_MATERIAL_PROPS} />
      </mesh>

      {/* Divider walls, one more than there are slots. */}
      {Array.from({ length: CHIP_DENOMINATION_VALUES.length + 1 }, (_, i) => {
        const x = -RACK_WIDTH / 2 + SLOT_WIDTH * i;
        return (
          <mesh
            key={`divider-${i}`}
            position={[x, BASE_THICKNESS + WALL_HEIGHT / 2, 0]}
            castShadow
          >
            <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, SLOT_DEPTH]} />
            <meshStandardMaterial {...PLASTIC_MATERIAL_PROPS} />
          </mesh>
        );
      })}

      {/* Front/back long walls closing the tray. */}
      {[-1, 1].map((side) => (
        <mesh
          key={`side-${side}`}
          position={[0, BASE_THICKNESS + WALL_HEIGHT / 2, (side * SLOT_DEPTH) / 2]}
          castShadow
        >
          <boxGeometry args={[RACK_WIDTH, WALL_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial {...PLASTIC_MATERIAL_PROPS} />
        </mesh>
      ))}

      {CHIP_DENOMINATION_VALUES.map((value, slotIndex) => {
        const x = -totalWidth / 2 + SLOT_WIDTH * (slotIndex + 0.5);
        return Array.from({ length: CHIPS_PER_STACK }, (_, c) => (
          <ChipModel
            key={`${value}-${c}`}
            value={value}
            position={[x, BASE_THICKNESS + CHIP_HEIGHT / 2 + c * CHIP_HEIGHT, 0]}
          />
        ));
      })}
    </group>
  );
}

export default ChipRack;
