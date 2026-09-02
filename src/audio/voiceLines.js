/**
 * voiceLines.js
 * ---------------------------------------------------------------------------
 * The dealer's spoken lines, via the browser's built-in `window.speechSynthesis`
 * (Web Speech API) - no audio asset files, no TTS network call. Every line is
 * declared here as ONE explicit, inspectable table entry mapping a symbolic
 * cue id (drawn straight from src/game/stateMachine.js's EVENT_TYPES, plus
 * two UI-level moments - a fresh betting round opening, and betting closing -
 * that GameScreen.jsx already knows the timing of) to a `getText(payload)`
 * function. Adding a line (or a second language - see `LOCALE` below) means
 * adding/branching one table entry, never scattering a new inline conditional
 * somewhere in GameScreen.jsx.
 *
 * This module owns *what* to say and *when it's asked to* - useCasinoAudio.js
 * owns actually calling speechSynthesis.speak() and cleanup.
 */

/** @typedef {import('../game/stateMachine.js').GameEvent} GameEvent */

/** Cue ids this table maps lines for. The first two are UI-level moments
 * (no 1:1 stateMachine.EVENT_TYPES entry - see file header); the rest match
 * EVENT_TYPES entries directly. */
export const VOICE_CUES = Object.freeze({
  BETS_OPEN: 'BETS_OPEN',
  BETTING_CLOSED: 'BETTING_CLOSED',
  PLAYER_DRAW: 'PLAYER_DRAW',
  BANKER_DRAW: 'BANKER_DRAW',
  RESULT: 'RESULT',
});

function ordinalTotal(total) {
  return `${total}`;
}

/**
 * Explicit cue -> line table. Each entry's `getText(payload)` returns the
 * exact string passed to `new SpeechSynthesisUtterance(...)`. Kept as data
 * (not inline conditionals in GameScreen.jsx) specifically so a second
 * locale/voice pack is a matter of adding a sibling table and a lookup key,
 * not touching call sites.
 */
export const VOICE_LINES = Object.freeze({
  [VOICE_CUES.BETS_OPEN]: {
    getText: () => 'Place your bets.',
  },
  [VOICE_CUES.BETTING_CLOSED]: {
    getText: () => 'No more bets.',
  },
  [VOICE_CUES.PLAYER_DRAW]: {
    getText: () => 'Player draws a card.',
  },
  [VOICE_CUES.BANKER_DRAW]: {
    getText: () => 'Banker draws a card.',
  },
  // payload: { winner: 'PLAYER'|'BANKER'|'TIE', playerTotal, bankerTotal } -
  // the EVALUATE_WINNER/PAYOUT-adjacent shape GameScreen.jsx already holds
  // in `outcome.result` by the time the hand settles.
  [VOICE_CUES.RESULT]: {
    getText: ({ winner, playerTotal, bankerTotal } = {}) => {
      if (winner === 'TIE') return `Tie, ${ordinalTotal(playerTotal)}-${ordinalTotal(bankerTotal)}.`;
      if (winner === 'PLAYER') return `Player wins with ${ordinalTotal(playerTotal)}.`;
      if (winner === 'BANKER') return `Banker wins with ${ordinalTotal(bankerTotal)}.`;
      return '';
    },
  },
});

/** Resolves a cue id + payload straight to spoken text, or '' for an unknown
 * cue (fails silent - a missing mapping should never throw mid-hand). */
export function resolveVoiceLine(cueId, payload) {
  const entry = VOICE_LINES[cueId];
  if (!entry) return '';
  return entry.getText(payload) || '';
}
