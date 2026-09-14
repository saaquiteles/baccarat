import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import ChipModel from './ChipModel.jsx';
import { CHIP_FLIGHT_DURATION } from './animationTiming.js';

const ARC_HEIGHT = 0.12;

/**
 * ChipFlight.jsx
 * ---------------------------------------------------------------------------
 * One transient chip mesh thrown from `from` to `to` along an arc (GSAP-
 * eased, sine-shaped height bump), then calls `onComplete` so the owning
 * list in GameScreen.jsx can drop this entry. Purely decorative flourish
 * layered over the reactive resting stacks (ChipStackMesh.jsx) - it never
 * represents authoritative bet state itself.
 */
function ChipFlight({ from, to, value, onComplete }) {
  const groupRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const proxy = { t: 0 };
    const tween = gsap.to(proxy, {
      t: 1,
      duration: CHIP_FLIGHT_DURATION,
      ease: 'power1.inOut',
      onUpdate: () => {
        const group = groupRef.current;
        if (!group) return;
        const arc = Math.sin(proxy.t * Math.PI) * ARC_HEIGHT;
        group.position.set(
          THREE.MathUtils.lerp(from.x, to.x, proxy.t),
          THREE.MathUtils.lerp(from.y, to.y, proxy.t) + arc,
          THREE.MathUtils.lerp(from.z, to.z, proxy.t)
        );
      },
      onComplete: () => onCompleteRef.current?.(),
    });
    return () => tween.kill();
    // Intentionally run once per mounted flight (a fresh ChipFlight instance
    // is mounted per throw via a React `key`, see TableAnimationLayer.jsx).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <group ref={groupRef} position={[from.x, from.y, from.z]}>
      <ChipModel value={value} />
    </group>
  );
}

export default ChipFlight;
