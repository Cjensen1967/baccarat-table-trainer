/* =====================================================================
 * dealing.js — Real Dealing Trainer (Level 2), rebuilt as a table.
 *
 * The trainee works the hand from the dealer's seat:
 *   1. The opening four cards deal card-by-card from the shoe.
 *   2. The only explicit action is DEALING a third card (tap the spot).
 *      There is NO stand control: a side "stands" simply by not being
 *      dealt a card before the trainee moves on — exactly like a real
 *      table. Standing is committed (and validated) at the next forward
 *      action: dealing the Banker, or paying the hand.
 *   3. The Player is resolved before the Banker.
 *   4. The hand is paid by tapping a bet zone (PLAYER / BANKER / TIE).
 *
 * NO ANSWER LEAKAGE:
 *   - Totals are blank until the hand is paid.
 *   - The third-card spots look identical every hand, whether or not a
 *     draw is actually correct.
 *   - Mistakes are only explained AFTER the mistaken action (including a
 *     wrongful stand, caught when the trainee advances).
 *   - The shoe/affordances never indicate the correct move in advance.
 * =================================================================== */


(function () {
  const { Shoe, Card, renderCard } = window.BacCards;
  const R = window.BacRules;
  const UI = window.BacUI;

  const DEAL_MS = 240; // per opening card

  class DealingTrainer {
    constructor() {
      this.shoe = new Shoe();
      this.stats = new window.BacStats('dealing');
      this.cache();
      this.bind();
      this.renderStats();
      this.newHand();
    }

    cache() {
      this.felt = document.getElementById('felt');
      this.shoeEl = document.getElementById('shoe');
      this.spots = {
        p1: document.getElementById('player-card-1'),
        p2: document.getElementById('player-card-2'),
        p3: document.getElementById('player-card-3'),
        b1: document.getElementById('banker-card-1'),
        b2: document.getElementById('banker-card-2'),
        b3: document.getElementById('banker-card-3'),
      };
      this.bets = {

        player: document.getElementById('bet-player'),
        banker: document.getElementById('bet-banker'),
        tie: document.getElementById('bet-tie'),
      };
      this.totalEls = {
        player: document.getElementById('player-total'),
        banker: document.getElementById('banker-total'),
      };
    }

    bind() {
      this.spots.p3.onclick = () => this.tryDraw('player');
      this.spots.b3.onclick = () => this.tryDraw('banker');
      this.bets.player.onclick = () => this.tryPay('player');

      this.bets.banker.onclick = () => this.tryPay('banker');
      this.bets.tie.onclick = () => this.tryPay('tie');

      document.getElementById('reset-btn').onclick = () => {
        this.stats.reset();
        this.renderStats();
        UI.feedback('hint', 'Stats reset', 'Fresh shoe.');
      };
    }


    /* ---- New hand + opening deal ------------------------------------ */
    newHand() {
      this.hand = {
        player: [this.shoe.draw(), this.shoe.draw()],
        banker: [this.shoe.draw(), this.shoe.draw()],
        playerThird: null,
        bankerThird: null,
        playerResolved: false,
        bankerResolved: false,
      };
      this.settled = false;

      // Reset table visuals.
      this.felt.classList.remove('live');
      this.felt.classList.add('locked');
      Object.values(this.spots).forEach((el) => { el.innerHTML = ''; el.classList.remove('filled', 'spot--settled'); });
      this.spots.p3.classList.add('spot--third');
      this.spots.b3.classList.add('spot--third');
      Object.values(this.bets).forEach((b) => b.classList.remove('win'));

      this.totalEls.player.textContent = '';
      this.totalEls.banker.textContent = '';

      // Deal the opening four card-by-card (Player, Banker, Player, Banker).
      const order = [
        ['p1', this.hand.player[0]],
        ['b1', this.hand.banker[0]],
        ['p2', this.hand.player[1]],
        ['b2', this.hand.banker[1]],
      ];
      this.shoeEl.classList.add('dealing');
      order.forEach(([slot, card], i) => {
        setTimeout(() => {
          renderCard(this.spots[slot], card, this.shoe.styleIndex);
          if (i === order.length - 1) this.openingDone();
        }, DEAL_MS * (i + 1));
      });
    }

    openingDone() {
      this.shoeEl.classList.remove('dealing');
      this.felt.classList.remove('locked');
      this.felt.classList.add('live');
    }

    repaintAll() {
      const s = this.shoe.styleIndex;
      renderCard(this.spots.p1, this.hand.player[0], s);
      renderCard(this.spots.p2, this.hand.player[1], s);
      renderCard(this.spots.b1, this.hand.banker[0], s);
      renderCard(this.spots.b2, this.hand.banker[1], s);
      if (this.hand.playerThird) renderCard(this.spots.p3, this.hand.playerThird, s);
      if (this.hand.bankerThird) renderCard(this.spots.b3, this.hand.bankerThird, s);
    }

    /* ---- Derived state ---------------------------------------------- */
    get pt() { return R.handTotal(this.hand.player); }
    get bt() { return R.handTotal(this.hand.banker); }
    get p3val() { return this.hand.playerThird ? this.hand.playerThird.value : null; }
    get isNatural() { return R.anyNatural(this.pt, this.bt); }

    all(side) {
      const a = [...this.hand[side]];
      const t = this.hand[side + 'Third'];
      if (t) a.push(t);
      return a;
    }

    /* ---- Draw a third card ------------------------------------------ */
    tryDraw(side) {
      if (this.settled || this.felt.classList.contains('locked')) return;

      if (this.isNatural) {
        return this.mistake('Natural 8 or 9 — the hand takes no cards. Pay the winner.');
      }

      if (side === 'player') {
        if (this.hand.playerResolved) return this.mistake('The Player has already been resolved.');
        if (!R.shouldPlayerDraw(this.pt)) {
          return this.mistake('Player stands on 6–7 — no card. Move on (deal the Banker, or pay).');
        }
        this.hand.playerThird = this.shoe.draw();
        this.dealThird('player');
        this.hand.playerResolved = true;
        return;
      }

      // Banker. Acting on the Banker advances past the Player: if the Player
      // still owed a draw, that mistake is caught here; otherwise the Player
      // implicitly stands and we evaluate the Banker's draw.
      if (!this.ensurePlayerResolved()) return;
      if (this.hand.bankerResolved) return this.mistake('The Banker has already been resolved.');
      if (!R.shouldBankerDraw(this.bt, this.p3val)) {
        return this.mistake('The Banker should stand here — no card. Pay the hand.');
      }
      this.hand.bankerThird = this.shoe.draw();
      this.dealThird('banker');
      this.hand.bankerResolved = true;
    }


    dealThird(side) {
      const slot = side === 'player' ? this.spots.p3 : this.spots.b3;
      const card = side === 'player' ? this.hand.playerThird : this.hand.bankerThird;
      this.shoeEl.classList.add('dealing');
      renderCard(slot, card, this.shoe.styleIndex);
      setTimeout(() => this.shoeEl.classList.remove('dealing'), 300);
    }

    /* ---- Implicit stand --------------------------------------------- *
     * There is no STAND control. A side "stands" simply by not being dealt
     * a card before the trainee moves on. These helpers are called by the
     * forward actions (dealing the Banker, or paying) to commit any
     * outstanding stand — and to CATCH the mistake of standing on a side
     * that actually owed a draw. They return false (and surface the
     * mistake) when the side still had to draw, so the caller aborts.    */
    ensurePlayerResolved() {
      if (this.hand.playerResolved) return true;
      if (R.shouldPlayerDraw(this.pt)) {
        this.mistake('Player must draw on 0–5 — deal the Player\'s third card first.');
        return false;
      }
      this.hand.playerResolved = true;
      this.settleSpot('player');
      return true;
    }

    ensureBankerResolved() {
      if (this.hand.bankerResolved) return true;
      if (R.shouldBankerDraw(this.bt, this.p3val)) {
        this.mistake('Banker must draw — deal the Banker\'s third card first.');
        return false;
      }
      this.hand.bankerResolved = true;
      this.settleSpot('banker');
      return true;
    }

    /* A stood side's empty third-card spot fades and stops pulsing — a
     * quiet "this side is settled" cue (there is no puck). */
    settleSpot(side) {
      const spot = side === 'player' ? this.spots.p3 : this.spots.b3;
      spot.classList.remove('spot--third');
      spot.classList.add('spot--settled');
    }


    /* ---- Pay the hand ----------------------------------------------- */
    tryPay(choice) {
      if (this.settled || this.felt.classList.contains('locked')) return;

      if (this.isNatural) {
        const w = R.naturalOutcome(this.pt, this.bt);
        return choice === w
          ? this.complete(w, `Natural — ${this.fmt(w)}.`)
          : this.mistake('There is a natural, but that is the wrong call. Re-read the two totals.');
      }

      // Paying advances past both sides. Any side not dealt a card now
      // implicitly stands (validated) — and if a side still owed a draw,
      // that mistake is caught here before any winner is called.
      if (!this.ensurePlayerResolved()) return;
      if (!this.ensureBankerResolved()) return;

      const w = R.outcome(this.all('player'), this.all('banker'));

      return choice === w
        ? this.complete(w, this.fmt(w))
        : this.mistake('Hand is complete, but that is the wrong winner. Recount both sides.');
    }

    fmt(w) { return w === 'tie' ? 'Tie' : w.toUpperCase() + ' wins'; }

    /* ---- Outcomes --------------------------------------------------- */
    complete(winner, detail) {
      this.settled = true;
      this.felt.classList.add('locked');
      this.felt.classList.remove('live');

      // Reveal totals ONLY now, after the call is committed.
      this.totalEls.player.textContent = R.handTotal(this.all('player'));
      this.totalEls.banker.textContent = R.handTotal(this.all('banker'));
      if (this.bets[winner]) this.bets[winner].classList.add('win');

      this.stats.recordCorrect();
      this.stats.recordHand();
      this.renderStats();

      const pt = R.handTotal(this.all('player'));
      const bt = R.handTotal(this.all('banker'));
      UI.feedback('correct', 'Hand paid', `${detail} — Player ${pt}, Banker ${bt}.`, 1900);
      setTimeout(() => this.newHand(), 1950);
    }

    mistake(detail) {
      this.stats.recordIncorrect();
      this.renderStats();
      UI.feedback('incorrect', 'Hold on', detail);
    }

    renderStats() {
      const d = this.stats.data;
      document.getElementById('s-correct').textContent = d.correct;
      document.getElementById('s-incorrect').textContent = d.incorrect;
      document.getElementById('s-hands').textContent = d.hands;
      document.getElementById('s-rate').textContent = this.stats.successRate + '%';
    }
  }

  document.addEventListener('DOMContentLoaded', () => new DealingTrainer());
})();

