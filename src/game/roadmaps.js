/**
 * roadmaps.js
 * ---------------------------------------------------------------------------
 * Pure derivations of the standard baccarat scoreboards ("roadmaps") from a
 * chronological hand-result history. Every function here takes plain data -
 * an array of 'PLAYER' | 'BANKER' | 'TIE' outcomes, in play order, as emitted
 * by the rules engine's EVALUATE_WINNER event (`result.winner`) - and
 * returns plain data. No rendering, no DOM, no React live here; this module
 * never re-derives a winner, it only reshapes an already-decided sequence of
 * winners into the score-history views baccarat players expect. If a
 * roadmap mark ever disagrees with the engine, the bug is here, never a
 * second copy of the rules.
 *
 * Two roadmaps:
 *  - Bead Plate: the raw chronological record, one cell per hand.
 *  - Big Road: a column-based streak grid. A tie does not start a new
 *    column or end a streak - it annotates the current cell. A change of
 *    winner (PLAYER <-> BANKER) starts a new column.
 */

/** @typedef {'PLAYER'|'BANKER'|'TIE'} HandWinner */

/**
 * @typedef {Object} BeadPlateCell
 * @property {number} index - 0-based position in play order.
 * @property {HandWinner} result
 */

/**
 * Bead Plate: the raw chronological history, one cell per hand, ties
 * included as their own cells. Purely positional - no streak logic, no
 * column grouping (that's Big Road's job).
 *
 * @param {HandWinner[]} history
 * @returns {BeadPlateCell[]}
 */
export function beadPlate(history) {
  return history.map((result, index) => ({ index, result }));
}

/**
 * @typedef {Object} BigRoadCell
 * @property {number} ties - Number of ties recorded against this cell
 *   (0 if none). A tie never occupies a cell of its own; it annotates
 *   whichever cell was most recently placed at the time it occurred.
 */

/**
 * @typedef {Object} BigRoadColumn
 * @property {'PLAYER'|'BANKER'} result - The winner this whole column streaks on.
 * @property {BigRoadCell[]} cells - One entry per non-tie hand in the
 *   streak, in chronological (top-to-bottom) order.
 */

/**
 * @typedef {Object} BigRoadResult
 * @property {BigRoadColumn[]} columns
 * @property {number} leadingTies - Ties that occurred before the first
 *   PLAYER/BANKER result was recorded, so there was no cell yet for them
 *   to attach to.
 */

/**
 * Big Road: the primary column-streak grid every other road is derived
 * from. A PLAYER/BANKER result that matches the current column's winner
 * extends it (a new row); a result that differs starts a new column
 * immediately to the right. A TIE never starts a column and never breaks a
 * streak - it annotates whichever cell was most recently placed. A TIE (or
 * run of ties) occurring before any PLAYER/BANKER result has no cell to
 * attach to and is counted in `leadingTies` instead.
 *
 * @param {HandWinner[]} history
 * @returns {BigRoadResult}
 */
export function bigRoad(history) {
  /** @type {BigRoadColumn[]} */
  const columns = [];
  let leadingTies = 0;

  for (const result of history) {
    if (result === 'TIE') {
      if (columns.length === 0) {
        leadingTies += 1;
        continue;
      }
      const lastColumn = columns[columns.length - 1];
      const lastCell = lastColumn.cells[lastColumn.cells.length - 1];
      lastCell.ties += 1;
      continue;
    }

    const lastColumn = columns[columns.length - 1];
    if (lastColumn && lastColumn.result === result) {
      lastColumn.cells.push({ ties: 0 });
    } else {
      columns.push({ result, cells: [{ ties: 0 }] });
    }
  }

  return { columns, leadingTies };
}
