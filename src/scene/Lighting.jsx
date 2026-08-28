import { useEffect, useRef } from 'react';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { TABLE } from './layout.js';

/**
 * Lighting.jsx
 * ---------------------------------------------------------------------------
 * The table's lighting rig:
 *  - A key spotlight overhead, warm and tight like a casino pit light,
 *    the only real-time shadow caster in the scene.
 *  - A soft, shadowless fill light so shadows never crush to pure black.
 *  - drei's <ContactShadows> for a crisp, cheap contact shadow under the
 *    table instead of a large full-scene shadow map.
 *  - A small procedural (Lightformer-based) environment map so the brass
 *    trim and clear-coated wood get believable specular reflections
 *    without loading any external HDR file.
 *  - A restrained bloom pass tuned so only bright specular highlights
 *    (brass, chip edges) bloom - the matte felt stays well under the
 *    luminance threshold and never glows.
 */
function Lighting() {
  const spotRef = useRef(null);
  const targetRef = useRef(null);

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }
  }, []);

  return (
    <>
      {/* Key light: overhead spotlight, casino-pit-light warm white. */}
      <spotLight
        ref={spotRef}
        position={[0, 3.1, -0.25]}
        angle={0.52}
        penumbra={0.45}
        intensity={10}
        distance={8}
        decay={2}
        color="#fff3dd"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1.5}
        shadow-camera-far={5}
        shadow-bias={-0.0015}
      />
      <object3D ref={targetRef} position={[0, TABLE.height, 0.05]} />

      {/* Soft fill: dim, shadowless, slightly cool, from the opposite side
          so shadows read as soft grey rather than pure black. */}
      <spotLight
        position={[-1.6, 1.9, 1.4]}
        angle={0.75}
        penumbra={1}
        intensity={2.5}
        distance={7}
        decay={2}
        color="#cfe0ff"
      />
      <ambientLight intensity={0.28} color="#dfe6f2" />

      {/* Cheap, crisp contact shadow under the table instead of relying on
          a large full-scene shadow map. */}
      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.6}
        scale={4.5}
        blur={1.6}
        far={1.6}
        resolution={512}
        frames={1}
      />

      {/* Procedural environment (no external HDR file) for brass/wood
          specular reflections. */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} color="#fff7e6" position={[0, 4, 0]} scale={[3, 3, 1]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={0.6} color="#7ea8ff" position={[-3, 1.5, 2]} scale={[2, 2, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#ffb37e" position={[3, 1.5, -2]} scale={[2, 2, 1]} />
      </Environment>

      <EffectComposer multisampling={0}>
        <Bloom
          luminanceThreshold={0.82}
          luminanceSmoothing={0.25}
          intensity={0.45}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export default Lighting;
