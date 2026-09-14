/**
 * materials.js
 * ---------------------------------------------------------------------------
 * Plain PBR material-prop descriptors shared across scene components.
 * Kept as data (spread onto <meshStandardMaterial>/<meshPhysicalMaterial>
 * JSX) rather than pre-built Three.js Material instances, so this module
 * stays framework-light and easy to tweak in one place. There are no image
 * texture maps anywhere - every surface reads correctly from
 * color/roughness/metalness/clearcoat alone.
 */

/** Matte fabric felt bed. High roughness, zero metalness so it never
 * catches a specular highlight or the bloom pass. */
export const FELT_MATERIAL_PROPS = Object.freeze({
  color: '#0b6b3a',
  roughness: 0.92,
  metalness: 0,
});

/** Alternate blue felt, offered for tables that prefer it over green. */
export const FELT_MATERIAL_PROPS_BLUE = Object.freeze({
  color: '#0d4f7a',
  roughness: 0.92,
  metalness: 0,
});

/** Polished mahogany rail. meshPhysicalMaterial's clearcoat gives the wet-
 * lacquer highlight without needing a texture map. */
export const WOOD_MATERIAL_PROPS = Object.freeze({
  color: '#3a1c12',
  roughness: 0.42,
  metalness: 0.05,
  clearcoat: 0.85,
  clearcoatRoughness: 0.12,
});

/** Darker turned wood for the pedestal, less clearcoat (seen from a
 * distance, doesn't need the highlight budget). */
export const PEDESTAL_MATERIAL_PROPS = Object.freeze({
  color: '#2a140c',
  roughness: 0.55,
  metalness: 0.05,
  clearcoat: 0.4,
  clearcoatRoughness: 0.25,
});

/** Bright brass trim / rack hardware. Low roughness + high metalness so it
 * reads as a bright specular highlight the bloom pass can catch. */
export const BRASS_MATERIAL_PROPS = Object.freeze({
  color: '#caa24c',
  roughness: 0.28,
  metalness: 0.9,
});

/** Slight-sheen plastic/resin for the shoe, chip-rack frame and discard
 * tray body - not fully matte, not mirror-glossy. */
export const PLASTIC_MATERIAL_PROPS = Object.freeze({
  color: '#161616',
  roughness: 0.38,
  metalness: 0.08,
});

/** Dark felt-lined interior for the discard tray. */
export const TRAY_LINER_MATERIAL_PROPS = Object.freeze({
  color: '#0a1a12',
  roughness: 0.85,
  metalness: 0,
});

/**
 * Every chip denomination the 3D scene has a real modeled/textured chip for
 * (see src/scene/chipModels.js) - the same eight values as the 2D betting
 * board's tray ladder (src/ui/constants.js CHIP_VALUE_LADDER), repeated here
 * rather than imported so the scene layer stays decoupled from the 2D UI
 * layer. Each chip's actual look (face artwork, edge color) comes baked into
 * its GLTF model, not a flat tinted material, so unlike the procedural chip
 * this replaced, there's no color/material data left to keep here.
 */
export const CHIP_DENOMINATION_VALUES = Object.freeze([1, 5, 25, 100, 500, 1000, 5000, 25000]);
