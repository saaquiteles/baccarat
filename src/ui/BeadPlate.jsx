import { ROAD_ROWS, OUTCOME_COLOR } from './constants.js';
import { CELL_SIZE } from './RoadColumns.jsx';

/**
 * BeadPlate.jsx
 * ---------------------------------------------------------------------------
 * Renders the raw chronological hand history produced by
 * `beadPlate(history)` (src/game/roadmaps.js): one small marker per hand,
 * filled top-to-bottom then wrapping to a new column every `ROAD_ROWS`
 * hands. This fixed-height wrap is purely a layout choice (unlike Big
 * Road's streak-based columns) and lives here rather than in the pure
 * derivation module.
 */

function chunkIntoColumns(cells, rows) {
  const columns = [];
  for (let i = 0; i < cells.length; i += rows) {
    columns.push(cells.slice(i, i + rows));
  }
  return columns;
}

function BeadPlate({ cells }) {
  const columns = chunkIntoColumns(cells, ROAD_ROWS);

  if (columns.length === 0) {
    return <div className="road-columns road-columns--empty">No hands dealt yet</div>;
  }

  return (
    <div className="road-columns">
      {columns.map((column, colIndex) => (
        <div className="road-column" key={colIndex} style={{ minHeight: ROAD_ROWS * CELL_SIZE }}>
          {column.map((beadCell) => (
            <div className="road-cell" key={beadCell.index}>
              <span
                className="bead-mark"
                style={{ '--mark-color': OUTCOME_COLOR[beadCell.result] }}
                title={`Hand ${beadCell.index + 1}: ${beadCell.result}`}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default BeadPlate;
