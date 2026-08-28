import { describe, it, expect } from 'vitest';
import { beadPlate, bigRoad } from '../../src/game/roadmaps.js';

// Shorthand cell builders so reference expectations read as plainly as
// possible next to the hand-traced comments explaining them.
function cell(ties = 0) {
  return { ties };
}
function col(result, cells) {
  return { result, cells };
}

describe('beadPlate', () => {
  it('returns an empty grid for no history', () => {
    expect(beadPlate([])).toEqual([]);
  });

  it('records every hand in order, including ties, with no streak logic', () => {
    const history = ['PLAYER', 'TIE', 'BANKER', 'BANKER'];
    expect(beadPlate(history)).toEqual([
      { index: 0, result: 'PLAYER' },
      { index: 1, result: 'TIE' },
      { index: 2, result: 'BANKER' },
      { index: 3, result: 'BANKER' },
    ]);
  });
});

describe('bigRoad', () => {
  it('produces no columns and no leading ties for an empty history', () => {
    expect(bigRoad([])).toEqual({ columns: [], leadingTies: 0 });
  });

  it('counts ties before the first decision as leadingTies, with no columns', () => {
    expect(bigRoad(['TIE', 'TIE'])).toEqual({ columns: [], leadingTies: 2 });
  });

  it('starts a single column on the first non-tie result', () => {
    expect(bigRoad(['BANKER'])).toEqual({
      columns: [col('BANKER', [cell()])],
      leadingTies: 0,
    });
  });

  it('extends a column while the winner repeats, and starts a new column on change', () => {
    // B,B,P,P,P,B -> [B len2][P len3][B len1], hand-traced in the roadmap-ui
    // spec's reference derivation.
    const history = ['BANKER', 'BANKER', 'PLAYER', 'PLAYER', 'PLAYER', 'BANKER'];
    expect(bigRoad(history)).toEqual({
      columns: [
        col('BANKER', [cell(), cell()]),
        col('PLAYER', [cell(), cell(), cell()]),
        col('BANKER', [cell()]),
      ],
      leadingTies: 0,
    });
  });

  it('marks a tie against the current cell instead of starting a new column', () => {
    // B,P,TIE,P -> the tie lands on the P column's first (and only, so far)
    // cell; the next P then extends that same column rather than starting
    // a new one - this is the "tie immediately after a streak change" case.
    const history = ['BANKER', 'PLAYER', 'TIE', 'PLAYER'];
    expect(bigRoad(history)).toEqual({
      columns: [col('BANKER', [cell()]), col('PLAYER', [cell(1), cell(0)])],
      leadingTies: 0,
    });
  });

  it('accumulates multiple consecutive ties on the same cell', () => {
    const history = ['BANKER', 'TIE', 'TIE', 'BANKER'];
    expect(bigRoad(history)).toEqual({
      columns: [col('BANKER', [cell(2), cell(0)])],
      leadingTies: 0,
    });
  });

  it('matches a fully hand-traced 14-hand reference sequence, including a leading tie', () => {
    const history = [
      'TIE',
      'BANKER',
      'BANKER',
      'TIE',
      'PLAYER',
      'BANKER',
      'BANKER',
      'BANKER',
      'PLAYER',
      'PLAYER',
      'BANKER',
      'PLAYER',
      'BANKER',
      'BANKER',
    ];
    expect(bigRoad(history)).toEqual({
      columns: [
        col('BANKER', [cell(0), cell(1)]), // hands 2-3, tie #4 marks the 2nd cell
        col('PLAYER', [cell()]), // hand 5
        col('BANKER', [cell(), cell(), cell()]), // hands 6-8
        col('PLAYER', [cell(), cell()]), // hands 9-10
        col('BANKER', [cell()]), // hand 11
        col('PLAYER', [cell()]), // hand 12
        col('BANKER', [cell(), cell()]), // hands 13-14
      ],
      leadingTies: 1,
    });
  });
});
