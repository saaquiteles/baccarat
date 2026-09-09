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

/** How much of the canvas the topbar+bottom-dock HUD chrome is allowed to
 * count as "occluded" before more zoom stops helping - past this point the
 * docked betting board is tall enough (a phone with every side bet and the
 * roadmap panel open) that no amount of zoom keeps the felt legible, so the
 * safe-area compensation caps out rather than zooming toward a sliver. */
const MAX_OCCLUDED_FRACTION = 0.55;

/** At MAX_OCCLUDED_FRACTION, the virtual frame CameraRig renders into is
 * this much taller/wider than the actual canvas - i.e. how far the table
 * "increases" (zooms in) on the most cramped screens, so proportionally
 * more of the still-visible canvas is filled with felt/cards instead of
 * empty space above the docked HUD. Purely a safe-area compensation, not a
 * replacement for the aspect-ratio (Hor+) compensation below. */
const MAX_SAFE_AREA_ZOOM = 1.1;

/** Of the total vertical shift a fully-asymmetric (all-bottom, no-top)
 * occlusion would call for, only this fraction is actually applied - a
 * partial correction reads as "the table adapted to make room", while a
 * full correction can push the felt's back rail out of frame at the top. */
const VERTICAL_SHIFT_STRENGTH = 0.8;

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
 *
 * `hudInsets` ({top, bottom} in CSS pixels, see useHudInsets.js) is the
 * live height of the topbar/bottom-dock HUD chrome overlaid on the canvas.
 * Rather than re-tuning every CAMERA_VIEWS position/target/fov per screen
 * size, this rig applies a safe-area correction via
 * `camera.setViewOffset` - a small additional zoom (so the table's apparent
 * size grows as the docked HUD eats a bigger share of the canvas) plus an
 * upward pan (so felt/cards shift out from behind the mostly-bottom-docked
 * HUD) - layered on top of the existing Hor+ aspect compensation rather
 * than replacing it.
 */
function CameraRig({ activeView, hudInsets }) {
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

    const fovChanged = Math.abs(camera.fov - currentFov.current) > 0.001;
    camera.fov = currentFov.current;

    // setViewOffset (and clearViewOffset) already calls
    // updateProjectionMatrix() internally, so it's called at most once per
    // frame either way - never redundantly alongside a second explicit call
    // for the fov change above.
    const top = hudInsets?.top ?? 0;
    const bottom = hudInsets?.bottom ?? 0;
    const w = size.width;
    const h = size.height;
    if (w > 0 && h > 0 && (top > 0 || bottom > 0)) {
      const occludedFraction = THREE.MathUtils.clamp((top + bottom) / h, 0, MAX_OCCLUDED_FRACTION);
      const zoom = 1 + occludedFraction * (MAX_SAFE_AREA_ZOOM - 1);
      const fullW = w * zoom;
      const fullH = h * zoom;
      // Centered by default (both extra-zoom margins split evenly), then
      // biased upward in proportion to how much *more* is occluded at the
      // bottom than the top - a symmetric top+bottom HUD (rare) shifts
      // nothing, an all-bottom betting board (the common case) shifts most.
      // A larger offsetY shifts the rendered content up on screen (three.js
      // subtracts offsetY from the frustum's top/bottom bounds, which moves
      // a fixed world point closer to the frustum's - and therefore the
      // canvas's - top edge). The shift's own budget is independent of the
      // zoom margin above (occludedFraction * h, not fullH - h) so a pan
      // still applies even when occlusion is too small to justify any
      // extra zoom.
      const asymmetry = (bottom - top) / Math.max(top + bottom, 1);
      const verticalShift = occludedFraction * h * VERTICAL_SHIFT_STRENGTH * asymmetry;
      camera.setViewOffset(fullW, fullH, (fullW - w) / 2, (fullH - h) / 2 + verticalShift, w, h);
    } else if (camera.view?.enabled) {
      camera.clearViewOffset();
    } else if (fovChanged) {
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
