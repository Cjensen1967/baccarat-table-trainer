/* =====================================================================
 * cards.js — Card model, deck/shoe, and rendering helpers.
 * Baccarat Table Trainer — standalone build.
 *
 * Card art lives in /assets/ at the project root.
 * Images follow the [suit][rank].png naming convention, e.g. hearts7.png.
 *
 * NOTE: This is a workflow/rules trainer, not a casino simulator.
 * We intentionally use a simple varied random flow of cards rather than
 * modelling true shoe composition, depletion, burn cards, etc.
 * =================================================================== */

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];

/* Asset path is one level up from any module folder (guided/, dealing/).
 * dealing/index.html → ../assets/heartsA.png  ✓
 * guided/index.html  → ../assets/heartsA.png  ✓  */
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
    return `${ASSET_BASE}/${this.suit}${this.rank}.png`;
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
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
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
