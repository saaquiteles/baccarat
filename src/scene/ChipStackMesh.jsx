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
 *
 * `frustumCulled={false}`: this spot's very first mount is almost always
 * with `amount === 0` (no bet staged yet), so THREE.InstancedMesh's own
 * lazily-computed `boundingSphere` - correct only at the moment it's first
 * read, then cached forever, not invalidated by later `setMatrixAt` calls -
 * gets permanently baked in around the all-hidden (scale-0, y = HIDDEN_Y)
 * state. Every later bet then updates the *instance matrices* correctly, but
 * the camera keeps culling the whole mesh against that stale, effectively
 * empty sphere - so the stack silently never renders once a real bet lands,
 * confirmed live via a frustum-intersection probe against the real render
 * camera (returned false in every state once a bet existed, matching the
 * always-invisible resting stack - only the transient ChipFlight throw,
 * a separate non-instanced mesh with a normal geometry bounding sphere, was
 * ever visible). Disabling frustum culling is cheap here - at most
 * CHIP_STACK_VISUAL_CAP (18) low-poly cylinders per betting spot - and
 * sidesteps the stale-cache issue entirely rather than trying to keep a
 * manual `computeBoundingSphere()` call in sync with every future change to
 * this component's instance-matrix logic.
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
        frustumCulled={false}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...CHIP_MATERIAL_PROPS} />
      </instancedMesh>
    </group>
  );
}

export default ChipStackMesh;
