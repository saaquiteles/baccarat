import { PLASTIC_MATERIAL_PROPS, BRASS_MATERIAL_PROPS } from './materials.js';

/**
 * DealingShoe.jsx
 * ---------------------------------------------------------------------------
 * The card dealing shoe: a tilted box body with a dark slot near its front
 * base (where cards emerge) and a small brass thumb-plate on top. Built
 * from primitives only, sized so its front-bottom slot roughly lines up
 * with layout.js's SHOE_EXIT_POINT once positioned by the caller.
 *
 * Positioned by the caller (see CasinoScene.jsx, layout.js
 * SHOE_BASE_POSITION) - local (0,0,0) is the resting point on the felt.
 */
function DealingShoe() {
  const bodyWidth = 0.16;
  const bodyDepth = 0.22;
  const bodyHeight = 0.09;
  const tilt = -0.22; // radians, leans the card ramp toward the players (+z)

  return (
    <group name="dealing-shoe" rotation={[tilt, 0, 0]}>
      {/* Main body. */}
      <mesh position={[0, bodyHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyWidth, bodyHeight, bodyDepth]} />
        <meshStandardMaterial {...PLASTIC_MATERIAL_PROPS} />
      </mesh>

      {/* Card exit slot - a thin dark inset near the front-bottom face. */}
      <mesh position={[0, 0.012, bodyDepth / 2 + 0.001]} castShadow>
        <boxGeometry args={[bodyWidth * 0.86, 0.012, 0.006]} />
        <meshStandardMaterial color="#050505" roughness={0.5} metalness={0} />
      </mesh>

      {/* Brass thumb-plate on top, for a hint of hardware detail. */}
      <mesh position={[0, bodyHeight + 0.002, -bodyDepth * 0.28]} castShadow>
        <boxGeometry args={[bodyWidth * 0.7, 0.004, bodyDepth * 0.32]} />
        <meshStandardMaterial {...BRASS_MATERIAL_PROPS} />
      </mesh>
    </group>
  );
}

export default DealingShoe;
