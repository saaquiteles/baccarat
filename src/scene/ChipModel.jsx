import { useEffect, useMemo, useState } from 'react';
import { loadChipModelScene } from './chipModels.js';

/**
 * ChipModel.jsx
 * ---------------------------------------------------------------------------
 * Renders one physical chip for a given denomination `value`, using the real
 * modeled/textured GLTF asset (see chipModels.js) instead of a procedural
 * cylinder.
 *
 * Deliberately plain useState/useEffect, not drei's `useGLTF` (which
 * suspends via React Suspense) - see chipModels.js's doc comment for why:
 * concurrent GLTFLoader parses reliably hung in this stack, so loading is
 * serialized through one queue and awaited here as an ordinary promise
 * instead. Renders nothing on its very first mount until its denomination's
 * model resolves (usually near-instant), and - if `value` ever changes on an
 * already-mounted instance (a stack's chip-at-this-index denomination
 * shifted) - keeps showing the *previous* denomination's chip until the new
 * one is ready rather than flashing blank in between. Once loaded, clones the
 * shared cached scene: `scene.clone(true)` deep-clones the node hierarchy
 * while leaving geometries/materials shared by reference, which is exactly
 * what's wanted - many independently-positioned chips, one copy of each
 * mesh's data. `castShadow`/`receiveShadow` are set directly on each cloned
 * mesh - passing them as props on `<primitive>` would only set them on the
 * root Group, which three.js's shadow pass doesn't propagate to children.
 */
function ChipModel({ value, ...groupProps }) {
  const [baseScene, setBaseScene] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadChipModelScene(value)
      .then((scene) => {
        if (!cancelled) setBaseScene(scene);
      })
      .catch(() => {
        // Missing/corrupt model - fail silent (an absent chip visual isn't
        // worth crashing the table over), matching this scene's existing
        // philosophy elsewhere (e.g. audioEngine.js never throws either).
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const instance = useMemo(() => {
    if (!baseScene) return null;
    const clone = baseScene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [baseScene]);

  if (!instance) return null;
  return <primitive object={instance} {...groupProps} />;
}

export default ChipModel;
