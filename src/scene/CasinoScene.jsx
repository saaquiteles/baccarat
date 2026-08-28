import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Table from './Table.jsx';
import ChipRack from './ChipRack.jsx';
import DealingShoe from './DealingShoe.jsx';
import DiscardTray from './DiscardTray.jsx';
import Lighting from './Lighting.jsx';
import CameraRig from './CameraRig.jsx';
import { SHOE_BASE_POSITION, DISCARD_TRAY_POSITION, CHIP_RACK_POSITION, DEFAULT_CAMERA_VIEW } from './layout.js';

/**
 * CasinoScene.jsx
 * ---------------------------------------------------------------------------
 * Top-level assembly: the felt/rail/pedestal table plus its props (chip
 * rack, dealing shoe, discard tray), the lighting rig, and the
 * camera-view rig, all inside one <Canvas>. This is the whole 3D "room" -
 * no cards, no chip stacks in play, no game-state wiring; those belong to
 * a later, animation-focused subagent.
 *
 * Every prop below is positioned using the exact same anchors layout.js
 * exposes for other subagents (SHOE_BASE_POSITION, DISCARD_TRAY_POSITION,
 * CHIP_RACK_POSITION), so this file doubles as a worked example of how to
 * consume that module.
 *
 * @param {Object} props
 * @param {string} [props.activeView] - One of layout.js's CAMERA_VIEWS keys
 *   ('OVERHEAD_BETTING' | 'HAND_CLOSEUP' - only 'OVERHEAD_BETTING' is
 *   manually selectable, see CAMERA_VIEW_IDS). Defaults to
 *   DEFAULT_CAMERA_VIEW. The camera eases toward this view every time it
 *   changes - see CameraRig.jsx.
 * @param {string} [props.feltColor] - Optional felt color override (e.g.
 *   for a blue-felt table); defaults to the standard casino green.
 * @param {import('react').ReactNode} [props.children] - Dynamic in-play
 *   content (dealt cards, chip stacks, chip-flight animations) rendered
 *   inside the same <Canvas>/Suspense boundary as the static room, owned by
 *   whichever caller has game state (see GameScreen.jsx's
 *   TableAnimationLayer usage) - this component never builds that content
 *   itself.
 */
function CasinoScene({ activeView = DEFAULT_CAMERA_VIEW, feltColor, children }) {
  return (
    <Canvas shadows="percentage" dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={['#07080b']} />
      <fog attach="fog" args={['#07080b', 6, 14]} />

      <CameraRig activeView={activeView} />
      <Lighting />

      <Suspense fallback={null}>
        <Table feltColor={feltColor} />

        <group position={[SHOE_BASE_POSITION.x, SHOE_BASE_POSITION.y, SHOE_BASE_POSITION.z]} rotation={[0, SHOE_BASE_POSITION.rotationY, 0]}>
          <DealingShoe />
        </group>

        <group position={[DISCARD_TRAY_POSITION.x, DISCARD_TRAY_POSITION.y, DISCARD_TRAY_POSITION.z]} rotation={[0, DISCARD_TRAY_POSITION.rotationY, 0]}>
          <DiscardTray />
        </group>

        <group position={[CHIP_RACK_POSITION.x, CHIP_RACK_POSITION.y, CHIP_RACK_POSITION.z]} rotation={[0, CHIP_RACK_POSITION.rotationY, 0]}>
          <ChipRack />
        </group>

        {children}
      </Suspense>

      {/* Floor - dark, matte, just enough for the contact shadow and
          horizon to read; the pit lighting keeps it from ever looking flat
          black. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[6, 48]} />
        <meshStandardMaterial color="#111318" roughness={0.95} metalness={0} />
      </mesh>
    </Canvas>
  );
}

export default CasinoScene;
