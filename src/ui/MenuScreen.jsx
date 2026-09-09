import { useState } from 'react';
import buriccatLogoStacked from '../assets/logos/buriccat-logo-stacked.svg';

/**
 * MenuScreen.jsx
 * ---------------------------------------------------------------------------
 * <!--
 * THESIS: The main menu is the felt before the cards are dealt - it lives
 * in the same dark casino HUD world as the table itself, not a generic
 * light doc-site wrapper bolted in front of it.
 * OWN-WORLD: Deep near-black stage, felt-green-to-navy radial glow, gold
 * (#d6a22b/#e8be5a) rim/accent, cream (#f5eac2) primary text - Buriccat's
 * own established HUD palette (src/App.css), extended, not reinvented.
 * STORY: A player lands on a full-bleed, atmospherically-lit table screen,
 * sees the pixel-cat mark glow at center, and picks Play/Settings/How to
 * Play from gold-rimmed buttons matching the in-game HUD's own controls.
 * FIRST VIEWPORT: Full 100svh radial-vignette stage (svh, not dvh - it holds
 * steady while a mobile browser's chrome shows/hides, matching the app
 * shell's own #root sizing convention, rather than resizing under the
 * player mid-scroll), centered logo, three
 * stacked buttons (Play primary/gold-filled; Settings + How to Play as
 * gold-outlined ghost buttons) - no container edge or side whitespace at
 * any width.
 * FORM: Extension of Buriccat's established dark/gold casino HUD world into
 * this surface - established-world inheritance (new-work.md step 1), no
 * new visual world, no concept tournament.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with
 * the finish review, the verdict, DESIGN.md, and every shipping raster
 * carrying its provenance.
 * -->
 *
 * The game's title/intro screen: the stacked logo plus a short vertical
 * menu of actions. "How to Play" is a purely informational toggle local to
 * this component - it doesn't correspond to any persisted setting, so it
 * isn't lifted into App.jsx state.
 */
function MenuScreen({ onPlay, onOpenSettings }) {
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

  return (
    <div className="menu-screen">
      <div className="menu-screen-backdrop" aria-hidden="true" />

      <div className="menu-screen-content">
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
    </div>
  );
}

export default MenuScreen;
