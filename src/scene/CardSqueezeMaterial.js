import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

/**
 * CardSqueezeMaterial.js
 * ---------------------------------------------------------------------------
 * Custom ShaderMaterial (via drei's `shaderMaterial` helper) that gives a
 * face-down card its progressive "squeeze" bend: the edge nearest the
 * player curls upward as `uSqueeze` rises from 0 (flat on the felt) to 1
 * (fully peeled), applied as a vertex displacement so it works on any
 * geometry with enough segments along its length (see Card.jsx, which builds
 * the card body with extra depth-segments for exactly this purpose).
 *
 * Deliberately carries NO information about the card's rank/suit - the only
 * per-hand state it exposes is `uRevealed` (0 or 1, flipped by JS only once
 * a squeeze crosses the completion threshold), which just swaps a flat
 * back/face color. The actual rank+suit content lives in a sibling <Text>
 * mesh (see Card.jsx) that is only mounted/visible once `uRevealed` (and the
 * matching React `revealed` prop) is true - so there is no gradual pixel-by-
 * pixel leak of the card's value while squeezing, no matter how the drag is
 * interrupted.
 */
const CardSqueezeMaterial = shaderMaterial(
  {
    uSqueeze: 0,
    uRevealed: 0,
    uHalfLength: 0.035,
    uMaxLift: 0.02,
    uBackColor: new THREE.Color('#0d2f52'),
    uFaceColor: new THREE.Color('#f3ecd9'),
    uHighlight: new THREE.Color('#d9b45a'),
  },
  // Vertex shader: bends the far edge (z = -uHalfLength) as the pinned
  // point, curling the near edge (z = +uHalfLength) up and slightly back as
  // uSqueeze increases. Not a physically exact arc-length bend - a smooth
  // power curve is stable at uSqueeze = 0 (no div-by-zero) and reads fine at
  // card scale.
  /* glsl */ `
    uniform float uSqueeze;
    uniform float uHalfLength;
    uniform float uMaxLift;
    varying float vT;
    varying vec2 vUv;

    void main() {
      vec3 pos = position;
      float t = clamp((position.z + uHalfLength) / (2.0 * uHalfLength), 0.0, 1.0);
      float curl = pow(t, 1.6);
      pos.y += uSqueeze * uMaxLift * curl;
      pos.z -= uSqueeze * uMaxLift * 0.55 * t * t;
      vT = t;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment shader: flat back/face color swap (discrete, driven by
  // uRevealed) plus a purely cosmetic brass highlight pulse near the curling
  // edge while squeezing a still-hidden card - never a function of the
  // card's actual rank/suit.
  /* glsl */ `
    uniform float uSqueeze;
    uniform float uRevealed;
    uniform vec3 uBackColor;
    uniform vec3 uFaceColor;
    uniform vec3 uHighlight;
    varying float vT;
    varying vec2 vUv;

    void main() {
      vec3 base = mix(uBackColor, uFaceColor, uRevealed);

      // Simple diamond lattice on the card back so it doesn't read as a flat
      // color block from a distance.
      float lattice = step(0.92, max(
        fract(vUv.x * 10.0 + vUv.y * 10.0),
        fract(vUv.x * 10.0 - vUv.y * 10.0)
      ));
      base += lattice * (1.0 - uRevealed) * 0.05;

      float pulse = (1.0 - uRevealed) * uSqueeze * smoothstep(0.0, 1.0, vT) * 0.5;
      vec3 color = base + uHighlight * pulse;
      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ CardSqueezeMaterial });

export default CardSqueezeMaterial;
