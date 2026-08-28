# Buriccat

A 3D Punto Banco (Baccarat) browser game built with React, React Three Fiber, and GSAP. Bet, watch the shoe deal onto a real 3D table, squeeze your cards to reveal them, and track the shoe on Bead Plate / Big Road.

## Current status

The core game is playable end-to-end. Of the seven planned subsystems, four are built and verified; three are not started.

**Built:**
- **Rules engine** — full Punto Banco rules (8-deck shoe, CSPRNG-backed Fisher-Yates shuffle, burn/cut-card procedure, the complete Player/Banker drawing tableau), both a standard 5%-commission ruleset and a no-commission (Banker-6-pays-1:2) ruleset, and all five standard side bets (Player Pair, Banker Pair, Perfect Pair, Dragon 7, Panda 8). Covered by 111 automated tests (`src/game/`, `tests/game/`).
- **2D UI** — betting board with oval bet spots, a chip tray whose denominations scale dynamically with balance (spam-clicking a spot auto-downgrades to the largest affordable chip, so you can always go exactly all-in), a payout/result toast, Bead Plate and Big Road roadmaps, and a Game Over / Try Again flow when your balance hits zero. (Big Eye Boy, Small Road, and Cockroach Pig were deliberately left out as unnecessary for a simple table.)
- **3D scene** — a procedurally-built casino table (felt, wood rail, brass trim, chip rack, dealing shoe, discard tray), a lighting rig with a restrained bloom pass, and a single overhead camera for betting that automatically eases into a tight, legible close-up on the cards during dealing, squeezing, and settling.
- **Card & chip animation** — cards deal in true casino order (Player, Banker, Player, Banker), reveal via a drag-to-squeeze gesture (or a Skip/Reveal-All button) on a custom vertex-shader card, and only *then* does the dealer decide whether to hit — matching real play, not dealing every card up front. Chips throw and rake between the rack, the felt, and the discard tray.

**Not started yet:**
- **Audio** — no sound at all yet (SFX, dealer voice lines, ambience).
- **Formal RNG/statistical audit** — the unit test suite is thorough, but there's no dedicated Monte Carlo house-edge simulation or stress-test suite yet.
- **Performance pass** — no texture compression, mesh instancing beyond what's already in the chip rack/stacks, or JS bundle code-splitting (the production bundle is currently ~1.4 MB unsplit — Vite flags this on every build).

## Tech stack

- [Vite](https://vite.dev) + [React 19](https://react.dev) (JavaScript/JSX, no TypeScript)
- [React Three Fiber](https://r3f.docs.pmnd.rs) + [drei](https://github.com/pmndrs/drei) + [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing) for the 3D table
- [GSAP](https://gsap.com) for card/chip tweening
- [Vitest](https://vitest.dev) for the game-logic test suite
- [ESLint](https://eslint.org) (flat config, React Hooks rules)

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm test          # run the game-logic test suite
npm run lint      # lint the codebase
npm run build     # production build
npm run preview   # preview the production build locally
```

## How to play

1. From the menu, hit **Play** (or **Settings** first to pick a payout ruleset and starting balance).
2. Select a chip denomination and click Player, Banker, Tie, or any side bet to stake it. Click repeatedly to stack more; the tray scales up or down with your balance automatically.
3. Click **Deal**. The dealer's first four cards fly out face-down in real order (Player, Banker, Player, Banker).
4. Drag a hand's cards upward to squeeze it and reveal it, or hit the skip button to reveal both instantly.
5. If the rules call for a hit, the dealer draws it right after the reveal — you'll see it land and flip face-up immediately, no second squeeze needed.
6. Balance, the result toast, and the roadmaps all update once the hand is fully resolved and revealed — never before.

## Project structure

```
src/
  game/         Pure rules engine — shoe, drawing rules, payouts, side bets, state machine.
                 No React/rendering imports; runs headlessly under Node.
  scene/        The 3D table: geometry, materials, lighting, camera, card/chip animation.
                 React Three Fiber components; spatial anchors centralized in layout.js.
  ui/           2D screens and HUD: Loading, Menu, Settings, the Game screen (betting board,
                 roadmaps, result toast, Game Over modal).
tests/game/     Unit tests for src/game/, mirroring its file names.
```

`.claude/agents/` documents the seven specialized roles this project is being built with (game logic, 3D scene, card/chip animation, 2D UI/roadmaps, audio, RNG/QA auditing, and performance) and each one's responsibilities, conventions, and handoff contract with the others.

## Known limitations

- No audio yet.
- No save/persistence — balance and shoe state reset on page reload.
- The production JS bundle isn't code-split yet (~1.4 MB); this is exactly what a future performance pass is meant to address.
