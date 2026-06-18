/* =====================================================================
 * commission.js — Commission Drill.
 *
 * Drill flow:
 *   1. Show a random Banker bet ($25–$500, $5 increments).

 *   2. Step 1: Trainee types the 5% commission and submits.
 *      - Wrong: highlight input red, show "Incorrect — try again".
 *      - Correct: green border, unlock Step 2.
 *   3. Step 2: Trainee types the net payout (bet − commission).
 *      - Same correct/wrong logic.
 *      - Correct: show "Next Hand" button.
 *   4. Next Hand generates a new wager and resets.
 *
 * Anti-leakage: the correct answer is never shown (no "answer reveal").
 * The trainee must work it out and keep retrying until correct.
 *
 * Stats stored in localStorage (bac_stats_commission).
 * =================================================================== */

(function () {
  'use strict';

  /* ==================================================================
   * Wager generation: $25–$500 in $5 increments
   * ================================================================== */

  const MIN    = 25;
  const MAX    = 500;
  const STEP   = 5;


  function generateWager() {
    const steps = (MAX - MIN) / STEP;
    return MIN + Math.floor(Math.random() * (steps + 1)) * STEP;
  }

  function fmt(n) {
    return '$' + n.toFixed(2);
  }

  /* ==================================================================
   * Stats (localStorage)
   * ================================================================== */
  const STATS_KEY = 'bac_stats_commission';

  function loadStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) return Object.assign({ correct: 0, wrong: 0, hands: 0 }, JSON.parse(raw));
    } catch (e) {}
    return { correct: 0, wrong: 0, hands: 0 };
  }

  function saveStats(s) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  let stats = loadStats();

  function updateStatDisplay() {
    document.getElementById('cm-correct').textContent = stats.correct;
    document.getElementById('cm-wrong').textContent   = stats.wrong;
    document.getElementById('cm-hands').textContent   = stats.hands;
  }

  /* ==================================================================
   * State
   * ================================================================== */
  let currentWager      = 0;
  let currentCommission = 0;
  let currentPayout     = 0;
  let step1Done         = false;

  /* ==================================================================
   * DOM refs
   * ================================================================== */
  const wagerEl          = document.getElementById('cm-wager');

  const stepCommission   = document.getElementById('step-commission');
  const commissionInput  = document.getElementById('commission-input');
  const commissionCheck  = document.getElementById('commission-check-btn');
  const commissionResult = document.getElementById('commission-result');

  const stepPayout       = document.getElementById('step-payout');
  const payoutInput      = document.getElementById('payout-input');
  const payoutCheck      = document.getElementById('payout-check-btn');
  const payoutResult     = document.getElementById('payout-result');

  const nextBtn          = document.getElementById('cm-next-btn');
  const resetBtn         = document.getElementById('cm-reset-btn');

  /* ==================================================================
   * New hand
   * ================================================================== */
  function newHand() {
    currentWager      = generateWager();
    currentCommission = parseFloat((currentWager * 0.05).toFixed(2));
    currentPayout     = parseFloat((currentWager - currentCommission).toFixed(2));
    step1Done         = false;

    // Update wager display (re-trigger animation by cloning the node)
    wagerEl.textContent = fmt(currentWager);

    // Reset Step 1
    commissionInput.value = '';
    commissionInput.disabled = false;
    commissionInput.className = 'cm-input';
    commissionCheck.disabled  = false;
    commissionResult.hidden   = true;
    commissionResult.className = 'cm-result';
    commissionResult.textContent = '';
    stepCommission.className = 'cm-step';

    // Reset Step 2 (locked until Step 1 done)
    payoutInput.value = '';
    payoutInput.disabled = true;
    payoutInput.className = 'cm-input';
    payoutCheck.disabled  = true;
    payoutResult.hidden   = true;
    payoutResult.className = 'cm-result';
    payoutResult.textContent = '';
    stepPayout.className = 'cm-step cm-step--locked';

    // Hide next button
    nextBtn.hidden = true;

    // Focus commission input
    setTimeout(() => commissionInput.focus(), 50);
  }

  /* ==================================================================
   * Result helpers
   * ================================================================== */
  function showResult(el, isCorrect, msg) {
    el.hidden = false;
    el.className = 'cm-result ' + (isCorrect ? 'cm-result--correct' : 'cm-result--wrong');
    el.textContent = msg;
  }

  /* ==================================================================
   * Step 1 — Commission check
   * ================================================================== */
  function checkCommission() {
    const raw = commissionInput.value.trim();
    if (raw === '') return;

    const entered = parseFloat(raw);
    if (isNaN(entered)) {
      showResult(commissionResult, false, 'Please enter a valid number.');
      commissionInput.className = 'cm-input is-wrong';
      stats.wrong++;
      saveStats(stats);
      updateStatDisplay();
      return;
    }

    const rounded = parseFloat(entered.toFixed(2));

    if (rounded === currentCommission) {
      // Correct
      commissionInput.className = 'cm-input is-correct';
      commissionInput.disabled  = true;
      commissionCheck.disabled  = true;
      showResult(commissionResult, true, `✓ Correct — ${fmt(currentCommission)}`);
      stepCommission.className = 'cm-step cm-step--done';

      stats.correct++;
      saveStats(stats);
      updateStatDisplay();

      // Unlock Step 2
      step1Done = true;
      stepPayout.className = 'cm-step';
      payoutInput.disabled  = false;
      payoutCheck.disabled  = false;
      setTimeout(() => payoutInput.focus(), 80);

    } else {
      // Wrong
      commissionInput.className = 'cm-input is-wrong';
      showResult(commissionResult, false, 'Incorrect — try again.');

      stats.wrong++;
      saveStats(stats);
      updateStatDisplay();

      // Clear and refocus so they try again
      setTimeout(() => {
        commissionInput.value = '';
        commissionInput.className = 'cm-input';
        commissionResult.hidden = true;
        commissionInput.focus();
      }, 900);
    }
  }

  /* ==================================================================
   * Step 2 — Payout check
   * ================================================================== */
  function checkPayout() {
    if (!step1Done) return;
    const raw = payoutInput.value.trim();
    if (raw === '') return;

    const entered = parseFloat(raw);
    if (isNaN(entered)) {
      showResult(payoutResult, false, 'Please enter a valid number.');
      payoutInput.className = 'cm-input is-wrong';
      stats.wrong++;
      saveStats(stats);
      updateStatDisplay();
      return;
    }

    const rounded = parseFloat(entered.toFixed(2));

    if (rounded === currentPayout) {
      // Correct
      payoutInput.className = 'cm-input is-correct';
      payoutInput.disabled  = true;
      payoutCheck.disabled  = true;
      showResult(payoutResult, true, `✓ Correct — ${fmt(currentPayout)}`);
      stepPayout.className = 'cm-step cm-step--done';

      stats.correct++;
      stats.hands++;
      saveStats(stats);
      updateStatDisplay();

      // Show Next Hand button
      nextBtn.hidden = false;
      setTimeout(() => nextBtn.focus(), 80);

    } else {
      // Wrong
      payoutInput.className = 'cm-input is-wrong';
      showResult(payoutResult, false, 'Incorrect — try again.');

      stats.wrong++;
      saveStats(stats);
      updateStatDisplay();

      setTimeout(() => {
        payoutInput.value = '';
        payoutInput.className = 'cm-input';
        payoutResult.hidden = true;
        payoutInput.focus();
      }, 900);
    }
  }

  /* ==================================================================
   * Event wiring
   * ================================================================== */
  commissionCheck.addEventListener('click', checkCommission);
  commissionInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') checkCommission();
  });

  payoutCheck.addEventListener('click', checkPayout);
  payoutInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPayout();
  });

  nextBtn.addEventListener('click', newHand);

  resetBtn.addEventListener('click', () => {
    stats = { correct: 0, wrong: 0, hands: 0 };
    saveStats(stats);
    updateStatDisplay();
    newHand();
  });

  /* ---- Hint / rules panel ----------------------------------------- */
  const rulesBtn     = document.getElementById('cm-rules-btn');
  const hintPanel    = document.getElementById('cm-hint');
  const hintBackdrop = document.getElementById('cm-hint-backdrop');
  const hintClose    = document.getElementById('cm-hint-close');

  function openHint() {
    hintPanel.hidden = false;
    hintBackdrop.hidden = false;
  }
  function closeHint() {
    hintPanel.hidden = true;
    hintBackdrop.hidden = true;
  }

  rulesBtn.addEventListener('click', openHint);
  hintClose.addEventListener('click', closeHint);
  hintBackdrop.addEventListener('click', closeHint);

  /* ==================================================================
   * Boot
   * ================================================================== */
  updateStatDisplay();
  newHand();

})();
