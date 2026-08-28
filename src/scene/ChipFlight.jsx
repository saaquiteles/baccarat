import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { CHIP_RADIUS, CHIP_HEIGHT } from './ChipRack.jsx';
import { CHIP_MATERIAL_PROPS } from './materials.js';
import { CHIP_FLIGHT_DURATION } from './animationTiming.js';

const chipGeometry = new THREE.CylinderGeometry(CHIP_RADIUS, CHIP_RADIUS, CHIP_HEIGHT, 20);
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
function ChipFlight({ from, to, color, onComplete }) {
  const meshRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const materialColor = useMemo(() => new THREE.Color(color), [color]);

  useEffect(() => {
    const proxy = { t: 0 };
    const tween = gsap.to(proxy, {
      t: 1,
      duration: CHIP_FLIGHT_DURATION,
      ease: 'power1.inOut',
      onUpdate: () => {
        const mesh = meshRef.current;
        if (!mesh) return;
        const arc = Math.sin(proxy.t * Math.PI) * ARC_HEIGHT;
        mesh.position.set(
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
    <mesh ref={meshRef} position={[from.x, from.y, from.z]} geometry={chipGeometry} castShadow>
      <meshStandardMaterial {...CHIP_MATERIAL_PROPS} color={materialColor} />
    </mesh>
  );
}

export default ChipFlight;
