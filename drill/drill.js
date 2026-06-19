/* =====================================================================
 * drill.js — Drill Mode: rapid-fire single-decision rules practice.
 *
 * The table uses the same dealer's-perspective layout as the Real Dealing
 * Trainer: Banker (left), Player (right), 3 card slots each.
 *
 * All 6 card slots are always visible:
 *   • Face-up   = the revealed card (game-relevant information)
 *   • Face-down = a CSS card back (a card exists but isn't shown)
 *   • Empty     = intentionally no card (e.g. side stood, no 3rd card)
 *
 * The cards that answer the question are face-up; everything else is
 * face-down. This teaches the trainee to read the table spatially.
 *
 * Player drill:  P1 + P2 face-up; all others face-down.
 * Banker stood:  B1 + B2 face-up; P3 empty; others face-down.
 * Banker drew:   B1 + B2 + P3 face-up; others face-down.
 *
 * ANSWER LEAKAGE PREVENTION:
 *   Nothing is revealed before the trainee commits. Card backs are
 *   identical. Both buttons look the same. Explanation shown post-commit.
 * =================================================================== */

(function () {
  'use strict';

  /* ==================================================================
   * Card generation
   * ================================================================== */

  const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];

  const RANKS_BY_VALUE = [
    ['T', 'J', 'Q', 'K'], // 0
    ['A'],                  // 1
    ['2'],  ['3'],  ['4'],
    ['5'],  ['6'],  ['7'],
    ['8'],  ['9']
  ];

  const RANK_NAMES = { A: 'Ace', T: '10', J: 'Jack', Q: 'Queen', K: 'King' };

  function randomCardWithValue(v) {
    const ranks = RANKS_BY_VALUE[v];
    const rank  = ranks[Math.floor(Math.random() * ranks.length)];
    const suit  = SUITS[Math.floor(Math.random() * SUITS.length)];
    return {
      value: v,
      imagePath: `../assets/${suit}${rank}.svg`,

      label: (RANK_NAMES[rank] || rank) + ' of ' + suit
    };
  }

  function pairWithTotal(total) {
    const v1 = Math.floor(Math.random() * 10);
    const v2 = (total - v1 + 10) % 10;
    return [randomCardWithValue(v1), randomCardWithValue(v2)];
  }

  function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
   * ================================================================== */

  function genPlayerScenario() {
    const total    = rnd(0, 7);
    const [c1, c2] = pairWithTotal(total);
    const correct  = playerDraws(total) ? 'draw' : 'stand';
    const sumStr   = (c1.value + c2.value > 9)
      ? `${c1.value}+${c2.value}=<b>${c1.value + c2.value}</b>→<b>${total}</b>`
      : `${c1.value}+${c2.value}=<b>${total}</b>`;

    return {
      type:    'player',
      pC1: c1, pC2: c2,
      context: 'Player — Draw or Stand?',
      correct,
      explanation: `${sumStr}. ` + (correct === 'draw'
        ? 'Player draws on 0–5 — draw.'
        : 'Player stands on 6–7 — stand.')
    };
  }

  function genBankerScenario() {
    const bTotal       = rnd(0, 7);
    const [bC1, bC2]   = pairWithTotal(bTotal);
    const playerStood  = Math.random() < 0.3;

    const bSumStr = (bC1.value + bC2.value > 9)
      ? `${bC1.value}+${bC2.value}→<b>${bTotal}</b>`
      : `${bC1.value}+${bC2.value}=<b>${bTotal}</b>`;

    if (playerStood) {
      const pStandTotal = Math.random() < 0.5 ? 6 : 7;
      const correct     = bankerDrawsWhenPlayerStood(bTotal) ? 'draw' : 'stand';
      return {
        type: 'banker', playerStood: true,
        bC1, bC2, bTotal, pStandTotal,
        context: `Player stood on ${pStandTotal} — Banker Draw or Stand?`,
        correct,
        explanation: `Banker: ${bSumStr}. When Player stands, Banker follows same rule — `
          + (correct === 'draw' ? 'draw on 0–5.' : 'stand on 6–7.')
      };
    }

    const p3      = rnd(0, 9);
    const p3Card  = randomCardWithValue(p3);
    const correct = bankerDrawsAfterPlayerDrew(bTotal, p3) ? 'draw' : 'stand';

    return {
      type: 'banker', playerStood: false,
      bC1, bC2, bTotal, p3Card, p3,
      context: `Player drew — Banker Draw or Stand?`,
      correct,
      explanation: `Banker: ${bSumStr}. Player's 3rd: <b>${p3}</b>. `
                 + getBankerRuleText(bTotal, p3)
    };
  }

  function getBankerRuleText(bt, p3) {
    if (bt <= 2) return `Banker 0–2 always draws.`;
    if (bt === 3) return p3 === 8
      ? `Banker 3 stands when Player's 3rd is 8.`
      : `Banker 3 draws (except Player 3rd=8). Player drew ${p3} — draw.`;
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
   * Persistent stats for dashboard
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
   * DOM refs — card slots
   * ================================================================== */

  const dB3 = document.getElementById('d-b3');
  const dB1 = document.getElementById('d-b1');
  const dB2 = document.getElementById('d-b2');
  const dP1 = document.getElementById('d-p1');
  const dP2 = document.getElementById('d-p2');
  const dP3 = document.getElementById('d-p3');

  const allSlots = [dB3, dB1, dB2, dP1, dP2, dP3];

  /* ==================================================================
   * DOM refs — UI
   * ================================================================== */

  const contextEl = document.getElementById('scenario-context');
  const answerEl  = document.getElementById('scenario-answer');
  const controls  = document.getElementById('drill-controls');
  const btnDraw   = document.getElementById('btn-draw');
  const btnStand  = document.getElementById('btn-stand');

  const elCorrect = document.getElementById('s-correct');
  const elWrong   = document.getElementById('s-wrong');
  const elStreak  = document.getElementById('s-streak');
  const elRate    = document.getElementById('s-rate');

  /* ==================================================================
   * Slot rendering
   * ================================================================== */

  /**
   * Set a slot to one of three states:
   *   'face-up'   — show card image
   *   'face-down' — show CSS card back
   *   'empty'     — barely-visible placeholder (no card here)
   */
  function setSlot(el, state, card) {
    el.innerHTML = '';
    el.className = 'drill-slot';
    if (state === 'face-up' && card) {
      el.classList.add('drill-slot--face-up');
      const img = document.createElement('img');
      img.src       = card.imagePath;
      img.alt       = card.label;
      img.className = 'drill-slot-img';
      el.appendChild(img);
    } else if (state === 'face-down') {
      el.classList.add('drill-slot--back');
    } else {
      el.classList.add('drill-slot--empty');
    }
  }

  /**
   * Render the current scenario into the 6 card slots.
   * All backs appear instantly; face-up cards are revealed with a small
   * stagger to simulate cards being turned over.
   */
  function renderSlots() {
    // Instantly set backs for all positions
    allSlots.forEach(s => setSlot(s, 'face-down'));

    setTimeout(function () {
      const sc = current;
      if (sc.type === 'player') {
        // Player's two cards visible; Banker all backs; P3 back (pending)
        setSlot(dP1, 'face-up', sc.pC1);
        setTimeout(function () { setSlot(dP2, 'face-up', sc.pC2); }, 110);

      } else if (sc.playerStood) {
        // Banker's two cards visible; P3 empty (player stood); others back
        setSlot(dP3, 'empty');
        setSlot(dB1, 'face-up', sc.bC1);
        setTimeout(function () { setSlot(dB2, 'face-up', sc.bC2); }, 110);

      } else {
        // Player drew: B1+B2 + P3 visible; others back
        setSlot(dB1, 'face-up', sc.bC1);
        setTimeout(function () { setSlot(dB2, 'face-up', sc.bC2); },    110);
        setTimeout(function () { setSlot(dP3, 'face-up', sc.p3Card); }, 220);
      }
    }, 80);
  }

  /* ==================================================================
   * UI helpers
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
    answerEl.hidden       = true;
    answerEl.innerHTML    = '';

    btnDraw.className  = 'drill-btn drill-btn--draw';
    btnStand.className = 'drill-btn drill-btn--stand';
    controls.classList.remove('answered');

    renderSlots();
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

    const store = loadStore();
    store.correct   = (store.correct   || 0) + (wasCorrect ? 1 : 0);
    store.incorrect = (store.incorrect || 0) + (wasCorrect ? 0 : 1);
    store.hands     = (store.correct   || 0) + (store.incorrect || 0);
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
