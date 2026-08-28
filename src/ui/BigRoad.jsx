import RoadColumns from './RoadColumns.jsx';
import { OUTCOME_COLOR } from './constants.js';

/**
 * BigRoad.jsx
 * ---------------------------------------------------------------------------
 * Renders `bigRoad(history)` (src/game/roadmaps.js): one column per streak,
 * one marker per non-tie hand. A cell whose `ties` count is > 0 gets a
 * diagonal tie slash overlaid (with the count, if more than one tie landed
 * on the same cell) rather than a cell of its own - matching the derivation
 * rule that ties annotate the current cell instead of starting a new one.
 */

function BigRoad({ columns, leadingTies }) {
  return (
    <div>
      {leadingTies > 0 && (
        <p className="road-note">
          {leadingTies} tie{leadingTies === 1 ? '' : 's'} before the first decided hand (not
          shown - no cell to mark yet)
        </p>
      )}
      <RoadColumns
        columns={columns}
        emptyLabel="No hands dealt yet"
        renderCell={(cell, column) => (
          <span
            className="big-road-mark"
            style={{ '--mark-color': OUTCOME_COLOR[column.result] }}
            title={`${column.result}${cell.ties ? ` (+${cell.ties} tie${cell.ties === 1 ? '' : 's'})` : ''}`}
          >
            {cell.ties > 0 && (
              <span className="tie-slash">{cell.ties > 1 ? cell.ties : ''}</span>
            )}
          </span>
        )}
      />
    </div>
  );
}

export default BigRoad;
