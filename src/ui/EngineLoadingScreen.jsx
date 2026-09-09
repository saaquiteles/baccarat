import buriccatLogoStacked from '../assets/logos/buriccat-logo-stacked.svg';

/**
 * EngineLoadingScreen.jsx
 * ---------------------------------------------------------------------------
 * The overlay shown by GameScreenLoader.jsx while GameScreen's lazy chunk
 * (three.js/R3F/drei/postprocessing/GSAP) loads. `loaded`/`total` are real
 * bytes tracked against the chunk's own Content-Length by
 * gameEnginePreload.js - when `total` is 0 (dev server, or the chunk was
 * already cached from an earlier prefetch) there is nothing genuine to show
 * a percentage for, so this renders an indeterminate sweep instead of
 * inventing a number. `ready` means the module has finished evaluating and
 * GameScreen is already mounted (invisible) behind this overlay, warming up
 * its first real WebGL frames before the reveal fade GameScreenLoader drives.
 */
function EngineLoadingScreen({ loaded, total, ready }) {
  const known = total > 0;
  const percent = known ? Math.min(99, Math.round((loaded / total) * 100)) : null;
  const displayPercent = ready ? 100 : percent;

  let label = 'Loading the table…';
  if (known && !ready) label = `Loading the table… ${percent}%`;
  if (ready) label = 'Dealer is ready';

  return (
    <div className="engine-loading" role="status" aria-live="polite">
      <img src={buriccatLogoStacked} alt="Buriccat" className="engine-loading-logo" />

      <div className={`engine-loading-chip${ready ? ' engine-loading-chip--ready' : ''}`} aria-hidden="true">
        <span className="engine-loading-chip-face" />
      </div>

      <div className="engine-loading-bar-track">
        <div
          className={`engine-loading-bar-fill${known || ready ? '' : ' engine-loading-bar-fill--indeterminate'}`}
          style={known || ready ? { transform: `scaleX(${displayPercent / 100})` } : undefined}
        />
      </div>

      <p className="engine-loading-label">{label}</p>
    </div>
  );
}

export default EngineLoadingScreen;
