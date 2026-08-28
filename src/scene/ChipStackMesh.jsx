import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CHIP_RADIUS, CHIP_HEIGHT } from './ChipRack.jsx';
import { CHIP_MATERIAL_PROPS, CHIP_DENOMINATION_COLORS } from './materials.js';
import { computeChipBreakdown, CHIP_STACK_VISUAL_CAP } from './chipBreakdown.js';

const chipGeometry = new THREE.CylinderGeometry(CHIP_RADIUS, CHIP_RADIUS, CHIP_HEIGHT, 20);
const HIDDEN_Y = -10; // parked far below the felt for unused instance slots

/**
 * ChipStackMesh.jsx
 * ---------------------------------------------------------------------------
 * The "resting" chip stack for one betting spot (see layout.js
 * BETTING_SPOTS), reflecting the currently-staged bet amount. Height/count
 * update immediately and reactively whenever `amount` changes (no animation
 * of its own - the transient throw/rake motion between the rack, this spot,
 * and the discard tray is ChipFlight.jsx's job).
 *
 * Uses one fixed-capacity `<instancedMesh>` per spot (capacity =
 * CHIP_STACK_VISUAL_CAP) so growing/shrinking a stack never remounts the
 * mesh - unused instance slots are parked off-scene with a zeroed scale
 * rather than the instancedMesh being resized, following the same
 * single-instancedMesh-per-repeated-geometry pattern as ChipRack.jsx.
 */
function ChipStackMesh({ position, amount }) {
  const instancedRef = useRef(null);
  const breakdown = useMemo(
    () => computeChipBreakdown(amount, CHIP_DENOMINATION_COLORS),
    [amount]
  );

  useLayoutEffect(() => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < CHIP_STACK_VISUAL_CAP; i += 1) {
      const chip = breakdown[i];
      if (chip) {
        const jitterX = (((i * 37) % 7) - 3) * 0.0015;
        const jitterZ = (((i * 53) % 7) - 3) * 0.0015;
        const jitterRot = (((i * 17) % 11) - 5) * 0.05;
        dummy.position.set(jitterX, CHIP_HEIGHT / 2 + i * CHIP_HEIGHT, jitterZ);
        dummy.rotation.set(0, jitterRot, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, color.set(chip.color));
      } else {
        dummy.position.set(0, HIDDEN_Y, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [breakdown]);

  return (
    <group position={[position.x, position.y, position.z]}>
      <instancedMesh
        ref={instancedRef}
        args={[chipGeometry, undefined, CHIP_STACK_VISUAL_CAP]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...CHIP_MATERIAL_PROPS} />
      </instancedMesh>
    </group>
  );
}

export default ChipStackMesh;
