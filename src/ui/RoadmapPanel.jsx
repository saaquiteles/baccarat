import { useMemo, useState } from 'react';
import { beadPlate, bigRoad } from '../game/roadmaps.js';
import BeadPlate from './BeadPlate.jsx';
import BigRoad from './BigRoad.jsx';

/**
 * RoadmapPanel.jsx
 * ---------------------------------------------------------------------------
 * Wires the pure roadmap derivations (src/game/roadmaps.js) to their
 * renderers. `history` is nothing more than the ordered list of
 * `result.winner` values the rules engine has emitted this shoe - every
 * roadmap below is recomputed from it and only it.
 *
 * Rendered inside BettingBoard's own docked HUD bar (see
 * .betting-board-roadmaps in App.css), not as a separate widget floating
 * over the felt - keeping it inside the same opaque bar the betting spots
 * already sit in means it can never additionally cover a dealt card on a
 * small screen. Collapsible via its own toggle so it never forces extra
 * scroll height when the bar is already tight on narrow screens.
 */

function RoadmapPanel({ history }) {
  const beadCells = useMemo(() => beadPlate(history), [history]);
  const bigRoadResult = useMemo(() => bigRoad(history), [history]);
  const [expanded, setExpanded] = useState(true);

  return (
    <section className={`roadmap-panel${expanded ? '' : ' roadmap-panel--collapsed'}`} aria-label="Score history roadmaps">
      <button
        type="button"
        className="roadmap-panel-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span> Roadmaps
      </button>

      {expanded && (
        <div className="roadmap-panel-body">
          <div className="roadmap roadmap--bead-plate">
            <h3>Bead Plate</h3>
            <BeadPlate cells={beadCells} />
          </div>

          <div className="roadmap roadmap--big-road">
            <h3>Big Road</h3>
            <BigRoad columns={bigRoadResult.columns} leadingTies={bigRoadResult.leadingTies} />
          </div>
        </div>
      )}
    </section>
  );
}

export default RoadmapPanel;
