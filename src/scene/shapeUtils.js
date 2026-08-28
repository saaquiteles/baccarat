import * as THREE from 'three';

/**
 * shapeUtils.js
 * ---------------------------------------------------------------------------
 * Small, dependency-free helpers for building the table's primitive
 * geometry (no external models/meshes - every prop is generated code).
 */

/**
 * Builds a 2D "stadium" / rounded-rectangle outline centered on the origin,
 * with `width` along local X and `depth` along local Y. When `radius` is
 * set to `depth / 2` the left/right ends become full semicircles (a true
 * stadium shape) while the top/bottom edges stay straight - this is the
 * footprint used for the table rail and, at a smaller scale, the felt bed.
 *
 * @param {number} width
 * @param {number} depth
 * @param {number} radius
 * @returns {THREE.Shape}
 */
export function roundedRectShape(width, depth, radius) {
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(radius, hw, hd);

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return shape;
}

/**
 * Extrudes a flat 2D shape into a horizontal slab and bakes the rotation
 * into the geometry so the CALLER never has to reason about
 * ExtrudeGeometry's local Z-extrude convention: the returned geometry's
 * origin sits at the CENTER of the slab's TOP face, and the slab extends
 * downward. Placing a mesh at `position.y = surfaceHeight` therefore puts
 * the top surface exactly at `surfaceHeight`.
 *
 * The shape's local X stays world X; the shape's local Y becomes world Z
 * (sign is irrelevant for the symmetric stadium shapes used on this table).
 *
 * Note on `bevel`: when bevelEnabled, three.js's ExtrudeGeometry does NOT
 * simply add a rounded rim within the [0, thickness] range - the true
 * full-area flat cap (built from the ORIGINAL, unscaled contour) sits
 * `bevelThickness` PAST the nominal depth, at local z = thickness +
 * bevelThickness (the z = thickness plane is only the enlarged,
 * bevel-scaled main body, not the cap). Skipping this offset silently
 * makes a beveled slab's real top sit `bevelThickness` higher than
 * intended - easy to miss because nothing throws, the slab just ends up
 * taller than it looks like it should be and can swallow whatever thin
 * layer was meant to sit on top of it (verified against this table's felt
 * bed disappearing under the rail before this offset was added).
 *
 * @param {THREE.Shape} shape
 * @param {number} thickness
 * @param {{ bevelSize?: number, bevelThickness?: number, bevelSegments?: number }} [bevel]
 * @returns {THREE.BufferGeometry}
 */
export function buildFlatSlabGeometry(shape, thickness, bevel) {
  const bevelThickness = bevel?.bevelThickness ?? 0;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: Boolean(bevel),
    bevelSize: bevel?.bevelSize ?? 0,
    bevelThickness,
    bevelSegments: bevel?.bevelSegments ?? 1,
    curveSegments: 24,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -(thickness + bevelThickness), 0);
  return geometry;
}

/**
 * Traces a closed brass/trim "bead" tube around a 2D shape's boundary at a
 * fixed world height - used for the trim ring between felt and wood rail.
 *
 * @param {THREE.Shape} shape
 * @param {number} height - World Y the tube sits at.
 * @param {number} tubeRadius
 * @returns {THREE.TubeGeometry}
 */
export function buildTrimTubeGeometry(shape, height, tubeRadius) {
  const points2D = shape.getPoints(96);
  const points3D = points2D.map((p) => new THREE.Vector3(p.x, height, p.y));
  const curve = new THREE.CatmullRomCurve3(points3D, true, 'catmullrom', 0.05);
  return new THREE.TubeGeometry(curve, 220, tubeRadius, 10, true);
}
