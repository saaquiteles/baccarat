import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { initializeShoe } from '../game/shoe.js';
import { playHandGenerator, EVENT_TYPES } from '../game/stateMachine.js';
import { MAIN_BET_TYPES } from '../game/payouts.js';
import { SIDE_BETS } from '../game/sideBets.js';
import buriccatLogo from '../assets/logos/buriccat-logo-horizontal.svg';
import BettingBoard from './BettingBoard.jsx';
import ResultOverlay from './ResultOverlay.jsx';
import RoadmapPanel from './RoadmapPanel.jsx';
import GameOverScreen from './GameOverScreen.jsx';
import CasinoScene from '../scene/CasinoScene.jsx';
import TableAnimationLayer from '../scene/TableAnimationLayer.jsx';
import { CAMERA_VIEWS, CAMERA_VIEW_IDS, DEFAULT_CAMERA_VIEW, BETTING_SPOTS, CHIP_RACK_POSITION, DISCARD_TRAY_POSITION } from '../scene/layout.js';
import { CHIP_DENOMINATION_COLORS } from '../scene/materials.js';
import { representativeChip } from '../scene/chipBreakdown.js';
import { CARD_DEAL_STAGGER, CARD_FLIGHT_DURATION, SETTLE_DISPLAY_DURATION } from '../scene/animationTiming.js';
import { getVisibleChipValues } from './constants.js';

const EMPTY_MAIN_BETS = Object.fromEntries(Object.values(MAIN_BET_TYPES).map((type) => [type, 0]));
const EMPTY_SIDE_BETS = Object.fromEntries(Object.keys(SIDE_BETS).map((id) => [id, 0]));

/**
 * GameScreen.jsx
 * ---------------------------------------------------------------------------
 * Stage bets on the 2D betting board, click Deal, and watch the hand unfold
 * in the real casino order: exactly four cards fly out of the shoe (Player,
 * Banker, Player, Banker) and stop there - no third card yet, even though
 * the engine already knows whether one is coming. Only after both initial
 * hands are squeeze-revealed does the "dealer" decide whether to deal a hit:
 * if the engine's own rules called for one, the Player's third card (then
 * the Banker's, if any) is dealt and shown immediately after that reveal;
 * if not, the hand goes straight to settling. The balance/roadmap/result
 * overlay only update once that entire sequence is done, never before.
 *
 * `deal()` drives `playHandGenerator` directly rather than `simulateHand`:
 * the generator is drained into an ordered event array exactly once (the
 * rules engine has already fully resolved the hand the instant that loop
 * finishes - same as `simulateHand` does internally, and exactly what
 * `qa-rng-auditor`'s simulations rely on), and that event order is the ONLY
 * thing that decides which card animates to which slot and when (see the
 * `initialSequence`/`drawSequence` derivation below). The engine call, bet
 * validation, and payout math are byte-for-byte the same as before; only
 * the *timing* of when cards appear and when the 2D UI reflects the outcome
 * has changed - the engine's already-decided hit/stand result is simply held
 * back until the initial reveal has happened, matching how a real dealer
 * only draws a third card after looking at the first two.
 *
 * Dealing/squeeze/chip-throw *choreography* lives in src/scene/ (Hand.jsx,
 * Card.jsx, ChipStackMesh.jsx, ChipFlight.jsx) - this component only decides
 * *what* happened and *when* to reveal it, never *how* a tween looks.
 */
function GameScreen({ payoutRuleset, startingBalance, onExit }) {
  const [shoe, setShoe] = useState(() => initializeShoe());
  const [history, setHistory] = useState([]);
  const [balance, setBalance] = useState(startingBalance);
  const [mainBetAmounts, setMainBetAmounts] = useState(EMPTY_MAIN_BETS);
  const [sideBetAmounts, setSideBetAmounts] = useState(EMPTY_SIDE_BETS);
  // Prefer the traditional default of 5 if the starting balance can afford
  // it; otherwise the smallest denomination *above* 1 that's actually
  // visible (see getVisibleChipValues), so a very small starting balance
  // never leaves the tray's selection pointed at a denomination that isn't
  // shown - and a fresh session never opens with an accidental all-in
  // (e.g. a starting balance that happens to land exactly on a high
  // denomination and pushes 5 out of the capped tray, see
  // getVisibleChipValues' cap behavior). This is purely an initial-mount
  // default; once balance changes, the render-time resync below always
  // reassigns to the *largest* still-visible denomination instead, per the
  // spam-click-to-all-in design.
  const [chipValue, setChipValue] = useState(() => {
    const initiallyVisible = getVisibleChipValues(startingBalance);
    if (initiallyVisible.includes(5)) return 5;
    return initiallyVisible.find((value) => value > 1) ?? initiallyVisible[0] ?? 0;
  });
  const [lastResult, setLastResult] = useState(null);
  const [lastPayout, setLastPayout] = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [cameraView, setCameraView] = useState(DEFAULT_CAMERA_VIEW);

  // --- Deal / squeeze / reveal choreography state -------------------------
  // 'idle' -> 'dealing' (exactly 4 cards flying to their slots - Player,
  // Banker, Player, Banker, and no further cards yet even if the engine
  // already knows a third is coming) -> 'squeeze' (those 4 dealt, waiting on
  // one squeeze gesture per hand) -> then, once both are revealed, EITHER
  // straight to 'settling' (no hit needed) OR 'drawing' (the engine's
  // already-decided third card(s), dealt now and shown immediately - no
  // second squeeze, matching how a real hit card is turned face-up) ->
  // 'settling' (outcome applied, losing chips raking to the tray) -> 'idle'.
  const [dealPhase, setDealPhase] = useState('idle');
  const [playerCards, setPlayerCards] = useState([]);
  const [bankerCards, setBankerCards] = useState([]);
  const [playerRevealed, setPlayerRevealed] = useState(false);
  const [bankerRevealed, setBankerRevealed] = useState(false);
  const [instantDeal, setInstantDeal] = useState(false);
  const [chipFlights, setChipFlights] = useState([]);

  // The rules engine has already resolved the whole hand synchronously by
  // the time deal() returns; this ref just holds that resolved outcome
  // until both hands are squeeze-revealed and it's safe to apply it to the
  // 2D balance/history/overlay state.
  const pendingOutcomeRef = useRef(null);
  const dealTimelineRef = useRef(null);
  const settleDelayRef = useRef(null);
  const flightIdRef = useRef(0);

  // Kill every in-flight GSAP handle on unmount - nothing should keep
  // ticking (or keep a stale closure alive) once this screen is gone.
  useEffect(
    () => () => {
      dealTimelineRef.current?.kill();
      settleDelayRef.current?.kill();
    },
    []
  );

  // Auto-follow the camera to whichever named view best shows what's
  // currently happening, so the player doesn't have to manually reach for a
  // tight view every time a card comes out of the shoe: overhead for
  // betting, and the tight Hand Close-Up View for the entire
  // dealing/squeeze/settling stretch (cards flying in, being squeezed, and
  // sitting revealed), easing back to overhead the moment play returns to
  // idle. Driven inline during render (comparing against the last
  // *processed* phase, tracked in state rather than a ref - refs can't be
  // read/written during render) rather than in a useEffect, matching
  // React's documented "adjusting state when a prop changes" pattern:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-state-based-on-a-prop-or-state-change.
  // Only fires on a phase *transition*, so a player who manually picks a
  // different view mid-phase to look around isn't fought - the next phase
  // change simply reasserts it.
  const [lastAutoCameraPhase, setLastAutoCameraPhase] = useState(null);
  if (lastAutoCameraPhase !== dealPhase) {
    setLastAutoCameraPhase(dealPhase);
    setCameraView(dealPhase === 'idle' ? DEFAULT_CAMERA_VIEW : 'HAND_CLOSEUP');
  }

  // Chip tray denominations scale with balance (see getVisibleChipValues) -
  // recomputed here so both the tray's contents and the spam-click-to-all-in
  // fallback below (placeMainBet/placeSideBet) always agree on what's
  // "currently available". If the previously-selected denomination drops
  // out of view (balance fell below it), reassign the selection to the
  // largest still-visible one rather than leaving it pointed at a chip the
  // player can no longer see or afford. Same render-time-adjustment pattern
  // as the camera auto-follow above.
  const visibleChipValues = useMemo(() => getVisibleChipValues(balance), [balance]);
  const [lastCheckedBalance, setLastCheckedBalance] = useState(balance);
  if (lastCheckedBalance !== balance) {
    setLastCheckedBalance(balance);
    if (!visibleChipValues.includes(chipValue)) {
      setChipValue(visibleChipValues[visibleChipValues.length - 1] ?? 0);
    }
  }

  const totalWagered = useMemo(
    () =>
      Object.values(mainBetAmounts).reduce((a, b) => a + b, 0) +
      Object.values(sideBetAmounts).reduce((a, b) => a + b, 0),
    [mainBetAmounts, sideBetAmounts]
  );

  const spotAmounts = useMemo(
    () => ({ ...mainBetAmounts, ...sideBetAmounts }),
    [mainBetAmounts, sideBetAmounts]
  );

  const spawnChipFlight = useCallback((from, to, amount) => {
    const chip = representativeChip(amount, CHIP_DENOMINATION_COLORS);
    flightIdRef.current += 1;
    // Freeze the id into its own binding *before* handing it to the
    // setChipFlights updater: several flights are often queued
    // synchronously in one event (Clear Bets, settling multiple losing
    // bets), and React doesn't invoke a functional updater until it
    // processes the batch - reading flightIdRef.current lazily inside the
    // updater itself would have every queued flight in that batch see the
    // same (fully-incremented) ref value and collide on the same React key.
    const id = flightIdRef.current;
    setChipFlights((flights) => [...flights, { id, from, to, color: chip.color }]);
  }, []);

  const removeChipFlight = useCallback((id) => {
    setChipFlights((flights) => flights.filter((flight) => flight.id !== id));
  }, []);

  const bettingLocked = dealPhase !== 'idle';

  // When the selected chip's value exceeds what's left, stake the largest
  // currently-visible (i.e. affordable) denomination instead of doing
  // nothing - see getVisibleChipValues in constants.js for what "visible"
  // means. Since that list only ever contains denominations the balance can
  // already cover, its largest entry is always affordable in full. This is
  // what lets repeated clicks on the same spot walk the balance down to
  // exactly (or as close as integer chip denominations allow) zero without
  // the player having to manually reselect smaller chips each time.
  const resolveStakeAmount = useCallback(
    () => (chipValue <= balance ? chipValue : (visibleChipValues[visibleChipValues.length - 1] ?? 0)),
    [chipValue, balance, visibleChipValues]
  );

  const placeMainBet = useCallback(
    (betType) => {
      if (bettingLocked) return;
      const amount = resolveStakeAmount();
      if (amount <= 0 || amount > balance) return; // nothing affordable left - client-side check only
      setBalance((b) => b - amount);
      setMainBetAmounts((m) => ({ ...m, [betType]: m[betType] + amount }));
      spawnChipFlight(CHIP_RACK_POSITION, BETTING_SPOTS[betType], amount);
    },
    [balance, bettingLocked, resolveStakeAmount, spawnChipFlight]
  );

  const placeSideBet = useCallback(
    (sideBetId) => {
      if (bettingLocked) return;
      const amount = resolveStakeAmount();
      if (amount <= 0 || amount > balance) return;
      setBalance((b) => b - amount);
      setSideBetAmounts((s) => ({ ...s, [sideBetId]: s[sideBetId] + amount }));
      spawnChipFlight(CHIP_RACK_POSITION, BETTING_SPOTS[sideBetId], amount);
    },
    [balance, bettingLocked, resolveStakeAmount, spawnChipFlight]
  );

  const clearBets = useCallback(() => {
    if (bettingLocked) return;
    Object.entries(mainBetAmounts).forEach(([betType, amount]) => {
      if (amount > 0) spawnChipFlight(BETTING_SPOTS[betType], CHIP_RACK_POSITION, amount);
    });
    Object.entries(sideBetAmounts).forEach(([sideBetId, amount]) => {
      if (amount > 0) spawnChipFlight(BETTING_SPOTS[sideBetId], CHIP_RACK_POSITION, amount);
    });
    setBalance((b) => b + totalWagered);
    setMainBetAmounts(EMPTY_MAIN_BETS);
    setSideBetAmounts(EMPTY_SIDE_BETS);
  }, [totalWagered, mainBetAmounts, sideBetAmounts, bettingLocked, spawnChipFlight]);

  const deal = useCallback(() => {
    if (totalWagered === 0 || dealPhase !== 'idle') return;

    dealTimelineRef.current?.kill();
    settleDelayRef.current?.kill();

    // A shoe flagged for reshuffle on the previous hand is replaced before
    // the next hand is dealt, never mid-hand - see shoe.js ShoeState.needsReshuffle.
    let currentShoe = shoe;
    let currentHistory = history;
    if (currentShoe.needsReshuffle) {
      currentShoe = initializeShoe();
      currentHistory = [];
    }

    const bets = {
      mainBets: Object.entries(mainBetAmounts)
        .filter(([, amount]) => amount > 0)
        .map(([betType, amount]) => ({ betType, amount })),
      sideBets: Object.entries(sideBetAmounts)
        .filter(([, amount]) => amount > 0)
        .map(([sideBetId, amount]) => ({ sideBetId, amount })),
    };

    // Drive the generator directly and drain it into an ordered event log.
    // The rules engine resolves the whole hand synchronously right here -
    // that's fine and matches how simulateHand/QA simulation works - only
    // the *UI* gates on the squeeze below.
    const generator = playHandGenerator(currentShoe, bets, payoutRuleset);
    const events = [];
    let step = generator.next();
    while (!step.done) {
      events.push(step.value);
      step = generator.next();
    }
    const nextShoe = step.value;

    const dealInitial = events.find((e) => e.type === EVENT_TYPES.DEAL_INITIAL)?.payload;
    const playerDraw = events.find((e) => e.type === EVENT_TYPES.PLAYER_DRAW)?.payload;
    const bankerDraw = events.find((e) => e.type === EVENT_TYPES.BANKER_DRAW)?.payload;
    const result = events.find((e) => e.type === EVENT_TYPES.EVALUATE_WINNER)?.payload;
    const payout = events.find((e) => e.type === EVENT_TYPES.PAYOUT)?.payload;
    const totalReturned =
      payout.mainBets.reduce((a, b) => a + b.totalReturned, 0) +
      payout.sideBets.reduce((a, b) => a + b.totalReturned, 0);

    // The dealer's fixed 4-card opening: Player, Banker, Player, Banker -
    // this is ALL that gets dealt right now, regardless of whether the
    // engine already knows a hit is coming.
    const initialSequence = [
      { side: 'PLAYER', card: dealInitial.playerCards[0] },
      { side: 'BANKER', card: dealInitial.bankerCards[0] },
      { side: 'PLAYER', card: dealInitial.playerCards[1] },
      { side: 'BANKER', card: dealInitial.bankerCards[1] },
    ];

    // Whatever third card(s) the engine's real drawing rules already decided
    // on (0, 1, or 2 of them, Player before Banker) - held back and only
    // dealt once both initial hands are revealed, never dealt alongside the
    // opening four.
    const drawSequence = [];
    if (playerDraw) drawSequence.push({ side: 'PLAYER', card: playerDraw.card });
    if (bankerDraw) drawSequence.push({ side: 'BANKER', card: bankerDraw.card });

    pendingOutcomeRef.current = {
      nextShoe,
      result,
      payout,
      totalReturned,
      // A fresh shoe also means a fresh roadmap history (see the
      // needsReshuffle branch above) - captured here, at deal time, rather
      // than read back off live `history` state at commit time, so a
      // reshuffle that happened mid-dealing/squeeze can't be lost.
      committedHistory: [...currentHistory, result.winner],
      initialPlayerCards: dealInitial.playerCards,
      initialBankerCards: dealInitial.bankerCards,
      drawSequence,
      finalPlayerCards: result.playerCards,
      finalBankerCards: result.bankerCards,
    };

    setPlayerCards([]);
    setBankerCards([]);
    setPlayerRevealed(false);
    setBankerRevealed(false);
    setInstantDeal(false);
    setDealPhase('dealing');

    // GSAP sequences *when* each card is appended to playerCards/bankerCards
    // state; Hand.jsx/Card.jsx own *how* each individual card then flies
    // from the shoe to its slot. Only the fixed 4-card opening runs here -
    // see the reveal effect below for the held-back draw stage.
    const timeline = gsap.timeline({ onComplete: () => setDealPhase('squeeze') });
    initialSequence.forEach((step, i) => {
      timeline.call(
        () => {
          if (step.side === 'PLAYER') setPlayerCards((cards) => [...cards, step.card]);
          else setBankerCards((cards) => [...cards, step.card]);
        },
        null,
        i * CARD_DEAL_STAGGER
      );
    });
    timeline.to({}, { duration: 0.001 }, (initialSequence.length - 1) * CARD_DEAL_STAGGER + CARD_FLIGHT_DURATION);
    dealTimelineRef.current = timeline;
  }, [shoe, history, mainBetAmounts, sideBetAmounts, dealPhase, payoutRuleset, totalWagered]);

  // Applies an already-resolved outcome to the 2D UI: balance/history/
  // roadmap/result overlay, plus raking losing chips to the tray. Shared by
  // both the "no hit needed" path and the "hit dealt, now settle" path below
  // - by the time either calls this, there is nothing left to decide, only
  // to display.
  const commitOutcome = useCallback(
    (outcome) => {
      pendingOutcomeRef.current = null;

      setShoe(outcome.nextShoe);
      setHistory(outcome.committedHistory);
      setBalance((b) => b + outcome.totalReturned);
      setLastResult(outcome.result);
      setLastPayout(outcome.payout);
      setOverlayVisible(true);
      setMainBetAmounts(EMPTY_MAIN_BETS);
      setSideBetAmounts(EMPTY_SIDE_BETS);
      setDealPhase('settling');

      // Losing chips rake to the discard tray; winning/pushed spots simply
      // clear (no stake-return animation needed - see task scope).
      outcome.payout.mainBets.forEach((bet) => {
        if (!bet.won && !bet.pushed && bet.betAmount > 0) {
          spawnChipFlight(BETTING_SPOTS[bet.betType], DISCARD_TRAY_POSITION, bet.betAmount);
        }
      });
      outcome.payout.sideBets.forEach((bet) => {
        if (!bet.won && bet.betAmount > 0) {
          spawnChipFlight(BETTING_SPOTS[bet.betType], DISCARD_TRAY_POSITION, bet.betAmount);
        }
      });

      settleDelayRef.current?.kill();
      settleDelayRef.current = gsap.delayedCall(SETTLE_DISPLAY_DURATION, () => {
        setPlayerCards([]);
        setBankerCards([]);
        setDealPhase('idle');
      });
    },
    [spawnChipFlight]
  );

  // The dedicated skip/reveal control: fast-forwards whichever step is
  // currently in flight so repeat play never has to sit through the full
  // choreography. Never resolves to anything other than what the engine
  // already decided in deal() - it only changes how fast the UI catches up.
  const skip = useCallback(() => {
    const outcome = pendingOutcomeRef.current;
    if (dealPhase === 'dealing' && outcome) {
      // Snap straight to the dealt-but-unrevealed *initial* 4 cards only -
      // skipping the opening fly-in must never skip past the reveal/hit
      // decision straight to the final hand.
      dealTimelineRef.current?.kill();
      dealTimelineRef.current = null;
      setInstantDeal(true);
      setPlayerCards(outcome.initialPlayerCards);
      setBankerCards(outcome.initialBankerCards);
      setDealPhase('squeeze');
    } else if (dealPhase === 'squeeze') {
      setPlayerRevealed(true);
      setBankerRevealed(true);
    } else if (dealPhase === 'drawing' && outcome) {
      // Snap straight to the final hand (initial 4 + whatever hit card(s)
      // the engine already decided on) and settle immediately.
      dealTimelineRef.current?.kill();
      dealTimelineRef.current = null;
      setInstantDeal(true);
      setPlayerCards(outcome.finalPlayerCards);
      setBankerCards(outcome.finalBankerCards);
      commitOutcome(outcome);
    }
  }, [dealPhase, commitOutcome]);

  // Once both initial hands are squeeze-revealed, the "dealer" looks at them
  // and decides: if the engine's own rules already called for a hit, deal
  // the Player's third card (then the Banker's, if any) now and show it
  // immediately - no second squeeze, exactly like a real hit card being
  // turned face-up - then settle; if not, there's nothing left to deal, so
  // settle straight away. Either way, this is the ONLY place a hand can
  // reach 'settling', and it never fires before the player has actually
  // looked at the initial hands.
  useEffect(() => {
    if (dealPhase !== 'squeeze' || !playerRevealed || !bankerRevealed) return;
    const outcome = pendingOutcomeRef.current;
    if (!outcome) return;

    if (outcome.drawSequence.length === 0) {
      commitOutcome(outcome);
      return;
    }

    setDealPhase('drawing');
    const timeline = gsap.timeline({ onComplete: () => commitOutcome(outcome) });
    outcome.drawSequence.forEach((step, i) => {
      timeline.call(
        () => {
          if (step.side === 'PLAYER') setPlayerCards((cards) => [...cards, step.card]);
          else setBankerCards((cards) => [...cards, step.card]);
        },
        null,
        i * CARD_DEAL_STAGGER
      );
    });
    timeline.to({}, { duration: 0.001 }, (outcome.drawSequence.length - 1) * CARD_DEAL_STAGGER + CARD_FLIGHT_DURATION);
    dealTimelineRef.current = timeline;
  }, [dealPhase, playerRevealed, bankerRevealed, commitOutcome]);

  const canDeal = totalWagered > 0 && dealPhase === 'idle';
  const skipEnabled = dealPhase === 'dealing' || dealPhase === 'squeeze' || dealPhase === 'drawing';
  const skipLabel = dealPhase === 'dealing' ? 'Skip Deal' : dealPhase === 'squeeze' ? 'Reveal All' : 'Skip Draw';

  // Once balance hits exactly 0 with no hand in progress AND nothing
  // currently staged, no chip denomination is affordable (the smallest is 1
  // - see getVisibleChipValues) and there's no bet to deal, so the betting
  // board and Deal button would otherwise sit permanently disabled with no
  // way forward. `totalWagered === 0` is essential here, not just belt-and-
  // suspenders: staking an entire balance as a bet also drives balance to 0
  // while it's staged and ready to deal - that's a normal step, not a dead
  // end, and must not trigger this. Gated on dealPhase === 'idle' too, so
  // this never appears mid-reveal/settle, only once a losing hand has fully
  // finished displaying.
  const isGameOver = balance === 0 && dealPhase === 'idle' && totalWagered === 0;

  // Starts a brand new session in place - fresh shoe, starting balance,
  // empty roadmap history - rather than routing back through the menu, so
  // "Try Again" is a single click straight back into play.
  const resetGame = useCallback(() => {
    dealTimelineRef.current?.kill();
    settleDelayRef.current?.kill();
    pendingOutcomeRef.current = null;

    setShoe(initializeShoe());
    setHistory([]);
    setBalance(startingBalance);
    setMainBetAmounts(EMPTY_MAIN_BETS);
    setSideBetAmounts(EMPTY_SIDE_BETS);
    const freshVisible = getVisibleChipValues(startingBalance);
    setChipValue(
      freshVisible.includes(5) ? 5 : (freshVisible.find((value) => value > 1) ?? freshVisible[0] ?? 0)
    );
    setLastResult(null);
    setLastPayout(null);
    setOverlayVisible(false);
    setPlayerCards([]);
    setBankerCards([]);
    setPlayerRevealed(false);
    setBankerRevealed(false);
    setInstantDeal(false);
    setChipFlights([]);
    setDealPhase('idle');
  }, [startingBalance]);

  return (
    <div className="app-shell">
      <header className="app-header">
        {onExit && (
          <button type="button" className="app-header-back" onClick={onExit}>
            &larr; Menu
          </button>
        )}
        <div className="app-header-brand">
          <img src={buriccatLogo} alt="Buriccat" className="app-logo" />
          <p className="app-subtitle">Punto Banco prototype &middot; {payoutRuleset.name}</p>
        </div>
      </header>

      <div className="game-dashboard">
        <div className="game-main-row">
          <section className="casino-stage" aria-label="3D table view">
            <CasinoScene activeView={cameraView}>
              <TableAnimationLayer
                playerCards={playerCards}
                bankerCards={bankerCards}
                playerRevealed={playerRevealed}
                bankerRevealed={bankerRevealed}
                squeezeInteractive={dealPhase === 'squeeze'}
                instantDeal={instantDeal}
                onPlayerSqueezeComplete={() => setPlayerRevealed(true)}
                onBankerSqueezeComplete={() => setBankerRevealed(true)}
                spotAmounts={spotAmounts}
                chipFlights={chipFlights}
                onChipFlightComplete={removeChipFlight}
              />
            </CasinoScene>

            <div className="casino-stage-camera-switch" role="group" aria-label="Camera view">
              {CAMERA_VIEW_IDS.map((viewId) => (
                <button
                  key={viewId}
                  type="button"
                  className={`casino-camera-btn${cameraView === viewId ? ' casino-camera-btn--active' : ''}`}
                  onClick={() => setCameraView(viewId)}
                  title={CAMERA_VIEWS[viewId].description}
                >
                  {CAMERA_VIEWS[viewId].name}
                </button>
              ))}
            </div>

            {skipEnabled && (
              <div className="casino-stage-skip">
                <button type="button" className="casino-skip-btn" onClick={skip}>
                  {skipLabel}
                </button>
                {dealPhase === 'squeeze' && (
                  <p className="casino-stage-hint">
                    Drag a hand's cards upward to squeeze it, or reveal both instantly.
                  </p>
                )}
              </div>
            )}
          </section>

          <aside className="game-side-panel" aria-label="Betting controls">
            <BettingBoard
              balance={balance}
              mainBetAmounts={mainBetAmounts}
              sideBetAmounts={sideBetAmounts}
              chipValues={visibleChipValues}
              chipValue={chipValue}
              onSelectChip={setChipValue}
              onPlaceMainBet={placeMainBet}
              onPlaceSideBet={placeSideBet}
              onClearBets={clearBets}
              onDeal={deal}
              canDeal={canDeal}
              locked={bettingLocked}
            />
          </aside>
        </div>

        <div className="roadmap-row">
          <RoadmapPanel history={history} />
        </div>
      </div>

      <ResultOverlay
        result={lastResult}
        payout={lastPayout}
        visible={overlayVisible}
        onDismiss={() => setOverlayVisible(false)}
      />

      {isGameOver && <GameOverScreen onTryAgain={resetGame} onExit={onExit} />}
    </div>
  );
}

export default GameScreen;
