/**
 * layout.js
 * ---------------------------------------------------------------------------
 * The single source of truth for every spatial anchor on the 3D table: table
 * dimensions, where the shoe releases cards, where each hand's cards land,
 * where every betting spot sits on the felt, where the discard tray and chip
 * rack live, and where each named camera view looks from.
 *
 * This module exports PLAIN DATA ONLY - numbers, arrays and plain objects.
 * No `three` or `@react-three/fiber` imports, no live Object3D/Vector3
 * instances. That's deliberate: any future subagent (card dealing/animation,
 * chip stacking, performance/instancing) should be able to import positions
 * from here without pulling in a renderer or touching scene-construction
 * code in Table.jsx/ChipRack.jsx/etc.
 *
 * Units: meters, matching the standard Three.js/R3F convention. +Y is up.
 * The table sits on the floor at y = 0. The felt's playing surface is the
 * XZ plane at y = TABLE.height.
 *
 * Orientation: the dealer stands at the -Z (back) edge of the table facing
 * +Z; players sit/stand along the +Z (front) edge. The shape is a
 * left-right symmetric "stadium" (straight front/back edges, rounded left
 * and right ends) so +X/-X are mirror images of each other.
 */

// ---------------------------------------------------------------------------
// Table geometry
// ---------------------------------------------------------------------------

/** Core table dimensions and construction parameters, all in meters. */
export const TABLE = Object.freeze({
  /** Overall width, dealer's-left to dealer's-right (x-axis). */
  width: 1.7,
  /** Overall depth, dealer edge (-z) to player rail edge (+z) (z-axis). */
  depth: 1.05,
  /** Height of the felt playing surface off the floor (y-axis). */
  height: 0.75,
  /** Thickness of the solid wood rail slab beneath the felt top. */
  railThickness: 0.09,
  /** Corner radius used to round the wood rail's footprint. Set equal to
   * depth/2 so the left/right ends become full semicircles ("stadium"
   * shape) while the front/back edges stay straight. */
  cornerRadius: 0.525,
  /** Felt footprint as a fraction of the rail footprint (uniform scale on
   * width/depth/cornerRadius), leaving an exposed wood rail border. */
  feltInsetScale: 0.88,
  /** Felt slab thickness. */
  feltThickness: 0.016,
  /** Radius of the brass trim bead traced around the felt's edge. */
  brassTrimRadius: 0.012,
  /** Radius of the turned wood pedestal column beneath the tabletop. */
  pedestalRadius: 0.14,
  /** Radius of the pedestal's floor foot disc. */
  pedestalFootRadius: 0.34,
});

/** Height of the felt playing surface (shorthand used throughout layout.js). */
const FELT_Y = TABLE.height;

/** Small clearance above the felt nap that a resting card/chip should sit at
 * to avoid z-fighting with the felt mesh. Anchors that describe "on the
 * felt" positions use this offset; a future card/chip subagent may add
 * further offsets on top of it (card thickness, chip stack height, etc). */
const RESTING_Y = FELT_Y + 0.002;

// ---------------------------------------------------------------------------
// Dealing shoe
// ---------------------------------------------------------------------------

/**
 * Where cards emerge from the dealing shoe: near the dealer's back edge,
 * offset toward +X ("dealer's right"), at the height of the shoe's card
 * slot rather than the felt (a few centimeters above the felt).
 */
export const SHOE_EXIT_POINT = Object.freeze({
  x: 0.5,
  y: FELT_Y + 0.05,
  z: -0.42,
  /** Radians about Y; the shoe faces the players (+z) so cards exit toward
   * the hand slots below. */
  rotationY: 0,
});

/** Anchor for the shoe prop's base (where DealingShoe.jsx roots itself),
 * directly beneath the exit point, resting on the felt. */
export const SHOE_BASE_POSITION = Object.freeze({
  x: SHOE_EXIT_POINT.x,
  y: FELT_Y,
  z: SHOE_EXIT_POINT.z,
  rotationY: SHOE_EXIT_POINT.rotationY,
});

// ---------------------------------------------------------------------------
// Hand slots - 1 to 3 cards each for Player and Banker. Mirrored across x=0.
// ---------------------------------------------------------------------------

const HAND_SLOT_Z = -0.08;
const HAND_SLOT_SPACING = 0.06;
const HAND_CENTER_OFFSET = 0.28;

/**
 * Player hand card slots (up to 3 cards), on the -X side of centerline.
 * Slot 0/1 are the initial two cards; slot 2 is the optional third (draw)
 * card. Real baccarat deals the third card crosswise - this module only
 * fixes its position, a future card-dealing subagent may add its own
 * extra rotation for that presentation.
 */
export const PLAYER_HAND_SLOTS = Object.freeze([
  Object.freeze({ x: -HAND_CENTER_OFFSET - HAND_SLOT_SPACING, y: RESTING_Y, z: HAND_SLOT_Z, rotationY: 0 }),
  Object.freeze({ x: -HAND_CENTER_OFFSET, y: RESTING_Y, z: HAND_SLOT_Z, rotationY: 0 }),
  Object.freeze({ x: -HAND_CENTER_OFFSET + HAND_SLOT_SPACING, y: RESTING_Y, z: HAND_SLOT_Z, rotationY: 0 }),
]);

/** Banker hand card slots (up to 3 cards), mirrored on the +X side. */
export const BANKER_HAND_SLOTS = Object.freeze([
  Object.freeze({ x: HAND_CENTER_OFFSET - HAND_SLOT_SPACING, y: RESTING_Y, z: HAND_SLOT_Z, rotationY: 0 }),
  Object.freeze({ x: HAND_CENTER_OFFSET, y: RESTING_Y, z: HAND_SLOT_Z, rotationY: 0 }),
  Object.freeze({ x: HAND_CENTER_OFFSET + HAND_SLOT_SPACING, y: RESTING_Y, z: HAND_SLOT_Z, rotationY: 0 }),
]);

// ---------------------------------------------------------------------------
// Betting spots - one shared spot per bet type (this table plays as a single
// Player hand vs. a single Banker hand, matching the 2D betting board in
// src/ui/BettingBoard.jsx - there is no per-seat individual betting circle).
// Keys match the engine's own ids: MAIN_BET_TYPES values ('PLAYER'/'BANKER'/
// 'TIE') from src/game/payouts.js, and the side-bet ids from
// src/game/sideBets.js ('player-pair', 'banker-pair', 'perfect-pair',
// 'dragon-7', 'panda-8').
// ---------------------------------------------------------------------------

export const BETTING_SPOTS = Object.freeze({
  // Main bets, nearer the table center.
  PLAYER: Object.freeze({ x: -0.45, y: RESTING_Y, z: 0.3 }),
  BANKER: Object.freeze({ x: 0.45, y: RESTING_Y, z: 0.3 }),
  TIE: Object.freeze({ x: 0, y: RESTING_Y, z: 0.15 }),

  // Side bets, in a row closer to the player rail. Player-leaning bets sit
  // toward -X, banker-leaning bets toward +X, Perfect Pair (applies to
  // either hand) sits centered.
  'player-pair': Object.freeze({ x: -0.6, y: RESTING_Y, z: 0.42 }),
  'panda-8': Object.freeze({ x: -0.3, y: RESTING_Y, z: 0.42 }),
  'perfect-pair': Object.freeze({ x: 0, y: RESTING_Y, z: 0.42 }),
  'dragon-7': Object.freeze({ x: 0.3, y: RESTING_Y, z: 0.42 }),
  'banker-pair': Object.freeze({ x: 0.6, y: RESTING_Y, z: 0.42 }),
});

// ---------------------------------------------------------------------------
// Discard tray (muck) and chip rack
// ---------------------------------------------------------------------------

/** Discard/muck tray: back-left corner, opposite the shoe. */
export const DISCARD_TRAY_POSITION = Object.freeze({
  x: -0.62,
  y: FELT_Y,
  z: -0.38,
  rotationY: 0,
});

/** Dealer's chip rack: centered on the back (dealer) edge. */
export const CHIP_RACK_POSITION = Object.freeze({
  x: 0,
  y: FELT_Y,
  z: -0.46,
  rotationY: 0,
});

// ---------------------------------------------------------------------------
// Named camera rigs
// ---------------------------------------------------------------------------

/**
 * Reusable, named camera views. Each entry is a plain position/target/fov
 * description (not a live Three.js camera) - CameraRig.jsx reads these and
 * eases the actual render camera toward whichever one is active.
 *
 * OVERHEAD_BETTING is the only view a player picks manually (see
 * CAMERA_VIEW_IDS below); HAND_CLOSEUP is driven automatically by
 * GameScreen.jsx's dealing-phase auto-follow (dealing/squeeze/settling), so
 * it's addressed directly by id rather than listed as a manual button.
 *
 * HAND_CLOSEUP frames the midpoint between PLAYER_HAND_SLOTS and
 * BANKER_HAND_SLOTS (x = 0, the shared HAND_SLOT_Z) - a single fixed
 * position/target close enough that every dealt card's rank/suit <Text>
 * (see Card.jsx) reads clearly, covering the full worst-case spread of both
 * hands with all three cards each (roughly HAND_CENTER_OFFSET +
 * HAND_SLOT_SPACING either side of center, plus a card-width margin).
 */
export const CAMERA_VIEWS = Object.freeze({
  OVERHEAD_BETTING: Object.freeze({
    id: 'OVERHEAD_BETTING',
    name: 'Overhead Betting View',
    description: 'Bird\'s-eye view of the whole felt, framing every betting spot.',
    position: Object.freeze({ x: 0, y: 2.5, z: 0.05 }),
    target: Object.freeze({ x: 0, y: TABLE.height, z: 0.05 }),
    fov: 45,
  }),
  HAND_CLOSEUP: Object.freeze({
    id: 'HAND_CLOSEUP',
    name: 'Hand Close-Up View',
    description: 'Tight, legible framing on both hands\' cards - active while dealing, squeezing and settling.',
    // y must clear FELT_Y (0.75) by a comfortable margin - a y below the
    // felt puts the camera inside the rail/pedestal geometry (a real bug
    // caught here: the previous position.y of 0.29 was *under* the table).
    position: Object.freeze({ x: 0, y: 1.0, z: 0.62 }),
    target: Object.freeze({ x: 0, y: FELT_Y + 0.01, z: HAND_SLOT_Z }),
    fov: 32,
  }),
});

/** Stable iteration order for UI that lists/cycles through the *manually*
 * selectable camera views - deliberately excludes HAND_CLOSEUP, which is
 * only ever entered automatically (see the doc comment on CAMERA_VIEWS). */
export const CAMERA_VIEW_IDS = Object.freeze(['OVERHEAD_BETTING']);

/** Camera view active when nothing else has been requested yet. */
export const DEFAULT_CAMERA_VIEW = 'OVERHEAD_BETTING';
