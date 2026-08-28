import { WOOD_MATERIAL_PROPS, TRAY_LINER_MATERIAL_PROPS, BRASS_MATERIAL_PROPS } from './materials.js';

const OUTER_WIDTH = 0.34;
const OUTER_DEPTH = 0.22;
const OUTER_HEIGHT = 0.03;
const LINER_MARGIN = 0.018;
const LINER_HEIGHT = 0.016;

/**
 * DiscardTray.jsx
 * ---------------------------------------------------------------------------
 * The discard/muck tray dealt (used, non-winning) cards get swept into: a
 * shallow wood-rimmed box with a dark felt-lined recess and a thin brass
 * lip, matching the rail's material language. Built from primitives only.
 *
 * Positioned by the caller (see CasinoScene.jsx, layout.js
 * DISCARD_TRAY_POSITION) - local (0,0,0) is the resting point on the felt.
 */
function DiscardTray() {
  return (
    <group name="discard-tray">
      {/* Wood outer shell. */}
      <mesh position={[0, OUTER_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[OUTER_WIDTH, OUTER_HEIGHT, OUTER_DEPTH]} />
        <meshPhysicalMaterial {...WOOD_MATERIAL_PROPS} />
      </mesh>

      {/* Dark felt-lined recess. */}
      <mesh position={[0, OUTER_HEIGHT - LINER_HEIGHT / 2 + 0.001, 0]} receiveShadow>
        <boxGeometry
          args={[OUTER_WIDTH - LINER_MARGIN * 2, LINER_HEIGHT, OUTER_DEPTH - LINER_MARGIN * 2]}
        />
        <meshStandardMaterial {...TRAY_LINER_MATERIAL_PROPS} />
      </mesh>

      {/* Four thin brass edge strips forming the rim outline (kept as
          separate slim boxes rather than a hollow frame mesh - simplest
          reliable way to trace a rectangle border from primitives). */}
      {[
        { pos: [0, OUTER_HEIGHT + 0.0015, OUTER_DEPTH / 2 - 0.002], size: [OUTER_WIDTH, 0.005, 0.004] },
        { pos: [0, OUTER_HEIGHT + 0.0015, -OUTER_DEPTH / 2 + 0.002], size: [OUTER_WIDTH, 0.005, 0.004] },
        { pos: [OUTER_WIDTH / 2 - 0.002, OUTER_HEIGHT + 0.0015, 0], size: [0.004, 0.005, OUTER_DEPTH] },
        { pos: [-OUTER_WIDTH / 2 + 0.002, OUTER_HEIGHT + 0.0015, 0], size: [0.004, 0.005, OUTER_DEPTH] },
      ].map((strip, i) => (
        <mesh key={i} position={strip.pos}>
          <boxGeometry args={strip.size} />
          <meshStandardMaterial {...BRASS_MATERIAL_PROPS} />
        </mesh>
      ))}
    </group>
  );
}

export default DiscardTray;
