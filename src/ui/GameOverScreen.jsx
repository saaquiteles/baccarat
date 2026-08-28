/**
 * GameOverScreen.jsx
 * ---------------------------------------------------------------------------
 * A blocking modal shown once the player's balance hits exactly 0 with no
 * hand in progress - at that point no chip denomination is affordable
 * (the smallest is 1), so without this the betting board and Deal button
 * would just sit permanently disabled with no way forward. "Try Again"
 * resets the session (fresh shoe, starting balance, empty roadmap history);
 * "Back to Menu" is the same exit the header's back link already offers, so
 * this is never a dead end even without Try Again.
 */
function GameOverScreen({ onTryAgain, onExit }) {
  return (
    <div className="game-over-overlay" role="alertdialog" aria-modal="true" aria-label="Game over">
      <div className="game-over-card">
        <h2>Game Over</h2>
        <p>You&rsquo;re out of chips.</p>
        <div className="game-over-actions">
          <button type="button" className="game-over-action game-over-action--primary" onClick={onTryAgain}>
            Try Again
          </button>
          {onExit && (
            <button type="button" className="game-over-action" onClick={onExit}>
              Back to Menu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameOverScreen;
