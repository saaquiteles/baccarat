import { useMemo } from 'react';
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
 */

function RoadmapPanel({ history }) {
  const beadCells = useMemo(() => beadPlate(history), [history]);
  const bigRoadResult = useMemo(() => bigRoad(history), [history]);

  return (
    <section className="roadmap-panel" aria-label="Score history roadmaps">
      <div className="roadmap roadmap--bead-plate">
        <h3>Bead Plate</h3>
        <BeadPlate cells={beadCells} />
      </div>

      <div className="roadmap roadmap--big-road">
        <h3>Big Road</h3>
        <BigRoad columns={bigRoadResult.columns} leadingTies={bigRoadResult.leadingTies} />
      </div>
    </section>
  );
}

export default RoadmapPanel;
