import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import './CardSqueezeMaterial.js';

/**
 * Card.jsx
 * ---------------------------------------------------------------------------
 * One physical playing card: a thin box (subdivided along its length so the
 * squeeze shader has vertices to bend) wearing the custom CardSqueezeMaterial
 * for its face-down look, plus a sibling <Text> pair (rank + suit glyph)
 * that is only ever mounted with content from the real `card` prop - never a
 * placeholder or a guess.
 *
 * Two ways a parent drives this component:
 *  - Reactively, via the `revealed` prop (a rare, discrete flip) - toggles
 *    the shader's uRevealed uniform and the face text's visibility together.
 *  - Imperatively, via the ref (`{ group, setSqueeze(progress) }`) - lets a
 *    high-frequency pointer-drag handler push `uSqueeze` updates straight to
 *    the material each frame without round-tripping through React state, and
 *    lets a deal/flight controller tween `group.position` with GSAP.
 *
 * Card dimensions are in the same meter units as layout.js.
 */
export const CARD_WIDTH = 0.05;
export const CARD_LENGTH = 0.07;
export const CARD_THICKNESS = 0.0016;
const BEND_SEGMENTS = 14;

const SUIT_SYMBOL = Object.freeze({ S: '♠', H: '♥', D: '♦', C: '♣' });
const RED_SUITS = new Set(['H', 'D']);

const Card = forwardRef(function Card({ card = null, revealed = false, initialPosition = null, rotationY = 0 }, ref) {
  const groupRef = useRef(null);
  const materialRef = useRef(null);
  // Mirrors uRevealed but as React state, purely to gate whether the <Text>
  // content mounts at all - belt-and-suspenders against ever rendering the
  // rank/suit before the reveal actually happens.
  const [textVisible, setTextVisible] = useState(revealed);

  const geometry = useMemo(
    () => new THREE.BoxGeometry(CARD_WIDTH, CARD_THICKNESS, CARD_LENGTH, 1, 1, BEND_SEGMENTS),
    []
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Set the card's starting world position exactly once, before first paint
  // (useLayoutEffect, empty deps) - a parent deal controller (Hand.jsx) then
  // drives `group.position` imperatively with GSAP for the fly-in, so this
  // must never re-run and stomp an in-flight tween on a later re-render
  // (e.g. when `revealed` flips).
  useLayoutEffect(() => {
    if (initialPosition && groupRef.current) {
      groupRef.current.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uRevealed = revealed ? 1 : 0;
      if (revealed) materialRef.current.uSqueeze = 0;
    }
    setTextVisible(revealed);
  }, [revealed]);

  useImperativeHandle(
    ref,
    () => ({
      get group() {
        return groupRef.current;
      },
      setSqueeze(progress) {
        if (materialRef.current) materialRef.current.uSqueeze = progress;
      },
    }),
    []
  );

  const suitChar = card ? SUIT_SYMBOL[card.suit] : '';
  const textColor = card && RED_SUITS.has(card.suit) ? '#b3232f' : '#181c22';

  return (
    <group ref={groupRef} rotation={[0, rotationY, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <cardSqueezeMaterial ref={materialRef} uRevealed={revealed ? 1 : 0} />
      </mesh>
      {card && textVisible && (
        <group position={[0, CARD_THICKNESS / 2 + 0.0006, 0]}>
          <Text
            position={[-CARD_WIDTH * 0.26, 0, CARD_LENGTH * 0.27]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.017}
            color={textColor}
            anchorX="center"
            anchorY="middle"
          >
            {card.rank}
          </Text>
          <Text
            position={[CARD_WIDTH * 0.2, 0, -CARD_LENGTH * 0.22]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.021}
            color={textColor}
            anchorX="center"
            anchorY="middle"
          >
            {suitChar}
          </Text>
        </group>
      )}
    </group>
  );
});

export default Card;
