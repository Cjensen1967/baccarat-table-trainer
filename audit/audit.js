/* =====================================================================
 * audit.js — Audit Trainer: Baccarat Procedural Review
 *
 * Audience: surveillance operators, floor supervisors, dual-rate staff.
 *
 * Concept: A completed baccarat hand is shown — all cards face-up,
 * a winner declared. The trainee decides whether the hand was played
 * and called correctly. One error per hand (maximum), 30% error rate.
 *
 * Four difficulty levels:
 *   Level 1 — Wrong winner declarations only (totals shown)
 *   Level 2 — Adds Player third-card procedure errors
 *   Level 3 — Adds Banker conditional draw errors
 *   Level 4 — Level 3 errors under a timer; cards blur, decide from memory
 *
 * ANTI-LEAKAGE: The isCorrect flag is never surfaced until after the
 * trainee commits. The explain panel is hidden until answer is locked in.
 *
 * Data structure future-readiness: all hands include a `confidence`
 * field (null until confidence UI is activated) for later calibration
 * metric work.
 * =================================================================== */

(function () {
  'use strict';

  /* ==================================================================
   * Card generation
   * ================================================================== */

  const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
  const RANK_NAMES = { A: 'Ace', T: '10', J: 'Jack', Q: 'Queen', K: 'King' };

  // Two rank options for value 0 (weighted pool matches js/core/cards.js)
  const RANKS_BY_VALUE = [
    ['T', 'J'],  // 0
    ['A'],       // 1
    ['2'], ['3'], ['4'], ['5'], ['6'], ['7'], ['8'], ['9']
  ];

  function cardOfValue(v) {
    const ranks = RANKS_BY_VALUE[v];
    const rank  = ranks[Math.floor(Math.random() * ranks.length)];
    const suit  = SUITS[Math.floor(Math.random() * SUITS.length)];
    return {
      rank, suit, value: v,
      img: `../assets/${suit}${rank}.svg`,
      label: (RANK_NAMES[rank] || rank) + ' of ' + suit
    };
  }

  // Weighted random card (same distribution as RANK_POOL in cards.js)
  const W_POOL = [0, 0, 1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 9];

  function rndCard() {
    return cardOfValue(W_POOL[Math.floor(Math.random() * W_POOL.length)]);
  }

  // Two cards whose values sum to `total` (mod 10)
  function pairWithTotal(total) {
    const v1 = Math.floor(Math.random() * 10);
    const v2 = (total - v1 + 10) % 10;
    return [cardOfValue(v1), cardOfValue(v2)];
  }

  // Baccarat total (any number of cards)
  function tot(...cards) {
    return cards.reduce((s, c) => (s + c.value) % 10, 0);
  }

  /* ==================================================================
   * Baccarat rules (self-contained; mirrors js/core/rules.js)
   * ================================================================== */

  function shouldPlayerDraw(pt)           { return pt <= 5; }
  function isNatural(pt, bt)              { return pt >= 8 || bt >= 8; }

  function shouldBankerDraw(bt, playerDrew, p3Val) {
    if (!playerDrew)  return bt <= 5;       // Player stood → same rule as Player
    if (bt <= 2)      return true;
    if (bt === 7)     return false;
    if (bt === 3)     return p3Val !== 8;
    if (bt === 4)     return p3Val >= 2 && p3Val <= 7;
    if (bt === 5)     return p3Val >= 4 && p3Val <= 7;
    if (bt === 6)     return p3Val === 6 || p3Val === 7;
    return false;
  }

  function calcWinner(pF, bF) {
    return pF > bF ? 'player' : bF > pF ? 'banker' : 'tie';
  }

  function winLabel(w) {
    return { player: 'Player', banker: 'Banker', tie: 'Tie' }[w];
  }

  /* ==================================================================
   * Rule-text helpers (displayed in explanation after answer)
   * ================================================================== */

  function bankerRuleText(bt, playerDrew, p3Val) {
    if (!playerDrew)  return `Banker ${bt}: Player stood → ${bt <= 5 ? 'draw on 0–5' : 'stand on 6–7'}.`;
    if (bt <= 2)      return `Banker ${bt}: always draw.`;
    if (bt === 7)     return `Banker 7: always stand.`;
    const draws = shouldBankerDraw(bt, true, p3Val);
    if (bt === 3) return p3Val === 8
      ? `Banker 3: stand — Player's third was 8.`
      : `Banker 3: draw (Player's third ${p3Val} ≠ 8) — ${draws ? 'draw' : 'stand'}.`;
    const ranges = { 4: '2–7', 5: '4–7', 6: '6–7' };
    return `Banker ${bt}: draw if Player's third is ${ranges[bt]}. Player's third was ${p3Val} → ${draws ? 'draw' : 'stand'}.`;
  }

  /* ==================================================================
   * Explanation builders
   * ================================================================== */

  function buildCorrectExplanation(h) {
    if (h.isNatural) {
      return `Hand played correctly. Natural — Player ${h.pFinal}, Banker ${h.bFinal}. No draws. ${winLabel(h.declaredWinner)} wins.`;
    }
    const pRule = h.playerDrew
      ? `Player ${h.pInit}: draws on 0–5 ✓`
      : `Player ${h.pInit}: stands on 6–7 ✓`;
    const bRule = h.bankerDrew
      ? `Banker drew ✓`
      : `Banker stood ✓`;
    const bDetail = `— ${bankerRuleText(h.bInit, h.playerDrew, h.p3 ? h.p3.value : null)}`;
    const wRule = `${winLabel(h.declaredWinner)} wins (Player ${h.pFinal} – Banker ${h.bFinal}) ✓`;
    return `Hand played correctly. ${pRule}. ${bRule} ${bDetail} ${wRule}.`;
  }

  /* ==================================================================
   * Hand generation — correct hand
   * ================================================================== */

  function generateCorrectHand() {
    const p1 = rndCard(), p2 = rndCard();
    const b1 = rndCard(), b2 = rndCard();
    const pInit = tot(p1, p2);
    const bInit = tot(b1, b2);

    if (isNatural(pInit, bInit)) {
      const w = calcWinner(pInit, bInit);
      const h = {
        p1, p2, p3: null, b1, b2, b3: null,
        pInit, bInit, pFinal: pInit, bFinal: bInit,
        isNatural: true, playerDrew: false, bankerDrew: false,
        declaredWinner: w, actualWinner: w,
        isCorrect: true, errorType: null, confidence: null
      };
      h.explanation = buildCorrectExplanation(h);
      return h;
    }

    const pDrew  = shouldPlayerDraw(pInit);
    const p3     = pDrew ? rndCard() : null;
    const bDrew  = shouldBankerDraw(bInit, pDrew, p3 ? p3.value : null);
    const b3     = bDrew ? rndCard() : null;
    const pFinal = p3 ? tot(p1, p2, p3) : pInit;
    const bFinal = b3 ? tot(b1, b2, b3) : bInit;
    const w      = calcWinner(pFinal, bFinal);

    const h = {
      p1, p2, p3, b1, b2, b3,
      pInit, bInit, pFinal, bFinal,
      isNatural: false, playerDrew: pDrew, bankerDrew: bDrew,
      declaredWinner: w, actualWinner: w,
      isCorrect: true, errorType: null, confidence: null
    };
    h.explanation = buildCorrectExplanation(h);
    return h;
  }

  /* ==================================================================
   * Error injection functions
   *
   * Each function returns a hand object where isCorrect = false.
   * The `explanation` field describes what was wrong (never shown
   * before the trainee commits).
   * ================================================================== */

  // ERROR: Wrong winner declared on an otherwise correct hand
  function wrongWinnerHand() {
    const base = generateCorrectHand();
    // Always flip to the opposite main side; occasionally tie
    const opp = base.actualWinner === 'player' ? 'banker'
              : base.actualWinner === 'banker' ? 'player'
              : (Math.random() < 0.5 ? 'player' : 'banker');
    const wrong = Math.random() < 0.82 ? opp : 'tie';
    return {
      ...base,
      declaredWinner: wrong,
      isCorrect: false, errorType: 'wrong_winner',
      explanation: `Error: ${winLabel(wrong)} was declared, but Player ${base.pFinal} vs Banker ${base.bFinal} — the correct winner is ${winLabel(base.actualWinner)}.`
    };
  }

  // ERROR: Player drew on 6–7 (should have stood)
  function playerDrewHand() {
    const pTotal = Math.random() < 0.5 ? 6 : 7;
    const [p1, p2] = pairWithTotal(pTotal);
    const p3 = rndCard(); // erroneous third card

    const b1 = rndCard(), b2 = rndCard();
    const bInit = tot(b1, b2);
    if (bInit >= 8) return playerDrewHand(); // retry on Banker natural

    // Banker plays correctly given the card that was (wrongly) dealt
    const bDrew  = shouldBankerDraw(bInit, true, p3.value);
    const b3     = bDrew ? rndCard() : null;
    const pFinal = tot(p1, p2, p3);
    const bFinal = b3 ? tot(b1, b2, b3) : bInit;
    const w      = calcWinner(pFinal, bFinal);

    return {
      p1, p2, p3, b1, b2, b3,
      pInit: pTotal, bInit, pFinal, bFinal,
      isNatural: false, playerDrew: true, bankerDrew: bDrew,
      declaredWinner: w, actualWinner: w,
      isCorrect: false, errorType: 'player_drew', confidence: null,
      explanation: `Error: Player had ${pTotal} — must stand on 6–7. A third card should not have been dealt to the Player.`
    };
  }

  // ERROR: Player stood on 0–5 (should have drawn)
  function playerStoodHand() {
    const pTotal = Math.floor(Math.random() * 6); // 0–5
    const [p1, p2] = pairWithTotal(pTotal);
    const b1 = rndCard(), b2 = rndCard();
    const bInit = tot(b1, b2);
    if (bInit >= 8) return playerStoodHand();

    // Banker responds as if Player stood (no p3)
    const bDrew  = shouldBankerDraw(bInit, false, null);
    const b3     = bDrew ? rndCard() : null;
    const pFinal = pTotal;
    const bFinal = b3 ? tot(b1, b2, b3) : bInit;
    const w      = calcWinner(pFinal, bFinal);

    return {
      p1, p2, p3: null, b1, b2, b3,
      pInit: pTotal, bInit, pFinal, bFinal,
      isNatural: false, playerDrew: false, bankerDrew: bDrew,
      declaredWinner: w, actualWinner: w,
      isCorrect: false, errorType: 'player_stood', confidence: null,
      explanation: `Error: Player had ${pTotal} — must draw on 0–5. A third card should have been dealt to the Player.`
    };
  }

  // ERROR: Banker drew when the rule says Stand
  function bankerDrewHand() {
    let attempts = 0;
    while (attempts++ < 100) {
      const pTotal = Math.floor(Math.random() * 6); // Player draws
      const [p1, p2] = pairWithTotal(pTotal);
      const p3 = rndCard();
      const bInit = Math.floor(Math.random() * 8); // 0–7 (not natural)
      const [b1, b2] = pairWithTotal(bInit);

      if (shouldBankerDraw(bInit, true, p3.value)) continue; // need a stand situation

      // Banker should stand, but erroneously draws
      const b3     = rndCard();
      const pFinal = tot(p1, p2, p3);
      const bFinal = tot(b1, b2, b3);
      const w      = calcWinner(pFinal, bFinal);
      const rule   = bankerRuleText(bInit, true, p3.value);

      return {
        p1, p2, p3, b1, b2, b3,
        pInit: pTotal, bInit, pFinal, bFinal,
        isNatural: false, playerDrew: true, bankerDrew: true,
        declaredWinner: w, actualWinner: w,
        isCorrect: false, errorType: 'banker_drew', confidence: null,
        explanation: `Error: Banker should stand. ${rule} A third card was erroneously dealt to the Banker.`
      };
    }
    return generateCorrectHand(); // unreachable fallback
  }

  // ERROR: Banker stood when the rule says Draw
  function bankerStoodHand() {
    let attempts = 0;
    while (attempts++ < 100) {
      const pTotal = Math.floor(Math.random() * 6);
      const [p1, p2] = pairWithTotal(pTotal);
      const p3 = rndCard();
      const bInit = Math.floor(Math.random() * 8);
      const [b1, b2] = pairWithTotal(bInit);

      if (!shouldBankerDraw(bInit, true, p3.value)) continue; // need a draw situation

      // Banker should draw, but erroneously stands (no b3)
      const pFinal = tot(p1, p2, p3);
      const bFinal = bInit;
      const w      = calcWinner(pFinal, bFinal);
      const rule   = bankerRuleText(bInit, true, p3.value);

      return {
        p1, p2, p3, b1, b2, b3: null,
        pInit: pTotal, bInit, pFinal, bFinal,
        isNatural: false, playerDrew: true, bankerDrew: false,
        declaredWinner: w, actualWinner: w,
        isCorrect: false, errorType: 'banker_stood', confidence: null,
        explanation: `Error: Banker should draw. ${rule} The Banker's third card was not dealt.`
      };
    }
    return generateCorrectHand();
  }

  /* ==================================================================
   * Error-type weighting by level
   * ================================================================== */

  const ERROR_WEIGHTS = {
    1: [['wrong_winner', 1.00]],
    2: [['wrong_winner', 0.20], ['player_drew', 0.40], ['player_stood', 0.40]],
    3: [['wrong_winner', 0.10], ['player_drew', 0.15], ['player_stood', 0.15],
        ['banker_drew', 0.30], ['banker_stood', 0.30]],
    4: [['wrong_winner', 0.10], ['player_drew', 0.15], ['player_stood', 0.15],
        ['banker_drew', 0.30], ['banker_stood', 0.30]]
  };

  function pickErrorType(level) {
    const weights = ERROR_WEIGHTS[level] || ERROR_WEIGHTS[3];
    let r = Math.random();
    for (const [type, w] of weights) {
      if (r < w) return type;
      r -= w;
    }
    return weights[0][0];
  }

  const ERROR_RATE = 0.30; // 30 % of hands contain an error

  function generateHand(level) {
    if (Math.random() >= ERROR_RATE) return generateCorrectHand();

    switch (pickErrorType(level)) {
      case 'wrong_winner':  return wrongWinnerHand();
      case 'player_drew':   return playerDrewHand();
      case 'player_stood':  return playerStoodHand();
      case 'banker_drew':   return bankerDrewHand();
      case 'banker_stood':  return bankerStoodHand();
      default:              return generateCorrectHand();
    }
  }

  /* ==================================================================
   * Stats — localStorage
   * ================================================================== */

  const STATS_KEY = 'bac_stats_audit';

  function loadStats() {
    try {
      return Object.assign(
        { correct: 0, incorrect: 0, hands: 0, peeks: 0, streak: 0, bestStreak: 0,
          byLevel: { 1: { c: 0, w: 0 }, 2: { c: 0, w: 0 }, 3: { c: 0, w: 0 }, 4: { c: 0, w: 0 } } },
        JSON.parse(localStorage.getItem(STATS_KEY) || '{}')
      );
    } catch (e) {
      return { correct: 0, incorrect: 0, hands: 0, peeks: 0, streak: 0, bestStreak: 0,
        byLevel: { 1: { c: 0, w: 0 }, 2: { c: 0, w: 0 }, 3: { c: 0, w: 0 }, 4: { c: 0, w: 0 } } };
    }
  }

  function saveStats(s) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function saveMissedHand(hand, choice) {
    try {
      const KEY = 'bac_missed_hands';
      const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
      arr.unshift({
        id: Date.now() + '-' + Math.random().toString(36).slice(2),
        source: 'audit',
        ts: Date.now(),
        pCards: [hand.p1, hand.p2, hand.p3].filter(Boolean).map(c => ({ img: c.img, d: c.label })),
        bCards: [hand.b1, hand.b2, hand.b3].filter(Boolean).map(c => ({ img: c.img, d: c.label })),
        pFinal: hand.pFinal, bFinal: hand.bFinal,
        natural: hand.isNatural,
        errors: [{
          step: 'audit',
          choice,
          correct: hand.isCorrect ? 'correct' : 'error',
          ruleText: hand.explanation
        }]
      });
      if (arr.length > 300) arr.length = 300;
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (e) {}
  }

  /* ==================================================================
   * State
   * ================================================================== */

  let level         = 1;
  let showTotals    = true;    // only relevant for Level 1
  let timerDuration = 8;       // seconds (Level 4)
  let currentHand   = null;
  let answered      = false;
  let replayUsed    = false;
  let timerHandle   = null;
  let stats         = loadStats();

  /* ==================================================================
   * DOM refs
   * ================================================================== */

  const phaseStart = document.getElementById('phase-start');
  const phaseGame  = document.getElementById('phase-game');

  const feltEl     = document.getElementById('au-felt');
  const levelBadge = document.getElementById('au-level-badge');

  // Card slots
  const slotP1 = document.getElementById('au-p1');
  const slotP2 = document.getElementById('au-p2');
  const slotP3 = document.getElementById('au-p3');
  const slotB1 = document.getElementById('au-b1');
  const slotB2 = document.getElementById('au-b2');
  const slotB3 = document.getElementById('au-b3');
  const allSlots = [slotP1, slotP2, slotP3, slotB1, slotB2, slotB3];

  // Bet zones
  const betPlayer = document.getElementById('au-bet-player');
  const betBanker = document.getElementById('au-bet-banker');
  const betTie    = document.getElementById('au-bet-tie');
  const betMap    = { player: betPlayer, banker: betBanker, tie: betTie };

  // Totals + declare
  const bankerTotalEl = document.getElementById('au-banker-total');
  const playerTotalEl = document.getElementById('au-player-total');
  const declareTextEl = document.getElementById('au-declare-text');

  // Timer
  const timerWrapEl = document.getElementById('au-timer-wrap');
  const timerBarEl  = document.getElementById('au-timer-bar');

  // Decision
  const btnCorrect  = document.getElementById('au-btn-correct');
  const btnError    = document.getElementById('au-btn-error');
  const btnReplay   = document.getElementById('au-btn-replay');
  const btnNext     = document.getElementById('au-btn-next');
  const explainEl   = document.getElementById('au-explain');

  // Stats dock
  const sCorrect = document.getElementById('au-s-correct');
  const sWrong   = document.getElementById('au-s-wrong');
  const sHands   = document.getElementById('au-s-hands');
  const sRate    = document.getElementById('au-s-rate');
  const sPeeks   = document.getElementById('au-s-peeks');
  const peekChip = document.getElementById('au-peek-chip');

  /* ==================================================================
   * Slot rendering
   * ================================================================== */

  // Fill a slot with a card image, or leave it as an empty placeholder
  function setSlot(el, card, isThird) {
    el.innerHTML = '';
    el.className = 'au-spot' + (isThird ? ' au-spot--third' : '');
    if (card) {
      el.classList.add('filled');
      const img = document.createElement('img');
      img.src   = card.img;
      img.alt   = card.label;
      img.className = 'card-img';
      el.appendChild(img);
    }
    // Empty slots keep au-spot--third dashed-border style (from CSS)
  }

  function renderHand(hand) {
    setSlot(slotP1, hand.p1, false);
    setSlot(slotP2, hand.p2, false);
    setSlot(slotP3, hand.p3, true);   // may be null (Player stood)
    setSlot(slotB1, hand.b1, false);
    setSlot(slotB2, hand.b2, false);
    setSlot(slotB3, hand.b3, true);   // may be null (Banker stood)

    // Totals (respect showTotals setting; always revealed after answer)
    const showNow = (level === 1 && showTotals);
    bankerTotalEl.textContent = showNow ? hand.bFinal : '';
    playerTotalEl.textContent = showNow ? hand.pFinal : '';

    // Winner declaration banner + bet-zone highlight
    setWinnerDisplay(hand.declaredWinner);
  }

  function setWinnerDisplay(w) {
    Object.values(betMap).forEach(b => b.classList.remove('win'));
    if (betMap[w]) betMap[w].classList.add('win');
    const labels = { player: 'PLAYER WINS', banker: 'BANKER WINS', tie: 'TIE' };
    declareTextEl.textContent = labels[w] || '';
  }

  /* ==================================================================
   * Stats display
   * ================================================================== */

  function updateStatDisplay() {
    sCorrect.textContent = stats.correct;
    sWrong.textContent   = stats.incorrect;
    sHands.textContent   = stats.hands;
    const total = stats.correct + stats.incorrect;
    sRate.textContent    = total ? Math.round(stats.correct / total * 100) + '%' : '0%';
    peekChip.hidden      = (level !== 4);
    sPeeks.textContent   = stats.peeks;
  }

  /* ==================================================================
   * Level 4 timer
   * ================================================================== */

  function startTimer(onExpire) {
    timerWrapEl.hidden = false;
    // Reset bar instantly then animate width to 0
    timerBarEl.style.transition = 'none';
    timerBarEl.style.width      = '100%';
    void timerBarEl.offsetWidth; // force reflow

    timerBarEl.style.transition = `width ${timerDuration}s linear`;
    timerBarEl.style.width      = '0%';

    timerHandle = setTimeout(onExpire, timerDuration * 1000);
  }

  function stopTimer() {
    clearTimeout(timerHandle);
    timerHandle = null;
  }

  function blurCards()   { feltEl.classList.add('cards-hidden'); }
  function unblurCards() { feltEl.classList.remove('cards-hidden'); }

  /* ==================================================================
   * New hand
   * ================================================================== */

  function startHand() {
    currentHand = generateHand(level);
    answered    = false;
    replayUsed  = false;

    // Reset decision area
    explainEl.hidden   = true;
    btnNext.hidden     = true;
    btnReplay.hidden   = true;
    btnCorrect.disabled = false;
    btnError.disabled   = false;
    btnCorrect.className = 'au-btn au-btn--correct';
    btnError.className   = 'au-btn au-btn--error';

    unblurCards();
    stopTimer();
    timerWrapEl.hidden = true;

    renderHand(currentHand);

    if (level === 4) {
      startTimer(() => {
        blurCards();
        btnReplay.hidden = false; // offer one replay
      });
    }
  }

  /* ==================================================================
   * Answer commit
   * ================================================================== */

  function commitAnswer(choice) {
    if (answered) return;
    answered = true;

    stopTimer();
    if (level === 4) {
      blurCards(); // ensure blurred when answering
      btnReplay.hidden = true;
    }

    btnCorrect.disabled = true;
    btnError.disabled   = true;

    // Was the trainee right?
    const handIsError   = !currentHand.isCorrect;
    const traineeRight  = (choice === 'correct') === currentHand.isCorrect;

    // Style the buttons
    if (traineeRight) {
      (choice === 'correct' ? btnCorrect : btnError).classList.add('au-btn--right');
    } else {
      (choice === 'correct' ? btnCorrect : btnError).classList.add('au-btn--wrong');
      // Also highlight which one was actually correct
      (currentHand.isCorrect ? btnCorrect : btnError).classList.add('au-btn--right');
    }

    // Update stats
    if (traineeRight) {
      stats.correct++;
      stats.streak++;
      if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
    } else {
      stats.incorrect++;
      stats.streak = 0;
    }
    stats.hands++;
    if (!stats.byLevel) stats.byLevel = { 1:{c:0,w:0}, 2:{c:0,w:0}, 3:{c:0,w:0}, 4:{c:0,w:0} };
    const lv = stats.byLevel[level];
    if (lv) { if (traineeRight) lv.c++; else lv.w++; }
    saveStats(stats);
    updateStatDisplay();

    // Persist missed hands for the Review module
    if (!traineeRight) saveMissedHand(currentHand, choice);

    // Reveal totals now (always, regardless of level)
    unblurCards();
    bankerTotalEl.textContent = currentHand.bFinal;
    playerTotalEl.textContent = currentHand.pFinal;

    // Explanation panel
    explainEl.hidden    = false;
    explainEl.className = 'au-explain ' + (traineeRight ? 'au-explain--correct' : 'au-explain--wrong');
    const icon = traineeRight
      ? '<i class="fas fa-circle-check"></i>'
      : '<i class="fas fa-circle-xmark"></i>';
    explainEl.innerHTML = icon + ' ' + currentHand.explanation;

    btnNext.hidden = false;
  }

  /* ==================================================================
   * Level 4 replay (one per hand, costs a peek)
   * ================================================================== */

  function useReplay() {
    if (replayUsed || answered) return;
    replayUsed = true;

    stats.peeks++;
    saveStats(stats);
    updateStatDisplay();

    btnReplay.hidden = true;
    unblurCards();
    startTimer(() => blurCards()); // no second replay offered
  }

  /* ==================================================================
   * Phase switching
   * ================================================================== */

  function showStart() {
    stopTimer();
    phaseStart.hidden = false;
    phaseGame.hidden  = true;
  }

  function startGame(selectedLevel) {
    level      = selectedLevel;
    showTotals = (level === 1 && document.getElementById('au-show-totals').checked);
    timerDuration = parseInt(
      document.querySelector('#au-timer-seg .au-seg-btn--active')?.dataset.val || '8', 10
    );

    const levelNames = ['', 'Level 1 — Winner', 'Level 2 — Player Draw',
                             'Level 3 — Banker Draw', 'Level 4 — Surveillance'];
    levelBadge.textContent = levelNames[level] || 'Level ' + level;

    phaseStart.hidden = true;
    phaseGame.hidden  = false;

    updateStatDisplay();
    startHand();
  }

  /* ==================================================================
   * Event wiring
   * ================================================================== */

  // Level select
  document.querySelectorAll('.au-level-card').forEach(btn => {
    btn.addEventListener('click', () => {
      startGame(parseInt(btn.dataset.level, 10));
    });
  });

  // Timer segmented control
  document.querySelectorAll('#au-timer-seg .au-seg-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#au-timer-seg .au-seg-btn').forEach(b => b.classList.remove('au-seg-btn--active'));
      this.classList.add('au-seg-btn--active');
    });
  });

  // Decision
  btnCorrect.addEventListener('click', () => commitAnswer('correct'));
  btnError.addEventListener('click',   () => commitAnswer('error'));
  btnNext.addEventListener('click',    startHand);
  btnReplay.addEventListener('click',  useReplay);

  // Back to level select
  document.getElementById('au-back-btn').addEventListener('click', showStart);

  // Reset stats
  document.getElementById('au-reset-btn').addEventListener('click', () => {
    stats = {
      correct: 0, incorrect: 0, hands: 0, peeks: 0, streak: 0, bestStreak: 0,
      byLevel: { 1:{c:0,w:0}, 2:{c:0,w:0}, 3:{c:0,w:0}, 4:{c:0,w:0} }
    };
    saveStats(stats);
    updateStatDisplay();
  });

  /* ==================================================================
   * Boot — show level-select screen
   * ================================================================== */

  showStart();

})();
