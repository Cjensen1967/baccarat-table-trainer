/* =====================================================================
 * drill.js — Drill Mode: rapid-fire single-decision rules practice.
 *
 * Text-based scenarios (no card images) for fast, focused drilling.
 * Three exercise categories:
 *   Player — Player total 2–7, draw or stand?
 *   Banker — Banker total + Player's third card (or Player stood), draw?
 *   Mixed  — randomly mixes both types
 *
 * ANSWER LEAKAGE PREVENTION:
 *   - The correct answer is never revealed until the trainee taps.
 *   - Both buttons look equally neutral before a decision.
 *   - Correct/wrong styling + explanation appear only post-commit.
 * =================================================================== */

(function () {
  'use strict';

  /* ==================================================================
   * Baccarat rule helpers (self-contained — no dependency on rules.js)
   * ================================================================== */

  function playerDraws(total) { return total <= 5; }

  function bankerDrawsWhenPlayerStood(bTotal) { return bTotal <= 5; }

  function bankerDrawsAfterPlayerDrew(bTotal, p3) {
    if (bTotal <= 2) return true;
    if (bTotal === 7) return false;
    if (bTotal === 3) return p3 !== 8;
    if (bTotal === 4) return p3 >= 2 && p3 <= 7;
    if (bTotal === 5) return p3 >= 4 && p3 <= 7;
    if (bTotal === 6) return p3 === 6 || p3 === 7;
    return false;
  }

  function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /* ==================================================================
   * Scenario generators
   * Each returns: { context, html, correct ('draw'|'stand'), explanation }
   * ================================================================== */

  function genPlayerScenario() {
    // Player totals 2–7. Skip 0,1 (too rare & teach same rule), 8,9 (natural).
    const total = rnd(2, 7);
    const correct = playerDraws(total) ? 'draw' : 'stand';
    return {
      context: 'Player — Draw or Stand?',
      html: `Player has <span class="total-chip">${total}</span>`,
      correct,
      explanation: correct === 'draw'
        ? `Player draws on 0–5. Total is ${total} — draw.`
        : `Player stands on 6–7. Total is ${total} — stand.`
    };
  }

  function genBankerScenario() {
    const bTotal = rnd(0, 7); // naturals (8–9) excluded
    const playerStood = Math.random() < 0.3; // ~30% of banker drills = player stood

    if (playerStood) {
      const pStandTotal = Math.random() < 0.5 ? 6 : 7;
      const correct = bankerDrawsWhenPlayerStood(bTotal) ? 'draw' : 'stand';
      return {
        context: `Player stood on ${pStandTotal} — Banker Draw or Stand?`,
        html: `Banker has <span class="total-chip">${bTotal}</span>`,
        correct,
        explanation: correct === 'draw'
          ? `When Player stands, Banker follows the same rule: draw on 0–5. Banker total: ${bTotal}.`
          : `When Player stands, Banker follows the same rule: stand on 6–7. Banker total: ${bTotal}.`
      };
    }

    // Player drew a third card
    const p3 = rnd(0, 9);
    const correct = bankerDrawsAfterPlayerDrew(bTotal, p3) ? 'draw' : 'stand';
    const explanation = getBankerRuleText(bTotal, p3);
    return {
      context: `Player drew — Banker Draw or Stand?`,
      html: `Banker <span class="total-chip">${bTotal}</span>` +
            ` &nbsp;Player's 3rd&nbsp;<span class="total-chip">${p3}</span>`,
      correct,
      explanation
    };
  }

  function getBankerRuleText(bTotal, p3) {
    if (bTotal <= 2) {
      return `Banker 0–2 always draws. Banker total: ${bTotal}.`;
    }
    if (bTotal === 3) {
      return p3 === 8
        ? `Banker 3 stands when Player's third card is 8.`
        : `Banker 3 draws unless Player's third is 8. Player drew ${p3} — so Banker draws.`;
    }
    if (bTotal === 4) {
      const draws = p3 >= 2 && p3 <= 7;
      return draws
        ? `Banker 4 draws when Player's third is 2–7. Player drew ${p3} — so Banker draws.`
        : `Banker 4 draws only on Player's third 2–7. Player drew ${p3} — outside that range, Banker stands.`;
    }
    if (bTotal === 5) {
      const draws = p3 >= 4 && p3 <= 7;
      return draws
        ? `Banker 5 draws when Player's third is 4–7. Player drew ${p3} — so Banker draws.`
        : `Banker 5 draws only on Player's third 4–7. Player drew ${p3} — outside that range, Banker stands.`;
    }
    if (bTotal === 6) {
      const draws = p3 === 6 || p3 === 7;
      return draws
        ? `Banker 6 draws when Player's third is 6 or 7. Player drew ${p3} — so Banker draws.`
        : `Banker 6 draws only when Player's third is 6–7. Player drew ${p3} — Banker stands.`;
    }
    return `Banker 7 always stands.`;
  }

  function genScenario(cat) {
    if (cat === 'player') return genPlayerScenario();
    if (cat === 'banker') return genBankerScenario();
    // Mixed: ~40% Player, ~60% Banker (Banker rules are harder)
    return Math.random() < 0.4 ? genPlayerScenario() : genBankerScenario();
  }

  /* ==================================================================
   * Persistent stats (localStorage) for the dashboard card
   * ================================================================== */

  const STORE_KEY = 'bac_stats_drill';

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || { correct: 0, incorrect: 0, hands: 0 };
    } catch (e) {
      return { correct: 0, incorrect: 0, hands: 0 };
    }
  }

  function saveStore(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  /* ==================================================================
   * State
   * ================================================================== */

  let cat      = 'player';
  let current  = null;
  let answered = false;
  let correct  = 0;
  let wrong    = 0;
  let streak   = 0;

  /* ==================================================================
   * DOM refs
   * ================================================================== */

  const contextEl  = document.getElementById('scenario-context');
  const qEl        = document.getElementById('scenario-q');
  const answerEl   = document.getElementById('scenario-answer');
  const controls   = document.getElementById('drill-controls');
  const btnDraw    = document.getElementById('btn-draw');
  const btnStand   = document.getElementById('btn-stand');

  const elCorrect  = document.getElementById('s-correct');
  const elWrong    = document.getElementById('s-wrong');
  const elStreak   = document.getElementById('s-streak');
  const elRate     = document.getElementById('s-rate');

  /* ==================================================================
   * UI
   * ================================================================== */

  function updateStats() {
    elCorrect.textContent = correct;
    elWrong.textContent   = wrong;
    elStreak.textContent  = streak;
    const total = correct + wrong;
    elRate.textContent    = total ? Math.round((correct / total) * 100) + '%' : '0%';
  }

  function showScenario() {
    current  = genScenario(cat);
    answered = false;

    contextEl.textContent = current.context;
    qEl.innerHTML         = current.html;
    answerEl.hidden       = true;
    answerEl.textContent  = '';

    // Reset button classes to neutral
    btnDraw.className  = 'drill-btn drill-btn--draw';
    btnStand.className = 'drill-btn drill-btn--stand';
    controls.classList.remove('answered');
  }

  function commitAnswer(choice) {
    if (answered) return;
    answered = true;
    controls.classList.add('answered');

    const wasCorrect = choice === current.correct;

    if (wasCorrect) {
      correct++;
      streak++;
      (choice === 'draw' ? btnDraw : btnStand).classList.add('correct');
    } else {
      wrong++;
      streak = 0;
      (choice === 'draw' ? btnDraw : btnStand).classList.add('wrong');
      // Reveal which was correct — shown AFTER the trainee commits
      (current.correct === 'draw' ? btnDraw : btnStand).classList.add('correct');
    }

    updateStats();

    // Persist for dashboard
    const store = loadStore();
    store.correct   = (store.correct   || 0) + (wasCorrect ? 1 : 0);
    store.incorrect = (store.incorrect || 0) + (wasCorrect ? 0 : 1);
    store.hands     = (store.correct   || 0) + (store.incorrect || 0);
    saveStore(store);

    // Show explanation
    const icon = wasCorrect
      ? `<i class="fas fa-circle-check" style="color:var(--correct)"></i> `
      : `<i class="fas fa-circle-xmark" style="color:var(--incorrect)"></i> `;
    answerEl.innerHTML = icon + current.explanation;
    answerEl.hidden = false;

    // Auto-advance to the next scenario after a brief pause
    setTimeout(showScenario, 2200);
  }

  /* ==================================================================
   * Event wiring
   * ================================================================== */

  btnDraw.addEventListener('click',  () => commitAnswer('draw'));
  btnStand.addEventListener('click', () => commitAnswer('stand'));

  document.querySelectorAll('.cat-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.cat-btn').forEach(function (b) {
        b.classList.remove('cat-btn--active');
      });
      btn.classList.add('cat-btn--active');
      cat = btn.dataset.cat;
      showScenario();
    });
  });

  document.getElementById('reset-btn').addEventListener('click', function () {
    correct = wrong = streak = 0;
    saveStore({ correct: 0, incorrect: 0, hands: 0 });
    updateStats();
    showScenario();
  });

  /* ==================================================================
   * Boot
   * ================================================================== */

  showScenario();
  updateStats();

})();
