import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Card from './Card.jsx';
import { SHOE_EXIT_POINT } from './layout.js';
import {
  CARD_FLIGHT_DURATION,
  SQUEEZE_DRAG_RANGE_PX,
  SQUEEZE_REVEAL_THRESHOLD,
  SQUEEZE_SPRING_BACK_DURATION,
  clamp01,
} from './animationTiming.js';

/**
 * Hand.jsx
 * ---------------------------------------------------------------------------
 * One side's (Player's or Banker's) up-to-3 card slots, plus the single
 * squeeze gesture that reveals every card in this hand together. Owns:
 *
 *  - The deal-in flight: each time `dealtCards` grows by one (driven by
 *    GameScreen stepping through the rules engine's DEAL_INITIAL /
 *    PLAYER_DRAW / BANKER_DRAW events in order - see GameScreen.jsx), the
 *    newly-appeared card flies from layout.js's SHOE_EXIT_POINT to its
 *    layout.js hand-slot anchor via a GSAP tween on the card's own group
 *    (imperative - no React re-render per animation frame).
 *  - The squeeze drag: an invisible catcher plane spanning this hand's
 *    slots. Dragging it updates every card's shader `uSqueeze` uniform
 *    imperatively (via each Card's `setSqueeze`); crossing the completion
 *    threshold calls `onSqueezeComplete` so the parent can flip the
 *    (state-machine-sourced) `revealed` flag - this component never decides
 *    what the cards ARE, only how the gesture feels.
 *
 * `instant` short-circuits the fly-in (used by the "Skip" control mid-deal)
 * so newly-appeared cards land directly in their slot with no tween.
 */
function Hand({ side, slots, dealtCards, revealed, interactive, instant, onSqueezeComplete }) {
  const cardRefs = [useRef(null), useRef(null), useRef(null)];
  const flightTweensRef = useRef([null, null, null]);
  const prevCountRef = useRef(0);
  const progressRef = useRef(0);
  const springTweenRef = useRef(null);
  const dragCleanupRef = useRef(null);

  // A fresh hand (dealtCards reset to []) means squeeze progress and any
  // leftover bend must reset too, even though the Card instances themselves
  // may be reused across hands.
  useEffect(() => {
    if (dealtCards.length === 0) {
      prevCountRef.current = 0;
      progressRef.current = 0;
      springTweenRef.current?.kill();
      cardRefs.forEach((r) => r.current?.setSqueeze(0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealtCards.length]);

  // Fly in any newly-dealt cards, strictly in the order they appeared in
  // `dealtCards` (which GameScreen only ever appends to, one at a time, in
  // the exact order the state machine yielded PLAYER_DRAW/BANKER_DRAW/etc).
  useEffect(() => {
    const prevCount = prevCountRef.current;
    for (let i = prevCount; i < dealtCards.length; i += 1) {
      const cardApi = cardRefs[i]?.current;
      const slot = slots[i];
      if (!cardApi || !cardApi.group || !slot) continue;
      flightTweensRef.current[i]?.kill();
      if (instant) {
        cardApi.group.position.set(slot.x, slot.y, slot.z);
      } else {
        flightTweensRef.current[i] = gsap.to(cardApi.group.position, {
          x: slot.x,
          y: slot.y,
          z: slot.z,
          duration: CARD_FLIGHT_DURATION,
          ease: 'power2.out',
        });
      }
    }
    prevCountRef.current = dealtCards.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealtCards, instant]);

  // Dispose every tween/listener on unmount - no dangling GSAP handles or
  // window listeners left behind between hands.
  useEffect(
    () => () => {
      flightTweensRef.current.forEach((t) => t?.kill());
      springTweenRef.current?.kill();
      dragCleanupRef.current?.();
    },
    []
  );

  const handlePointerDown = (event) => {
    event.stopPropagation();
    springTweenRef.current?.kill();
    dragCleanupRef.current?.();

    const startClientY = event.clientY;
    const startProgress = progressRef.current;

    const onMove = (moveEvent) => {
      const deltaY = startClientY - moveEvent.clientY; // dragging up -> squeezing
      const progress = clamp01(startProgress + deltaY / SQUEEZE_DRAG_RANGE_PX);
      progressRef.current = progress;
      cardRefs.forEach((r) => r.current?.setSqueeze(progress));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dragCleanupRef.current = null;

      if (progressRef.current >= SQUEEZE_REVEAL_THRESHOLD) {
        progressRef.current = 0;
        cardRefs.forEach((r) => r.current?.setSqueeze(0));
        onSqueezeComplete();
      } else {
        const spring = { value: progressRef.current };
        springTweenRef.current = gsap.to(spring, {
          value: 0,
          duration: SQUEEZE_SPRING_BACK_DURATION,
          ease: 'power2.out',
          onUpdate: () => {
            progressRef.current = spring.value;
            cardRefs.forEach((r) => r.current?.setSqueeze(spring.value));
          },
        });
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    dragCleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  };

  const catcherActive = interactive && dealtCards.length > 0 && !revealed;
  const midSlot = slots[1] ?? slots[0];

  return (
    <group name={`hand-${side.toLowerCase()}`}>
      {slots.map((slot, i) =>
        i < dealtCards.length ? (
          <Card
            key={i}
            ref={cardRefs[i]}
            card={dealtCards[i]}
            revealed={revealed}
            initialPosition={instant ? slot : SHOE_EXIT_POINT}
            rotationY={slot.rotationY ?? 0}
          />
        ) : null
      )}

      {catcherActive && midSlot && (
        <mesh
          position={[midSlot.x, midSlot.y + 0.018, midSlot.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={handlePointerDown}
        >
          <planeGeometry args={[0.22, 0.15]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export default Hand;
