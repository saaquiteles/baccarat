import { useState } from 'react';
import buriccatLogoStacked from '../assets/logos/buriccat-logo-stacked.svg';

/**
 * MenuScreen.jsx
 * ---------------------------------------------------------------------------
 * The game's title/intro screen: the stacked logo plus a short vertical
 * menu of actions. "How to Play" is a purely informational toggle local to
 * this component - it doesn't correspond to any persisted setting, so it
 * isn't lifted into App.jsx state.
 */
function MenuScreen({ onPlay, onOpenSettings }) {
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

  return (
    <div className="menu-screen">
      <img src={buriccatLogoStacked} alt="Buriccat" className="menu-logo" />

      <nav className="menu-actions" aria-label="Main menu">
        <button type="button" className="menu-action menu-action--primary" onClick={onPlay}>
          Play
        </button>
        <button type="button" className="menu-action" onClick={onOpenSettings}>
          Settings
        </button>
        <button
          type="button"
          className="menu-action"
          aria-expanded={howToPlayOpen}
          onClick={() => setHowToPlayOpen((open) => !open)}
        >
          How to Play
        </button>
      </nav>

      {howToPlayOpen && (
        <section className="how-to-play" aria-label="How to play">
          <h2>How to Play</h2>
          <p>
            Punto Banco (Baccarat) is a simple comparing game: bet on whether the
            <strong> Player</strong> hand, the <strong> Banker</strong> hand, or a
            <strong> Tie</strong> will have a point total closer to 9.
          </p>
          <p>
            Both hands are dealt two cards each, drawing a third under fixed
            rules. Player and Banker both pay even money (1:1) - Banker wins
            usually cost a small commission, since Banker has the statistical
            edge. Tie pays 8:1 and returns Player/Banker stakes untouched. Five
            optional side bets (Player Pair, Banker Pair, Perfect Pair, Dragon
            7, Panda 8) can be staked alongside the main bet each hand.
          </p>
          <p>
            The exact commission rule can be changed from the Settings screen.
          </p>
        </section>
      )}
    </div>
  );
}

export default MenuScreen;
