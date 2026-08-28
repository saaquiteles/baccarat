/**
 * RoadColumns.jsx
 * ---------------------------------------------------------------------------
 * Shared column-grid layout for every roadmap that is column/streak shaped
 * (Big Road, Big Eye Boy, Small Road, Cockroach Pig). Purely a rendering
 * concern: it lays out whatever `columns` it is given (produced by the pure
 * functions in src/game/roadmaps.js) into a scrollable grid of fixed-size
 * cells. It never inspects hand results itself.
 *
 * A column taller than `rows` (a long streak) is rendered at its full
 * height rather than "dragon-tail" wrapping into a new column to its right
 * the way a physical casino board would - a deliberate simplification for
 * this non-animated prototype.
 */

export const CELL_SIZE = 22;

function RoadColumns({ columns, rows = 6, renderCell, emptyLabel, className = '' }) {
  if (columns.length === 0) {
    return <div className="road-columns road-columns--empty">{emptyLabel}</div>;
  }

  return (
    <div className={`road-columns ${className}`.trim()}>
      {columns.map((column, colIndex) => (
        <div
          className="road-column"
          key={colIndex}
          style={{ minHeight: rows * CELL_SIZE }}
        >
          {column.cells.map((cellData, rowIndex) => (
            <div className="road-cell" key={rowIndex}>
              {renderCell(cellData, column, rowIndex, colIndex)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default RoadColumns;
