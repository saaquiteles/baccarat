import { Text } from '@react-three/drei';
import { PLAYER_HAND_SLOTS, BANKER_HAND_SLOTS, BETTING_SPOTS } from './layout.js';
import Hand from './Hand.jsx';
import ChipStackMesh from './ChipStackMesh.jsx';
import ChipFlight from './ChipFlight.jsx';

/** Every rank/suit glyph a Card's face can ever show, concatenated once so
 * troika-three-text's SDF font/atlas setup (and its associated shader
 * material, GPU texture upload, etc.) all happen up front, permanently,
 * far under the floor - never coincident with the moment a hand is
 * actually squeeze-revealed. Skipping this warm-up was observed to leave
 * that hand's already-dealt Card meshes undrawn for a stretch after the
 * very first reveal of a session (position/uniforms/visibility were all
 * verified correct via scene-graph inspection - only the very first
 * mount of any <Text> in the whole scene coincided with it), so this
 * silently absorbs that one-time cost before it can matter. */
const TEXT_GLYPH_WARMUP = 'A23456789J0QK♠♥♦♣';

function TextWarmup() {
  return (
    <Text position={[0, -50, 0]} fontSize={0.01} visible={false}>
      {TEXT_GLYPH_WARMUP}
    </Text>
  );
}

/**
 * TableAnimationLayer.jsx
 * ---------------------------------------------------------------------------
 * The dynamic content this subagent owns, composed into the already-built
 * CasinoScene (table/lighting/camera) via its `children` slot - never the
 * other way around. Purely a presentational composition: every piece of
 * "what to show" (which cards are dealt, which hands are revealed, how much
 * is staked at each spot, which chips are mid-flight) is decided by
 * GameScreen.jsx from the rules engine's own event log and bet state; this
 * component only lays out the corresponding Hand/ChipStackMesh/ChipFlight
 * elements.
 */
function TableAnimationLayer({
  playerCards,
  bankerCards,
  playerRevealed,
  bankerRevealed,
  squeezeInteractive,
  instantDeal,
  onPlayerSqueezeComplete,
  onBankerSqueezeComplete,
  spotAmounts,
  chipFlights,
  onChipFlightComplete,
}) {
  return (
    <group name="table-animation-layer">
      <TextWarmup />
      <Hand
        side="PLAYER"
        slots={PLAYER_HAND_SLOTS}
        dealtCards={playerCards}
        revealed={playerRevealed}
        interactive={squeezeInteractive}
        instant={instantDeal}
        onSqueezeComplete={onPlayerSqueezeComplete}
      />
      <Hand
        side="BANKER"
        slots={BANKER_HAND_SLOTS}
        dealtCards={bankerCards}
        revealed={bankerRevealed}
        interactive={squeezeInteractive}
        instant={instantDeal}
        onSqueezeComplete={onBankerSqueezeComplete}
      />

      {Object.keys(BETTING_SPOTS).map((spotId) => (
        <ChipStackMesh
          key={spotId}
          position={BETTING_SPOTS[spotId]}
          amount={spotAmounts[spotId] || 0}
        />
      ))}

      {chipFlights.map((flight) => (
        <ChipFlight
          key={flight.id}
          from={flight.from}
          to={flight.to}
          color={flight.color}
          onComplete={() => onChipFlightComplete(flight.id)}
        />
      ))}
    </group>
  );
}

export default TableAnimationLayer;
