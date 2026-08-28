import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { CAMERA_VIEWS, DEFAULT_CAMERA_VIEW } from './layout.js';

/** How quickly the camera eases toward a newly-selected view. Larger =
 * snappier, smaller = more languid. Used as an exponential damping rate so
 * the motion is frame-rate independent and always eases (never a hard
 * cut), matching the "smooth eased interpolation between camera rigs"
 * requirement. */
const EASE_RATE = 3.2;

function toVector3(v) {
  return new THREE.Vector3(v.x, v.y, v.z);
}

/**
 * CameraRig.jsx
 * ---------------------------------------------------------------------------
 * Owns the single render camera and smoothly eases its position, look-at
 * target and field of view toward whichever named view (see layout.js
 * CAMERA_VIEWS) is currently active, every frame - there is never a hard
 * cut between "Overhead Betting View", "Dealing View" and "Close-Up Result
 * View".
 *
 * `activeView` is one of layout.js's CAMERA_VIEW_IDS. Unknown/undefined
 * values fall back to DEFAULT_CAMERA_VIEW so the rig never throws on a
 * stale or not-yet-set prop.
 */
function CameraRig({ activeView }) {
  const initialView = CAMERA_VIEWS[activeView] ?? CAMERA_VIEWS[DEFAULT_CAMERA_VIEW];

  const currentPosition = useMemo(() => toVector3(initialView.position), [initialView]);
  const currentTarget = useMemo(() => toVector3(initialView.target), [initialView]);
  const currentFov = useRef(initialView.fov);

  const desiredPosition = useMemo(() => new THREE.Vector3(), []);
  const desiredTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const { camera } = state;
    const view = CAMERA_VIEWS[activeView] ?? CAMERA_VIEWS[DEFAULT_CAMERA_VIEW];
    desiredPosition.set(view.position.x, view.position.y, view.position.z);
    desiredTarget.set(view.target.x, view.target.y, view.target.z);

    // Frame-rate independent exponential ease-toward, so a slow frame
    // doesn't overshoot and a fast frame doesn't stall.
    const t = 1 - Math.exp(-EASE_RATE * delta);

    currentPosition.lerp(desiredPosition, t);
    currentTarget.lerp(desiredTarget, t);
    currentFov.current += (view.fov - currentFov.current) * t;

    camera.position.copy(currentPosition);
    camera.up.set(0, 1, 0);
    camera.lookAt(currentTarget);

    if (Math.abs(camera.fov - currentFov.current) > 0.001) {
      camera.fov = currentFov.current;
      camera.updateProjectionMatrix();
    }
  });

  return (
    <PerspectiveCamera
      makeDefault
      fov={initialView.fov}
      near={0.05}
      far={20}
      position={[initialView.position.x, initialView.position.y, initialView.position.z]}
    />
  );
}

export default CameraRig;
