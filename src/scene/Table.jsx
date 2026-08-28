import { useMemo } from 'react';
import * as THREE from 'three';
import { TABLE } from './layout.js';
import { roundedRectShape, buildFlatSlabGeometry, buildTrimTubeGeometry } from './shapeUtils.js';
import {
  FELT_MATERIAL_PROPS,
  WOOD_MATERIAL_PROPS,
  PEDESTAL_MATERIAL_PROPS,
  BRASS_MATERIAL_PROPS,
} from './materials.js';

/** Rounds the rail's top edge slightly instead of a hard 90-degree corner.
 * See shapeUtils.js's buildFlatSlabGeometry doc comment for why the bevel
 * thickness has to be folded back into the rail's effective height/bottom
 * position rather than just its `depth` (railThickness) argument. */
const RAIL_BEVEL = Object.freeze({ bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 });

/**
 * Table.jsx
 * ---------------------------------------------------------------------------
 * The table itself: a wood rail slab, a felt bed inset into it, a brass
 * trim bead tracing the felt's boundary, and a turned pedestal/base. Built
 * entirely from generated primitive geometry (rounded-rect extrusions,
 * cylinders, a tube) - no external model files.
 *
 * All dimensions come from layout.js's TABLE constants so this is the only
 * place that turns those numbers into an actual mesh hierarchy; every other
 * anchor (hand slots, betting spots, shoe/tray/rack positions) is placed by
 * CasinoScene.jsx relative to the same TABLE.height reference.
 */
function Table({ feltColor }) {
  const railShape = useMemo(
    () => roundedRectShape(TABLE.width, TABLE.depth, TABLE.cornerRadius),
    []
  );

  const feltShape = useMemo(
    () =>
      roundedRectShape(
        TABLE.width * TABLE.feltInsetScale,
        TABLE.depth * TABLE.feltInsetScale,
        TABLE.cornerRadius * TABLE.feltInsetScale
      ),
    []
  );

  const railGeometry = useMemo(
    () => buildFlatSlabGeometry(railShape, TABLE.railThickness, RAIL_BEVEL),
    [railShape]
  );

  const feltGeometry = useMemo(
    () => buildFlatSlabGeometry(feltShape, TABLE.feltThickness),
    [feltShape]
  );

  const trimGeometry = useMemo(
    () => buildTrimTubeGeometry(feltShape, TABLE.height + TABLE.feltThickness + 0.004, TABLE.brassTrimRadius),
    [feltShape]
  );

  // The beveled rail's true bottom sits an extra bevelThickness below its
  // nominal thickness (see buildFlatSlabGeometry) - the pedestal is sized
  // to reach that actual bottom so there's no gap or overlap.
  const railBottomY = TABLE.height - (TABLE.railThickness + 2 * RAIL_BEVEL.bevelThickness);
  const pedestalHeight = railBottomY;

  return (
    <group name="table">
      {/* Wood rail slab - top surface sits exactly at TABLE.height. */}
      <mesh geometry={railGeometry} position={[0, TABLE.height, 0]} receiveShadow castShadow>
        <meshPhysicalMaterial {...WOOD_MATERIAL_PROPS} side={THREE.DoubleSide} />
      </mesh>

      {/* Felt bed, inset into the rail, sitting a hair above it. */}
      <mesh geometry={feltGeometry} position={[0, TABLE.height + 0.0006, 0]} receiveShadow>
        <meshStandardMaterial
          {...(feltColor ? { ...FELT_MATERIAL_PROPS, color: feltColor } : FELT_MATERIAL_PROPS)}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Brass trim bead right at the felt's edge. */}
      <mesh geometry={trimGeometry} castShadow>
        <meshStandardMaterial {...BRASS_MATERIAL_PROPS} />
      </mesh>

      {/* Turned pedestal column. */}
      <mesh position={[0, pedestalHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[TABLE.pedestalRadius, TABLE.pedestalRadius * 1.15, pedestalHeight, 24]} />
        <meshPhysicalMaterial {...PEDESTAL_MATERIAL_PROPS} />
      </mesh>

      {/* Pedestal foot disc. */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[TABLE.pedestalFootRadius, TABLE.pedestalFootRadius * 1.05, 0.04, 28]} />
        <meshPhysicalMaterial {...PEDESTAL_MATERIAL_PROPS} />
      </mesh>
    </group>
  );
}

export default Table;
