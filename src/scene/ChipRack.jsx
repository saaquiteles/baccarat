import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PLASTIC_MATERIAL_PROPS, CHIP_MATERIAL_PROPS, CHIP_DENOMINATION_COLORS } from './materials.js';

// Exported so other dynamic-chip components (see ChipStackMesh.jsx,
// ChipFlight.jsx) reuse the exact same physical chip size rather than
// inventing a second set of dimensions.
export const CHIP_RADIUS = 0.019;
export const CHIP_HEIGHT = 0.0032;
const CHIPS_PER_STACK = 16;
const SLOT_WIDTH = 0.052;
const SLOT_DEPTH = 0.09;
const WALL_HEIGHT = CHIP_HEIGHT * CHIPS_PER_STACK + 0.012;
const WALL_THICKNESS = 0.008;
const RACK_WIDTH = SLOT_WIDTH * CHIP_DENOMINATION_COLORS.length + WALL_THICKNESS;
const BASE_THICKNESS = 0.012;

// Shared geometry for every chip instance - one cylinder, reused across all
// stacks/slots via a single instancedMesh rather than cloned per chip.
const chipGeometry = new THREE.CylinderGeometry(CHIP_RADIUS, CHIP_RADIUS, CHIP_HEIGHT, 24);

/**
 * ChipRack.jsx
 * ---------------------------------------------------------------------------
 * The dealer's chip tray: a shallow slotted frame holding one stack per
 * denomination color. All chips share one geometry and are drawn through a
 * single `<instancedMesh>` (per-instance transform + color), which is both
 * the efficient approach today and exactly the shape a later
 * performance-focused subagent would want when it starts instancing
 * repeated meshes elsewhere in the scene.
 *
 * Positioned by the caller (see CasinoScene.jsx, layout.js
 * CHIP_RACK_POSITION) - local (0,0,0) is the resting point on the felt.
 */
function ChipRack() {
  const instancedRef = useRef(null);
  const chipCount = CHIP_DENOMINATION_COLORS.length * CHIPS_PER_STACK;

  const slotOffsets = useMemo(() => {
    const totalWidth = SLOT_WIDTH * CHIP_DENOMINATION_COLORS.length;
    return CHIP_DENOMINATION_COLORS.map((_, i) => -totalWidth / 2 + SLOT_WIDTH * (i + 0.5));
  }, []);

  useLayoutEffect(() => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let instanceIndex = 0;
    CHIP_DENOMINATION_COLORS.forEach((denom, slotIndex) => {
      for (let c = 0; c < CHIPS_PER_STACK; c++) {
        dummy.position.set(
          slotOffsets[slotIndex],
          BASE_THICKNESS + CHIP_HEIGHT / 2 + c * CHIP_HEIGHT,
          0
        );
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(instanceIndex, dummy.matrix);
        mesh.setColorAt(instanceIndex, color.set(denom.color));
        instanceIndex += 1;
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [slotOffsets]);

  return (
    <group name="chip-rack">
      {/* Base plate. */}
      <mesh position={[0, BASE_THICKNESS / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[RACK_WIDTH, BASE_THICKNESS, SLOT_DEPTH]} />
        <meshStandardMaterial {...PLASTIC_MATERIAL_PROPS} />
      </mesh>

      {/* Divider walls, one more than there are slots. */}
      {Array.from({ length: CHIP_DENOMINATION_COLORS.length + 1 }, (_, i) => {
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

      <instancedMesh
        ref={instancedRef}
        args={[chipGeometry, undefined, chipCount]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...CHIP_MATERIAL_PROPS} />
      </instancedMesh>
    </group>
  );
}

export default ChipRack;
