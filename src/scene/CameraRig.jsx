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

/** Every fov in layout.js's CAMERA_VIEWS was framed and verified (see its
 * doc comments) against a canvas roughly this wide relative to its height -
 * a typical desktop landscape window, not the full range this canvas now
 * has to cover now that it's a full-bleed HUD background behind every
 * screen size. Holding *horizontal* FOV constant relative to this reference
 * (see effectiveFov below) means a container at this aspect gets exactly
 * the tuned/verified framing back, while a narrower (portrait phone) or
 * wider (ultrawide monitor) container still sees the same horizontal slice
 * of the table instead of having it cropped or shrunk to a sliver. */
const REFERENCE_ASPECT = 16 / 9;

/** Degenerate aspect ratios (a very tall sliver or a very wide banner)
 * would otherwise drive the compensated vertical fov toward 0 or 180 -
 * clamped to a range that still reads as "a camera view", never a
 * mathematically-correct but unusable one. */
const MIN_EFFECTIVE_FOV = 22;
const MAX_EFFECTIVE_FOV = 72;

function toVector3(v) {
  return new THREE.Vector3(v.x, v.y, v.z);
}

/** Given a view's tuned vertical fov (degrees, framed at REFERENCE_ASPECT)
 * and the canvas's actual current aspect ratio, returns the vertical fov
 * that keeps the *horizontal* field of view the same as it was at
 * REFERENCE_ASPECT - the standard "Hor+" scaling used to adapt a fixed
 * composition across aspect ratios without cropping its sides. */
function effectiveFov(baseFovDeg, aspect) {
  const baseHalfV = THREE.MathUtils.degToRad(baseFovDeg) / 2;
  const halfH = Math.atan(Math.tan(baseHalfV) * REFERENCE_ASPECT);
  const compensatedHalfV = Math.atan(Math.tan(halfH) / Math.max(aspect, 0.0001));
  return THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(compensatedHalfV) * 2, MIN_EFFECTIVE_FOV, MAX_EFFECTIVE_FOV);
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
    const { camera, size } = state;
    const view = CAMERA_VIEWS[activeView] ?? CAMERA_VIEWS[DEFAULT_CAMERA_VIEW];
    desiredPosition.set(view.position.x, view.position.y, view.position.z);
    desiredTarget.set(view.target.x, view.target.y, view.target.z);
    const targetFov = effectiveFov(view.fov, size.width / size.height);

    // Frame-rate independent exponential ease-toward, so a slow frame
    // doesn't overshoot and a fast frame doesn't stall.
    const t = 1 - Math.exp(-EASE_RATE * delta);

    currentPosition.lerp(desiredPosition, t);
    currentTarget.lerp(desiredTarget, t);
    currentFov.current += (targetFov - currentFov.current) * t;

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
