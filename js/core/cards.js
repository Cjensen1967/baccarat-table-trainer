/* =====================================================================
 * cards.js — Card model, deck/shoe, and rendering helpers.
 * Baccarat Table Trainer — standalone build.
 *
 * Card art lives in /assets/ at the project root.
 * Images follow the [suit][rank].svg naming convention, e.g. hearts7.svg.

 *
 * NOTE: This is a workflow/rules trainer, not a casino simulator.
 * We intentionally use a simple varied random flow of cards rather than
 * modelling true shoe composition, depletion, burn cards, etc.
 * =================================================================== */

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];

/* Weighted rank pool for more challenging training distribution.
 *
 * Real-shoe problem: T/J/Q/K are each worth 0 — that's 4 of 13 ranks (30.8%)
 * producing lots of trivial low totals and fewer conditional Banker decisions.
 *
 * Training-optimised pool:
 *   - Zero-value court cards halved: only T and J (Q and K omitted from draws)
 *   - Mid-range values 3–7 doubled: these trigger every Banker conditional rule
 *   - Naturals (8, 9) and low cards (A, 2) kept at 1× — still present
 *
 * Pool size: 14 entries.
 *   Value 0: 2/14 ≈ 14%  (was 4/13 ≈ 31%) — much less filler
 *   Values 3-7: 2/14 ≈ 14% each             — most rule coverage
 *   Values 1,2,8,9: 1/14 ≈ 7% each          — still reachable
 */
const RANK_POOL = [
  'T', 'J',    // value 0 — two court cards (halved from four)
  'A',          // value 1
  '2',          // value 2
  '3', '3',    // value 3
  '4', '4',    // value 4
  '5', '5',    // value 5
  '6', '6',    // value 6
  '7', '7',    // value 7
  '8',          // value 8 — natural range
  '9',          // value 9 — natural range
];


/* Asset path is one level up from any module folder (guided/, dealing/).
 * dealing/index.html → ../assets/heartsA.svg  ✓
 * guided/index.html  → ../assets/heartsA.svg  ✓  */

const ASSET_BASE = '../assets';

/**
 * A single playing card. `rank` is one of RANKS, `suit` one of SUITS.
 * `value` is the baccarat point value (A=1, 2-9 face, 10/T/J/Q/K=0).
 */
class Card {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
    this.value = Card.baccaratValue(rank);
  }

  static baccaratValue(rank) {
    if (rank === 'A') return 1;
    if (['T', 'J', 'Q', 'K'].includes(rank)) return 0;
    return parseInt(rank, 10);
  }

  imagePath() {
    return `${ASSET_BASE}/${this.suit}${this.rank}.svg`;

  }

  label() {
    const names = { A: 'Ace', T: '10', J: 'Jack', Q: 'Queen', K: 'King' };
    const r = names[this.rank] || this.rank;
    return `${r} of ${this.suit}`;
  }
}

/**
 * Simple randomized card source. Pulls uniformly from a 52-card space
 * (suit + rank). No depletion tracking — intentional per project scope.
 */
class Shoe {
  constructor() {
    this.styleIndex = 0; // kept for API compatibility; asset style is fixed.
  }

  draw() {
    const rank = RANK_POOL[Math.floor(Math.random() * RANK_POOL.length)];
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    return new Card(rank, suit);
  }

}

/* Render a card image into a slot element.
 * styleIndex is accepted for API compatibility but ignored — one style. */
function renderCard(slotEl, card, styleIndex) {
  if (!slotEl) return;
  slotEl.innerHTML = '';
  if (!card) return;
  const img = document.createElement('img');
  img.src = card.imagePath();
  img.alt = card.label();
  img.className = 'card-img';
  slotEl.appendChild(img);
  slotEl.classList.add('filled');
}

function clearSlot(slotEl, placeholderHTML = '') {
  if (!slotEl) return;
  slotEl.innerHTML = placeholderHTML;
  slotEl.classList.remove('filled');
}

window.BacCards = { Card, Shoe, renderCard, clearSlot, SUITS, RANKS };
