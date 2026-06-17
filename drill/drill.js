/* =====================================================================
 * drill.js — Drill Mode: rapid-fire single-decision rules practice.
 *
 * Scenarios are presented as actual card images so the trainee must
 * recognise card values and total the hand — not just react to a number.
 *
 * Three categories:
 *   Player — Two player cards; Draw or Stand?
 *   Banker — Banker's two cards (+Player's 3rd when applicable); Draw or Stand?
 *   Mixed  — random mix of both
 *
 * ANSWER LEAKAGE PREVENTION:
 *   Cards, layout, and controls reveal nothing about the correct action
 *   before the trainee commits. Correct/wrong + explanation are shown
 *   only after the choice is made.
 * =================================================================== */

(function () {
  'use strict';

  /* ==================================================================
   * Card generation (self-contained, no dependency on cards.js)
   * ================================================================== */

  const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];

  // Maps baccarat point value → possible ranks
  const RANKS_BY_VALUE = [
    ['T', 'J', 'Q', 'K'], // 0
    ['A'],                  // 1
    ['2'],                  // 2
    ['3'],                  // 3
    ['4'],                  // 4
    ['5'],                  // 5
    ['6'],                  // 6
    ['7'],                  // 7
    ['8'],                  // 8
    ['9']                   // 9
  ];

  // Display labels for ranks (used in alt text)
  const RANK_NAMES = { A: 'Ace', T: '10', J: 'Jack', Q: 'Queen', K: 'King' };

  function randomCardWithValue(v) {
    const ranks = RANKS_BY_VALUE[v];
    const rank  = ranks[Math.floor(Math.random() * ranks.length)];
    const suit  = SUITS[Math.floor(Math.random() * SUITS.length)];
    const name  = (RANK_NAMES[rank] || rank) + ' of ' + suit;
    return {
      value:     v,
      imagePath: `../assets/${suit}${rank}.png`,
      label:     name
    };
  }

  /** Return a pair of cards whose baccarat total equals `total`. */
  function pairWithTotal(total) {
    const v1 = Math.floor(Math.random() * 10);       // 0–9
    const v2 = (total - v1 + 10) % 10;
    return [randomCardWithValue(v1), randomCardWithValue(v2)];
  }

  function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /* ==================================================================
   * HTML helpers
   * ================================================================== */

  function cardImg(card) {
    return `<img class="drill-card" src="${card.imagePath}" alt="${card.label}" draggable="false">`;
  }

  /** One hand: optional label above a row of cards. */
  function handHTML(cards, label) {
    const imgs  = cards.map(cardImg).join('');
    const lbl   = label ? `<span class="drill-hand-label">${label}</span>` : '';
    return `<div class="drill-hand">${lbl}<div class="drill-cards">${imgs}</div></div>`;
  }

  /* ==================================================================
   * Baccarat rules (self-contained)
   * ================================================================== */

  function playerDraws(t) { return t <= 5; }

  function bankerDrawsWhenPlayerStood(bt) { return bt <= 5; }

  function bankerDrawsAfterPlayerDrew(bt, p3) {
    if (bt <= 2) return true;
    if (bt === 7) return false;
    if (bt === 3) return p3 !== 8;
    if (bt === 4) return p3 >= 2 && p3 <= 7;
    if (bt === 5) return p3 >= 4 && p3 <= 7;
    if (bt === 6) return p3 === 6 || p3 === 7;
    return false;
  }

  /* ==================================================================
   * Scenario generators
   * Each returns: { context, html, correct, explanation }
   * ================================================================== */

  function genPlayerScenario() {
    const total        = rnd(0, 7);
    const [c1, c2]     = pairWithTotal(total);
    const correct      = playerDraws(total) ? 'draw' : 'stand';
    const sumStr       = (c1.value + c2.value > 9)
      ? `${c1.value}+${c2.value}=<b>${c1.value + c2.value}</b>→<b>${total}</b>`
      : `${c1.value}+${c2.value}=<b>${total}</b>`;

    return {
      context: 'Player — Draw or Stand?',
      html:    handHTML([c1, c2], null),
      correct,
      explanation: `${sumStr}. ` + (correct === 'draw'
        ? `Player draws on 0–5 — draw.`
        : `Player stands on 6–7 — stand.`)
    };
  }

  function genBankerScenario() {
    const bTotal       = rnd(0, 7);
    const [bC1, bC2]   = pairWithTotal(bTotal);
    const playerStood  = Math.random() < 0.3;

    if (playerStood) {
      const pStandTotal = Math.random() < 0.5 ? 6 : 7;
      const correct     = bankerDrawsWhenPlayerStood(bTotal) ? 'draw' : 'stand';
      const bSumStr     = (bC1.value + bC2.value > 9)
        ? `${bC1.value}+${bC2.value}→<b>${bTotal}</b>`
        : `${bC1.value}+${bC2.value}=<b>${bTotal}</b>`;

      return {
        context: `Player stood on ${pStandTotal} — Banker Draw or Stand?`,
        html:    handHTML([bC1, bC2], 'Banker'),
        correct,
        explanation: `Banker total: ${bSumStr}. When Player stands, Banker follows same rule — `
          + (correct === 'draw' ? 'draw on 0–5.' : 'stand on 6–7.')
      };
    }

    // Player drew a third card
    const p3      = rnd(0, 9);
    const p3Card  = randomCardWithValue(p3);
    const correct = bankerDrawsAfterPlayerDrew(bTotal, p3) ? 'draw' : 'stand';
    const bSumStr = (bC1.value + bC2.value > 9)
      ? `${bC1.value}+${bC2.value}→<b>${bTotal}</b>`
      : `${bC1.value}+${bC2.value}=<b>${bTotal}</b>`;

    const layout = `<div class="drill-layout">`
      + handHTML([bC1, bC2], 'Banker')
      + handHTML([p3Card],   "Player's 3rd")
      + `</div>`;

    return {
      context:     'Player drew — Banker Draw or Stand?',
      html:        layout,
      correct,
      explanation: `Banker: ${bSumStr}. Player's 3rd: <b>${p3}</b>. `
                 + getBankerRuleText(bTotal, p3)
    };
  }

  function getBankerRuleText(bt, p3) {
    if (bt <= 2) return `Banker 0–2 always draws.`;
    if (bt === 3) return p3 === 8
      ? `Banker 3 stands when Player's 3rd is 8.`
      : `Banker 3 draws (exception: Player 3rd=8 only). Player drew ${p3} — draw.`;
    if (bt === 4) {
      const d = p3 >= 2 && p3 <= 7;
      return d
        ? `Banker 4 draws on Player's 3rd 2–7. Player drew ${p3} — draw.`
        : `Banker 4 draws only on Player's 3rd 2–7. Player drew ${p3} — stand.`;
    }
    if (bt === 5) {
      const d = p3 >= 4 && p3 <= 7;
      return d
        ? `Banker 5 draws on Player's 3rd 4–7. Player drew ${p3} — draw.`
        : `Banker 5 draws only on Player's 3rd 4–7. Player drew ${p3} — stand.`;
    }
    if (bt === 6) {
      const d = p3 === 6 || p3 === 7;
      return d
        ? `Banker 6 draws on Player's 3rd 6–7. Player drew ${p3} — draw.`
        : `Banker 6 draws only on Player's 3rd 6–7. Player drew ${p3} — stand.`;
    }
    return `Banker 7 always stands.`;
  }

  function genScenario(cat) {
    if (cat === 'player') return genPlayerScenario();
    if (cat === 'banker') return genBankerScenario();
    return Math.random() < 0.4 ? genPlayerScenario() : genBankerScenario();
  }

  /* ==================================================================
   * Persistent stats (localStorage) for the dashboard card
   * ================================================================== */

  const STORE_KEY = 'bac_stats_drill';

  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { correct: 0, incorrect: 0, hands: 0 }; }
    catch (e) { return { correct: 0, incorrect: 0, hands: 0 }; }
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

  const contextEl = document.getElementById('scenario-context');
  const qEl       = document.getElementById('scenario-q');
  const answerEl  = document.getElementById('scenario-answer');
  const controls  = document.getElementById('drill-controls');
  const btnDraw   = document.getElementById('btn-draw');
  const btnStand  = document.getElementById('btn-stand');

  const elCorrect = document.getElementById('s-correct');
  const elWrong   = document.getElementById('s-wrong');
  const elStreak  = document.getElementById('s-streak');
  const elRate    = document.getElementById('s-rate');

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
    answerEl.innerHTML    = '';

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
      (current.correct === 'draw' ? btnDraw : btnStand).classList.add('correct');
    }

    updateStats();

    // Persist for dashboard
    const store = loadStore();
    store.correct   = (store.correct   || 0) + (wasCorrect ? 1 : 0);
    store.incorrect = (store.incorrect || 0) + (wasCorrect ? 0 : 1);
    store.hands     = (store.correct || 0) + (store.incorrect || 0);
    saveStore(store);

    const icon = wasCorrect
      ? `<i class="fas fa-circle-check" style="color:var(--correct)"></i> `
      : `<i class="fas fa-circle-xmark" style="color:var(--incorrect)"></i> `;
    answerEl.innerHTML = icon + current.explanation;
    answerEl.hidden    = false;

    setTimeout(showScenario, 2400);
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
