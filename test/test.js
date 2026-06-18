/* =====================================================================
 * test.js — Assessment Mode.
 *
 * Three phases: start → test (sequential hands) → results.
 *
 * Each hand progresses through up to 3 decision steps:
 *   1. PLAYER  — Draw or Stand?
 *   2. BANKER  — Draw or Stand?
 *   3. WINNER  — Player / Tie / Banker?
 *
 * Naturals (initial total 8 or 9) skip to step 3 directly.
 *
 * ANTI-LEAKAGE:
 *   Only the cards relevant to the current decision are face-up.
 *   All others are face-down backs. No explanation appears until
 *   the results screen. Only a brief ✓/✗ icon flashes per decision.
 * =================================================================== */

(function () {
  'use strict';

  /* ==================================================================
   * Card generation — self-contained, no external dependency.
   * ================================================================== */

  const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];

  const RANK_DISPLAY = { A: 'A', T: '10', J: 'J', Q: 'Q', K: 'K' };

  /* Weighted card pool — mirrors js/core/cards.js RANK_POOL.
   * Zero-value court cards halved (T, J only); mid-range 3-7 doubled.
   * Each entry: [rank, baccarat-value].  */
  const CARD_POOL = [
    ['T', 0], ['J', 0],   // value 0 — two court cards (was four)
    ['A', 1],              // value 1
    ['2', 2],              // value 2
    ['3', 3], ['3', 3],   // value 3 — doubled
    ['4', 4], ['4', 4],   // value 4 — doubled
    ['5', 5], ['5', 5],   // value 5 — doubled
    ['6', 6], ['6', 6],   // value 6 — doubled
    ['7', 7], ['7', 7],   // value 7 — doubled
    ['8', 8],              // value 8 — natural
    ['9', 9],              // value 9 — natural
  ];

  function rndCard() {
    const [r, v] = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
    const s = SUITS[Math.floor(Math.random() * SUITS.length)];
    return {
      value: v,
      imagePath: `../assets/${s}${r}.png`,
      display: (RANK_DISPLAY[r] || r) + suitSymbol(s)
    };
  }


  function suitSymbol(s) {
    return { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' }[s];
  }

  function baccTotal(a, b) { return (a.value + b.value) % 10; }
  function baccTotal3(a, b, c) { return (a.value + b.value + c.value) % 10; }

  /* ==================================================================
   * Baccarat rules
   * ================================================================== */

  function shouldPlayerDraw(t) { return t <= 5; }

  function shouldBankerDraw(bt, playerDrew, p3Val) {
    if (!playerDrew) return bt <= 5;          // Player stood
    if (bt <= 2) return true;
    if (bt === 7) return false;
    if (bt === 3) return p3Val !== 8;
    if (bt === 4) return p3Val >= 2 && p3Val <= 7;
    if (bt === 5) return p3Val >= 4 && p3Val <= 7;
    if (bt === 6) return p3Val === 6 || p3Val === 7;
    return false;
  }

  function calcWinner(pFinal, bFinal) {
    if (pFinal > bFinal) return 'player';
    if (bFinal > pFinal) return 'banker';
    return 'tie';
  }

  /* ==================================================================
   * Rule explanation text (shown only in results)
   * ================================================================== */

  function playerRuleText(total, choice) {
    const correct = shouldPlayerDraw(total) ? 'draw' : 'stand';
    const action  = correct === 'draw' ? 'Draw on 0–5' : 'Stand on 6–7';
    return `Player total ${total}: ${action}.`;
  }

  function bankerRuleText(bt, playerDrew, p3Val, choice) {
    if (!playerDrew) {
      return `Banker total ${bt}: Player stood → ${bt <= 5 ? 'draw on 0–5' : 'stand on 6–7'}.`;
    }
    const correct = shouldBankerDraw(bt, playerDrew, p3Val);
    if (bt <= 2)  return `Banker ${bt}: always draw.`;
    if (bt === 7) return `Banker 7: always stand.`;
    if (bt === 3) return p3Val === 8
      ? `Banker 3: stand when Player's 3rd is 8.`
      : `Banker 3: draw (Player's 3rd ${p3Val} ≠ 8).`;
    if (bt === 4) return `Banker 4: ${correct ? 'draw' : 'stand'} — Player's 3rd ${p3Val} ${correct ? 'is' : 'not'} in 2–7.`;
    if (bt === 5) return `Banker 5: ${correct ? 'draw' : 'stand'} — Player's 3rd ${p3Val} ${correct ? 'is' : 'not'} in 4–7.`;
    if (bt === 6) return `Banker 6: ${correct ? 'draw' : 'stand'} — Player's 3rd ${p3Val} ${correct ? 'is' : 'not'} 6 or 7.`;
    return '';
  }

  function winnerRuleText(pFinal, bFinal, correct) {
    const labels = { player: 'Player', banker: 'Banker', tie: 'Tie' };
    return `Player ${pFinal} vs Banker ${bFinal} — ${labels[correct]}.`;
  }

  /* ==================================================================
   * Persist missed hands for the Review module.
   * Key: 'bac_missed_hands'  (shared across all training modules)
   * Capped at 300 entries, newest first.
   * ================================================================== */
  function saveMissedHand(entry) {
    try {
      const KEY = 'bac_missed_hands';
      const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
      arr.unshift(entry);
      if (arr.length > 300) arr.length = 300;
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (e) { /* storage unavailable — silently skip */ }
  }


  /* ==================================================================
   * State
   * ================================================================== */

  const state = {
    phase:       'start',
    totalHands:  20,
    handNum:     0,
    step:        null,     // 'player' | 'banker' | 'winner'

    // Current hand
    pC1: null, pC2: null, pC3: null,
    bC1: null, bC2: null, bC3: null,
    pInit: 0, bInit: 0,
    natural: false,
    playerDrew: false,
    bankerDrew: false,

    // Per-hand log: array of { step, choice, correct, wasCorrect, ruleText }
    handLog: [],

    // Session totals
    decTotal: 0, decCorrect: 0,
    playerDecTotal: 0, playerDecCorrect: 0,
    bankerDecTotal: 0, bankerDecCorrect: 0,
    winnerTotal: 0, winnerCorrect: 0,
    handsTotal: 0, handsCorrect: 0,

    // Full history for results review
    history: [],

    // Timer
    startTime:      null,
    timerInterval:  null,
    elapsedSec:     0
  };

  /* ==================================================================
   * DOM refs
   * ================================================================== */

  const elPhaseStart   = document.getElementById('phase-start');
  const elPhaseTest    = document.getElementById('phase-test');
  const elPhaseResults = document.getElementById('phase-results');

  const tB3 = document.getElementById('t-b3');
  const tB1 = document.getElementById('t-b1');
  const tB2 = document.getElementById('t-b2');
  const tP1 = document.getElementById('t-p1');
  const tP2 = document.getElementById('t-p2');
  const tP3 = document.getElementById('t-p3');
  const allSlots = [tB3, tB1, tB2, tP1, tP2, tP3];

  const ctxEl    = document.getElementById('t-context');
  const flashEl  = document.getElementById('t-flash');
  const ctrlsEl  = document.getElementById('t-controls');
  const pbarFill = document.getElementById('t-pbar-fill');
  const progLbl  = document.getElementById('t-prog-lbl');
  const timerLbl = document.getElementById('t-timer');

  /* ==================================================================
   * Phase management
   * ================================================================== */

  function setPhase(p) {
    state.phase = p;
    [elPhaseStart, elPhaseTest, elPhaseResults].forEach(el => el.classList.remove('is-active'));
    ({ start: elPhaseStart, test: elPhaseTest, results: elPhaseResults })[p].classList.add('is-active');
  }

  /* ==================================================================
   * Slot rendering
   * ================================================================== */

  function setSlot(el, mode, card) {
    el.innerHTML = '';
    el.className = 't-slot';
    if (mode === 'face-up' && card) {
      el.classList.add('t-slot--face-up');
      const img = document.createElement('img');
      img.src       = card.imagePath;
      img.alt       = card.display;
      img.className = 't-slot-img';
      el.appendChild(img);
    } else if (mode === 'back') {
      el.classList.add('t-slot--back');
    } else {
      el.classList.add('t-slot--empty');
    }
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function renderPlayerStep() {
    allSlots.forEach(s => setSlot(s, 'back'));
    await delay(80);
    setSlot(tP1, 'face-up', state.pC1);
    await delay(110);
    setSlot(tP2, 'face-up', state.pC2);
    // P3 stays as back (pending decision)
  }

  async function renderBankerStep() {
    // Transition: keep P3 state, reveal banker cards
    setSlot(tP1, 'back');
    setSlot(tP2, 'back');
    if (state.playerDrew && state.pC3) {
      setSlot(tP3, 'face-up', state.pC3);
    } else {
      setSlot(tP3, 'empty');
    }
    setSlot(tB3, 'back');
    await delay(80);
    setSlot(tB1, 'face-up', state.bC1);
    await delay(110);
    setSlot(tB2, 'face-up', state.bC2);
    // B3 stays as back (pending decision)
  }

  async function renderWinnerStep() {
    // Reveal everything
    setSlot(tP1, 'face-up', state.pC1);
    setSlot(tP2, 'face-up', state.pC2);
    setSlot(tP3, state.pC3 ? 'face-up' : 'empty', state.pC3);
    setSlot(tB1, 'face-up', state.bC1);
    setSlot(tB2, 'face-up', state.bC2);
    setSlot(tB3, state.bC3 ? 'face-up' : 'empty', state.bC3);
  }

  /* ==================================================================
   * Controls rendering
   * ================================================================== */

  function renderDrawStand() {
    ctrlsEl.innerHTML =
      `<div class="t-ctrl-2">
        <button class="t-btn t-btn--draw"  id="tb-draw">Draw</button>
        <button class="t-btn t-btn--stand" id="tb-stand">Stand</button>
      </div>`;
    document.getElementById('tb-draw').onclick  = () => commitDecision('draw');
    document.getElementById('tb-stand').onclick = () => commitDecision('stand');
  }

  // Dealer-perspective button order: BANKER (left) | TIE (centre) | PLAYER (right)
  // This matches the table layout — Banker seat is on the dealer's left.
  function renderWinnerBtns() {
    ctrlsEl.innerHTML =
      `<div class="t-ctrl-3">
        <button class="t-btn t-btn--banker" id="tb-banker">Banker</button>
        <button class="t-btn t-btn--tie"    id="tb-tie">Tie</button>
        <button class="t-btn t-btn--player" id="tb-player">Player</button>
      </div>`;
    document.getElementById('tb-banker').onclick = () => commitWinner('banker');
    document.getElementById('tb-tie').onclick    = () => commitWinner('tie');
    document.getElementById('tb-player').onclick = () => commitWinner('player');
  }


  /* ==================================================================
   * Progress bar + timer
   * ================================================================== */

  function renderProgress() {
    const pct = ((state.handNum - 1) / state.totalHands) * 100;
    pbarFill.style.width = pct + '%';
    progLbl.textContent  = `Hand ${state.handNum} of ${state.totalHands}`;
  }

  function startTimer() {
    state.startTime     = Date.now();
    state.elapsedSec    = 0;
    state.timerInterval = setInterval(() => {
      state.elapsedSec = Math.floor((Date.now() - state.startTime) / 1000);
      const m = Math.floor(state.elapsedSec / 60);
      const s = state.elapsedSec % 60;
      timerLbl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
  }

  function stopTimer() {
    clearInterval(state.timerInterval);
  }

  /* ==================================================================
   * Flash
   * ================================================================== */

  function showFlash(wasCorrect) {
    ctrlsEl.classList.add('locked');
    flashEl.className = `t-flash t-flash--${wasCorrect ? 'correct' : 'wrong'}`;
    flashEl.innerHTML = wasCorrect
      ? `<i class="fas fa-circle-check"></i>`
      : `<i class="fas fa-circle-xmark"></i>`;
    flashEl.hidden = false;
    setTimeout(() => {
      flashEl.hidden = true;
      ctrlsEl.classList.remove('locked');
    }, 680);
  }

  /* ==================================================================
   * Hand flow
   * ================================================================== */

  function startHand() {
    state.pC1 = rndCard(); state.pC2 = rndCard();
    state.bC1 = rndCard(); state.bC2 = rndCard();
    state.pC3 = state.bC3 = null;
    state.playerDrew = state.bankerDrew = false;
    state.pInit = baccTotal(state.pC1, state.pC2);
    state.bInit = baccTotal(state.bC1, state.bC2);
    state.natural = state.pInit >= 8 || state.bInit >= 8;
    state.handLog = [];

    renderProgress();

    if (state.natural) {
      setStep('winner');
    } else {
      setStep('player');
    }
  }

  async function setStep(step) {
    state.step = step;
    ctrlsEl.innerHTML = '';
    flashEl.hidden = true;

    if (step === 'player') {
      ctxEl.textContent = 'Player — Draw or Stand?';
      await renderPlayerStep();
      renderDrawStand();

    } else if (step === 'banker') {
      ctxEl.textContent = 'Banker — Draw or Stand?';
      await renderBankerStep();
      renderDrawStand();

    } else { // winner
      ctxEl.textContent = state.natural
        ? 'Natural — Call the Winner.'
        : 'Call the Winner.';
      await renderWinnerStep();
      renderWinnerBtns();
    }
  }

  function commitDecision(choice) {
    const isPlayer = state.step === 'player';
    const correct = isPlayer
      ? (shouldPlayerDraw(state.pInit) ? 'draw' : 'stand')
      : (shouldBankerDraw(state.bInit, state.playerDrew, state.pC3 ? state.pC3.value : null) ? 'draw' : 'stand');

    const wasCorrect = choice === correct;

    state.handLog.push({
      step: isPlayer ? 'player' : 'banker',
      choice, correct, wasCorrect,
      ruleText: isPlayer
        ? playerRuleText(state.pInit, choice)
        : bankerRuleText(state.bInit, state.playerDrew, state.pC3 ? state.pC3.value : null, choice)
    });

    // Apply the trainee's choice (right or wrong — their decision drives the hand)
    if (isPlayer) {
      if (choice === 'draw') {
        state.pC3 = rndCard();
        state.playerDrew = true;
      }
    } else {
      if (choice === 'draw') {
        state.bC3 = rndCard();
        state.bankerDrew = true;
      }
    }

    showFlash(wasCorrect);
    setTimeout(() => setStep(isPlayer ? 'banker' : 'winner'), 760);
  }

  function commitWinner(choice) {
    const pFinal = state.pC3
      ? baccTotal3(state.pC1, state.pC2, state.pC3)
      : baccTotal(state.pC1, state.pC2);
    const bFinal = state.bC3
      ? baccTotal3(state.bC1, state.bC2, state.bC3)
      : baccTotal(state.bC1, state.bC2);

    const correct    = calcWinner(pFinal, bFinal);
    const wasCorrect = choice === correct;

    state.handLog.push({
      step: 'winner',
      choice, correct, wasCorrect,
      ruleText: winnerRuleText(pFinal, bFinal, correct)
    });

    // Tally decisions
    state.handLog.forEach(d => {
      state.decTotal++;
      if (d.wasCorrect) state.decCorrect++;
      if (d.step === 'player') {
        state.playerDecTotal++;
        if (d.wasCorrect) state.playerDecCorrect++;
      } else if (d.step === 'banker') {
        state.bankerDecTotal++;
        if (d.wasCorrect) state.bankerDecCorrect++;
      } else {
        state.winnerTotal++;
        if (d.wasCorrect) state.winnerCorrect++;
      }
    });

    const handAllCorrect = state.handLog.every(d => d.wasCorrect);
    state.handsTotal++;
    if (handAllCorrect) state.handsCorrect++;

    // Persist wrong hands so the Review module can show them
    if (!handAllCorrect) {
      saveMissedHand({
        id: Date.now() + '-' + Math.random().toString(36).slice(2),
        source: 'test',
        ts: Date.now(),
        pCards: [state.pC1, state.pC2, state.pC3].filter(Boolean)
          .map(c => ({ img: c.imagePath, d: c.display })),
        bCards: [state.bC1, state.bC2, state.bC3].filter(Boolean)
          .map(c => ({ img: c.imagePath, d: c.display })),
        pFinal,
        bFinal,
        natural: state.natural,
        errors: state.handLog.filter(d => !d.wasCorrect).map(d => ({
          step:     d.step,
          choice:   d.choice,
          correct:  d.correct,
          ruleText: d.ruleText
        }))
      });
    }

    state.history.push({

      handNum: state.handNum,
      pC1: state.pC1, pC2: state.pC2, pC3: state.pC3,
      bC1: state.bC1, bC2: state.bC2, bC3: state.bC3,
      pFinal, bFinal, natural: state.natural,
      log: state.handLog,
      anyWrong: !handAllCorrect
    });

    showFlash(wasCorrect);

    if (state.handNum >= state.totalHands) {
      setTimeout(finishTest, 900);
    } else {
      state.handNum++;
      setTimeout(startHand, 900);
    }
  }

  /* ==================================================================
   * Results
   * ================================================================== */

  function finishTest() {
    stopTimer();
    pbarFill.style.width = '100%';

    // Write cumulative stats to localStorage so Progress module can read them
    writeTestStats();

    setPhase('results');
    buildResults();
  }

  function writeTestStats() {
    try {
      const KEY = 'bac_stats_test';
      const prev = JSON.parse(localStorage.getItem(KEY) || '{}');
      const data = {
        correct:     (prev.correct   || 0) + state.decCorrect,
        incorrect:   (prev.incorrect || 0) + (state.decTotal - state.decCorrect),
        hands:       (prev.hands     || 0) + state.handsTotal,
        streak:      0,   // not tracked per-session in test mode
        bestStreak:  prev.bestStreak || 0,
        peeks:       prev.peeks || 0
      };
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* storage unavailable */ }
  }


  function pct(correct, total) {
    return total ? Math.round((correct / total) * 100) : 0;
  }

  function buildResults() {
    const handsCorrect = state.handsCorrect;
    const handsTotal   = state.handsTotal;
    const p            = pct(handsCorrect, handsTotal);

    document.getElementById('rs-pct').textContent          = p + '%';
    document.getElementById('rs-hands-correct').textContent = handsCorrect;
    document.getElementById('rs-hands-total').textContent   = handsTotal;

    // Colour-code ring by score
    const ring = document.getElementById('rs-ring');
    ring.style.borderColor = p >= 85
      ? 'var(--correct)'
      : p >= 65
        ? 'var(--gold-400)'
        : 'var(--incorrect)';

    // Elapsed time
    const m = Math.floor(state.elapsedSec / 60);
    const s = state.elapsedSec % 60;
    document.getElementById('rs-time').textContent =
      `Completed in ${m}:${s.toString().padStart(2, '0')}`;

    // Breakdown pills
    const bd = document.getElementById('rs-breakdown');
    bd.innerHTML = '';
    const cats = [
      { label: 'Player',  correct: state.playerDecCorrect, total: state.playerDecTotal },
      { label: 'Banker',  correct: state.bankerDecCorrect, total: state.bankerDecTotal },
      { label: 'Winner',  correct: state.winnerCorrect,    total: state.winnerTotal    },
    ];
    cats.forEach(c => {
      if (!c.total) return;
      const span = document.createElement('span');
      span.className = 'rs-cat';
      span.textContent = `${c.label}: ${c.correct}/${c.total}`;
      if (c.correct === c.total) span.style.borderColor = 'rgba(47,191,107,0.5)';
      else if (pct(c.correct, c.total) < 70) span.style.borderColor = 'rgba(224,85,107,0.5)';
      bd.appendChild(span);
    });

    // Missed hands
    const missed = state.history.filter(h => h.anyWrong);
    const missedEl = document.getElementById('rs-missed');
    if (missed.length === 0) {
      missedEl.innerHTML = '<p style="color:var(--correct);text-align:center;font-size:0.85rem">Perfect score! All hands correct.</p>';
      return;
    }

    missedEl.innerHTML = `<p class="missed-heading">Missed (${missed.length} hand${missed.length > 1 ? 's' : ''})</p>`;
    missed.forEach(h => {
      const div = document.createElement('div');
      div.className = 'missed-hand';

      let html = `<span class="missed-hand__num">Hand ${h.handNum}`;
      if (h.natural) html += ' — Natural';
      html += `</span>`;

      // Show card labels
      const pCards = [h.pC1, h.pC2, h.pC3].filter(Boolean).map(c => c.display).join(' ');
      const bCards = [h.bC1, h.bC2, h.bC3].filter(Boolean).map(c => c.display).join(' ');
      html += `<div style="font-size:0.76rem;color:var(--muted);margin-bottom:0.35rem">
        P: ${pCards} = ${h.pFinal} &nbsp;|&nbsp; B: ${bCards} = ${h.bFinal}
      </div>`;

      // Decision errors
      h.log.forEach(d => {
        const labels = { player: 'Player', banker: 'Banker', winner: 'Winner' };
        const lblChoice = { draw: 'Draw', stand: 'Stand', player: 'Player', banker: 'Banker', tie: 'Tie' };
        if (!d.wasCorrect) {
          html += `<div class="missed-dec--wrong">
            ✗ ${labels[d.step]}: you said <b>${lblChoice[d.choice]}</b>  →  should be <b>${lblChoice[d.correct]}</b>.
            <span style="color:var(--muted);font-size:0.75em"> ${d.ruleText}</span>
          </div>`;
        }
      });

      div.innerHTML = html;
      missedEl.appendChild(div);
    });
  }

  /* ==================================================================
   * Configuration & start
   * ================================================================== */

  // Segmented hand-count selector
  document.querySelectorAll('#hands-seg .seg__btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#hands-seg .seg__btn').forEach(b => b.classList.remove('seg__btn--active'));
      btn.classList.add('seg__btn--active');
      state.totalHands = parseInt(btn.dataset.val, 10);
    });
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    // Reset session state
    Object.assign(state, {
      handNum: 1,
      decTotal: 0, decCorrect: 0,
      playerDecTotal: 0, playerDecCorrect: 0,
      bankerDecTotal: 0, bankerDecCorrect: 0,
      winnerTotal: 0, winnerCorrect: 0,
      handsTotal: 0, handsCorrect: 0,
      history: []
    });
    timerLbl.textContent = '0:00';
    pbarFill.style.width = '0%';

    setPhase('test');
    startTimer();
    startHand();
  });

  document.getElementById('new-test-btn').addEventListener('click', () => {
    setPhase('start');
  });

  /* Boot: show start screen (already has is-active in HTML) */

})();
