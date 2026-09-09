# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Casual solo players who want a quick, realistic Punto Banco (Baccarat) session in the browser - no signup, no commitment, a few hands on a break. They pick a payout ruleset and starting balance, play until they bust or quit, and can come back and start fresh any time.

## Product Purpose

Buriccat is a free, single-player 3D Punto Banco browser game. It exists to give that casual player a real casino-table feel - actual card dealing, a squeeze-to-reveal reveal mechanic, roadmaps, chip play - without needing an app install, an account, or real money.

## Positioning

Real 3D casino-table presence is the differentiator over a generic flat/2D online baccarat game: a physically-built 3D table (React Three Fiber scene, lit and shaded like a real felt table), true card-dealing order and a drag-to-squeeze reveal gesture, positional audio, and camera work that eases into a tight view during dealing/squeeze/settle - not a flat card-table UI bolted onto a betting form.

## Operating Context

- Runs entirely client-side in a desktop or mobile browser; no backend, no accounts, no persistence (balance/shoe reset on reload).
- Screen flow: Loading -> Menu (Play / Settings / How to Play) -> Settings (payout ruleset + starting balance) -> Game (3D table + HUD) -> Game Over -> back to Menu.
- Players choose between a standard 5%-commission ruleset and a no-commission (Banker-6-pays-1:2) ruleset, and a starting balance, before playing.

## Capabilities and Constraints

- Full Punto Banco rules engine: 8-deck shoe, CSPRNG-backed Fisher-Yates shuffle, burn/cut-card procedure, complete Player/Banker drawing tableau, both commission rulesets, and five side bets (Player Pair, Banker Pair, Perfect Pair at 25:1, Dragon 7, Panda 8). Covered by an extensive automated test suite (`src/game/`, `tests/game/`), including a seeded-PRNG house-edge regression test.
- 3D scene: procedurally-built casino table (felt, wood rail, brass trim, chip rack, dealing shoe, discard tray), a lighting rig with a restrained bloom pass, and named camera views (a close, upright betting view plus an automatic tight close-up during dealing/squeeze/settle).
- Card & chip animation: true casino deal order, drag-to-squeeze reveal (or a Skip control), and chip throw/rake animation between rack, felt, and discard tray.
- Audio: synthesized/sampled positional SFX, dealer voice lines mapped to game-state events, and ducked ambient casino background audio (`src/audio/`).
- UI: a single full-bleed HUD overlaid directly on the 3D table (top bar, betting board, collapsible side-bet picker, collapsible Bead Plate + Big Road roadmap widget) - not separate document panels beside/below the canvas. Only Bead Plate and Big Road are shown; Big Eye Boy/Small Road/Cockroach Pig were deliberately dropped as unnecessary for a simple table.
- Chip denominations scale dynamically with balance; spam-clicking a bet spot auto-downgrades to the largest affordable chip (always-available all-in).
- No account/login system, ever - stays purely local/session-based.
- Solo single-table experience only - no multiplayer or multi-table ambitions.
- No save/persistence yet - a known, accepted limitation, not a bug.
- Production JS bundle is code-split (GameScreen lazy-loaded away from Loading/Menu/Settings) but the 3D/animation chunk is still substantial (~1.2 MB) - relevant to how the Loading screen should represent real load progress.

## Brand Commitments

- Name: **Buriccat**. Existing pixel-cat logo family (`src/assets/logos/`: stacked, horizontal, icon, app-icon variants in both PNG and SVG) is a confirmed, binding brand asset - preserve it, don't replace it.
- Existing dark casino HUD palette (deep near-black stage background, felt-green-to-navy radial bet spots, gold/`#d6a22b`-`#e8be5a` accent rim and text, cream `#f5eac2` primary HUD text) is the established, binding visual system (`src/App.css`) - extend it into every new surface rather than inventing a competing palette.

## Evidence on Hand

- Working, previously-verified 3D game screen with the established HUD system (`src/ui/GameScreen.jsx`, `src/App.css`) - the authoritative visual reference for Menu/Loading redesign.
- Logo asset family in `src/assets/logos/` (see Brand Commitments).
- No user research, testimonials, or analytics exist or should be implied.

## Product Principles

1. The 3D table and its tactile mechanics (dealing, squeeze, chips) are the product - every screen should build anticipation for or extend that presence, not distract from it.
2. Zero friction to play: no accounts, no forced tutorials, sensible defaults - Settings and How-to-Play are optional detours, never gates.
3. One visual world: the dark/gold casino HUD established in the game screen is the single source of truth for every screen, including Menu and Loading.
4. Never fabricate progress, odds, or state - a loading percentage must reflect real asset load progress, not a fixed timer dressed up as one.
5. Stay solo and local - no feature should imply accounts, servers, or multiplayer.
