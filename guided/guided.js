/* =====================================================================
 * guided.js — Guided Trainer (Level 1), reworked as coached table play.
 *
 * The trainee is walked through the dealer's decision sequence with the
 * coaching integrated INTO the felt: a dealer-coach prompt, a 4-step
 * progress track, an active-zone glow on the hand under decision, and
 * Draw/Stand controls that appear beside the relevant hand (not a single
 * generic button row).
 *
 * NO ANSWER LEAKAGE:
 *   - Totals are blank during play; revealed only inside post-decision
 *     feedback and on the felt after the hand resolves.
 *   - Only the current step's controls are active; the rest are inert.
 *   - The third-card slots stay hidden until a card is actually dealt.
 *   - The coach states WHAT to decide, never WHICH answer is correct.
 *   - The optional Hint names the relevant rule, never the answer.
 * =================================================================== */

(function () {
  const { Shoe, renderCard, clearSlot } = window.BacCards;
  const R = window.BacRules;
  const UI = window.BacUI;

  const STEP = { NATURAL: 'natural', PDRAW: 'pdraw', BDRAW: 'bdraw', FINAL: 'final' };
  const ORDER = [STEP.NATURAL, STEP.PDRAW, STEP.BDRAW, STEP.FINAL];
  const DEAL_MS = 220;

  class GuidedTrainer {
    constructor() {
      this.shoe = new Shoe();
      this.stats = new window.BacStats('guided');
      this.busy = false;
      this.cache();
      this.bind();
      this.renderStats();
      this.deal();
    }

    cache() {
      this.felt = document.getElementById('felt');
      this.coach = document.getElementById('coach');
      this.prompt = document.getElementById('prompt');
      this.zones = {
        player: document.getElementById('zone-player'),
        banker: document.getElementById('zone-banker'),
      };
      this.progress = Array.from(document.querySelectorAll('#progress li'));
      this.btn = {
        banker: document.getElementById('btn-banker'),
        player: document.getElementById('btn-player'),
        tie: document.getElementById('btn-tie'),
        none: document.getElementById('btn-none'),
        pdraw: document.getElementById('btn-pdraw'),
        pstand: document.getElementById('btn-pstand'),
        bdraw: document.getElementById('btn-bdraw'),
        bstand: document.getElementById('btn-bstand'),
      };
      this.totalEls = {
        player: document.getElementById('player-total'),
        banker: document.getElementById('banker-total'),
      };
      this.slots = {
        p1: document.getElementById('player-card-1'),
        p2: document.getElementById('player-card-2'),
        p3: document.getElementById('player-card-3'),
        b1: document.getElementById('banker-card-1'),
        b2: document.getElementById('banker-card-2'),
        b3: document.getElementById('banker-card-3'),
      };
    }

    bind() {
      this.btn.banker.onclick = () => this.onOutcome('banker');
      this.btn.player.onclick = () => this.onOutcome('player');
      this.btn.tie.onclick = () => this.onOutcome('tie');
      this.btn.none.onclick = () => this.onNoNatural();
      this.btn.pdraw.onclick = () => this.onPlayerDraw(true);
      this.btn.pstand.onclick = () => this.onPlayerDraw(false);
      this.btn.bdraw.onclick = () => this.onBankerDraw(true);
      this.btn.bstand.onclick = () => this.onBankerDraw(false);

      document.getElementById('reset-btn').onclick = () => {
        this.stats.reset();
        this.renderStats();
        UI.feedback('hint', 'Stats reset', 'Fresh start — good luck.');
      };
      document.getElementById('hint-btn').onclick = () => this.showHint();


      UI.bindSheet({
        trigger: 'rules-btn', sheet: 'rules-sheet', backdrop: 'rules-backdrop',
        close: 'rules-close',
        onOpen: () => { this.stats.recordPeek(); this.renderStats(); },
      });
    }

    /* ---- Deal a fresh hand (card-by-card) --------------------------- */
    deal() {
      this.hand = {
        player: [this.shoe.draw(), this.shoe.draw()],
        banker: [this.shoe.draw(), this.shoe.draw()],
        playerThird: null,
        bankerThird: null,
      };
      this.busy = true;
      this.hideTotals();
      this.setZone(null);

      // Reset slots.
      Object.values(this.slots).forEach((el) => clearSlot(el));
      this.slots.p3.classList.add('is-hidden');
      this.slots.b3.classList.add('is-hidden');
      this.coach.classList.add('flash');
      this.prompt.textContent = 'Dealing the hand…';
      this.markProgress(STEP.NATURAL);

      const seq = [
        ['p1', this.hand.player[0]],
        ['b1', this.hand.banker[0]],
        ['p2', this.hand.player[1]],
        ['b2', this.hand.banker[1]],
      ];
      seq.forEach(([slot, card], i) => {
        setTimeout(() => {
          renderCard(this.slots[slot], card, this.shoe.styleIndex);
          if (i === seq.length - 1) {
            this.busy = false;
            this.setStep(STEP.NATURAL);
          }
        }, DEAL_MS * (i + 1));
      });
    }

    repaint() {
      const s = this.shoe.styleIndex;
      renderCard(this.slots.p1, this.hand.player[0], s);
      renderCard(this.slots.p2, this.hand.player[1], s);
      renderCard(this.slots.b1, this.hand.banker[0], s);
      renderCard(this.slots.b2, this.hand.banker[1], s);
      if (this.hand.playerThird) renderCard(this.slots.p3, this.hand.playerThird, s);
      if (this.hand.bankerThird) renderCard(this.slots.b3, this.hand.bankerThird, s);
    }

    showThird(side) {
      const el = side === 'player' ? this.slots.p3 : this.slots.b3;
      const card = side === 'player' ? this.hand.playerThird : this.hand.bankerThird;
      el.classList.remove('is-hidden');
      renderCard(el, card, this.shoe.styleIndex);
    }

    /* ---- Totals shown only after resolution ------------------------- */
    hideTotals() {
      this.totalEls.player.textContent = '';
      this.totalEls.banker.textContent = '';
    }
    revealTotals() {
      this.totalEls.player.textContent = R.handTotal(this.all('player'));
      this.totalEls.banker.textContent = R.handTotal(this.all('banker'));
    }
    all(side) {
      const a = [...this.hand[side]];
      const t = this.hand[side + 'Third'];
      if (t) a.push(t);
      return a;
    }
    two(side) { return R.handTotal(this.hand[side]); }

    /* ---- Step orchestration ----------------------------------------- */
    setStep(step) {
      this.step = step;
      const show = {
        [STEP.NATURAL]: ['banker', 'player', 'tie', 'none'],
        [STEP.PDRAW]: ['pdraw', 'pstand'],
        [STEP.BDRAW]: ['bdraw', 'bstand'],
        [STEP.FINAL]: ['banker', 'player', 'tie'],
      }[step];
      Object.keys(this.btn).forEach((k) => UI.setActive(this.btn[k], show.includes(k)));

      const glow = {
        [STEP.NATURAL]: 'both',
        [STEP.PDRAW]: 'player',
        [STEP.BDRAW]: 'banker',
        [STEP.FINAL]: 'both',
      }[step];
      this.setZone(glow);

      const prompts = {
        [STEP.NATURAL]: 'Read both hands. Is either a natural 8 or 9 — and if so, who wins?',
        [STEP.PDRAW]: 'No natural. Does the PLAYER draw a third card?',
        [STEP.BDRAW]: 'Now the BANKER. Does the Banker draw a third card?',
        [STEP.FINAL]: 'Hand complete. Call the final result.',
      };
      this.say(prompts[step]);
      this.markProgress(step);
    }

    say(text) {
      this.prompt.textContent = text;
      this.coach.classList.remove('flash');
      void this.coach.offsetWidth;
      this.coach.classList.add('flash');
    }

    setZone(which) {
      this.zones.player.classList.toggle('is-active', which === 'player' || which === 'both');
      this.zones.banker.classList.toggle('is-active', which === 'banker' || which === 'both');
    }

    markProgress(step) {
      const idx = ORDER.indexOf(step);
      this.progress.forEach((li, i) => {
        li.classList.toggle('done', i < idx);
        li.classList.toggle('current', i === idx);
      });
    }

    /* ---- Step 1: Naturals ------------------------------------------- */
    onNoNatural() {
      if (this.busy || this.step !== STEP.NATURAL) return;
      const pt = this.two('player'), bt = this.two('banker');
      if (!R.anyNatural(pt, bt)) {
        this.right(`Correct — neither hand is a natural (Player ${pt}, Banker ${bt}).`,
          () => this.setStep(STEP.PDRAW));
      } else {
        this.wrong('Look again — one hand IS a natural (8 or 9). A natural ends the hand; call the winner.');
      }
    }

    onOutcome(choice) {
      if (this.busy) return;
      if (this.step === STEP.NATURAL) {
        const pt = this.two('player'), bt = this.two('banker');
        if (!R.anyNatural(pt, bt)) {
          this.wrong('Neither hand totals 8 or 9 on two cards — there is no natural. Use "No Natural".');
          return;
        }
        const w = R.naturalOutcome(pt, bt);
        if (choice === w) {
          this.revealTotals();
          this.stats.recordHand(); this.renderStats();
          this.right(`Natural — ${this.fmt(w)} (Player ${pt}, Banker ${bt}).`, () => this.deal(), true);
        } else {
          this.wrong('There is a natural, but that is the wrong winner. Compare the two totals again.');
        }
      } else if (this.step === STEP.FINAL) {
        const w = R.outcome(this.all('player'), this.all('banker'));
        if (choice === w) {
          this.revealTotals();
          const pt = R.handTotal(this.all('player')), bt = R.handTotal(this.all('banker'));
          this.stats.recordHand(); this.renderStats();
          this.right(`${this.fmt(w)} — Player ${pt}, Banker ${bt}.`, () => this.deal(), true);
        } else {
          this.wrong('Recount both sides and call the result again.');
        }
      }
    }

    /* ---- Step 2: Player draw ---------------------------------------- */
    onPlayerDraw(draw) {
      if (this.busy || this.step !== STEP.PDRAW) return;
      const pt = this.two('player');
      if (draw === R.shouldPlayerDraw(pt)) {
        if (draw) {
          this.hand.playerThird = this.shoe.draw();
          this.showThird('player');
        }
        this.right(draw ? 'Correct — Player draws on 0–5. Third card dealt.'
                        : 'Correct — Player stands on 6–7.',
          () => this.setStep(STEP.BDRAW));
      } else {
        this.wrong('Player rule: draw on 0–5, stand on 6–7. Look at the Player\'s two-card total.');
      }
    }

    /* ---- Step 3: Banker draw ---------------------------------------- */
    onBankerDraw(draw) {
      if (this.busy || this.step !== STEP.BDRAW) return;
      const bt = this.two('banker');
      const p3 = this.hand.playerThird ? this.hand.playerThird.value : null;
      if (draw === R.shouldBankerDraw(bt, p3)) {
        if (draw) {
          this.hand.bankerThird = this.shoe.draw();
          this.showThird('banker');
        }
        this.right(`Correct. ${R.explainBanker(bt, p3, draw)}`, () => this.setStep(STEP.FINAL));
      } else {
        this.wrong('Check the Banker tableau against the Player\'s third card (open the rules if unsure).');
      }
    }

    /* ---- Hint (never the answer) ------------------------------------ */
    showHint() {
      this.stats.recordPeek(); this.renderStats();
      const hints = {
        [STEP.NATURAL]: 'A natural is a two-card total of 8 or 9. If neither hand has one, pick "No Natural".',
        [STEP.PDRAW]: 'The Player rule uses only the Player\'s two-card total: 0–5 vs 6–7.',
        [STEP.BDRAW]: 'The Banker rule depends on the Banker total AND the Player\'s third card.',
        [STEP.FINAL]: 'Closest to 9 wins. Total each side and drop the tens digit.',
      };
      UI.feedback('hint', 'Hint', hints[this.step] || '');
    }

    fmt(w) { return w === 'tie' ? 'Tie' : w.toUpperCase() + ' wins'; }

    /* ---- Feedback / gating ------------------------------------------ */
    right(detail, next, handEnd = false) {
      this.busy = true;
      this.stats.recordCorrect(); this.renderStats();
      Object.values(this.btn).forEach((b) => (b.disabled = true));
      UI.feedback('correct', 'Correct', detail);
      setTimeout(() => { this.busy = false; if (next) next(); }, handEnd ? 1700 : 1050);
    }

    wrong(detail) {
      this.stats.recordIncorrect(); this.renderStats();
      UI.feedback('incorrect', 'Not quite', detail);
    }

    renderStats() {
      const d = this.stats.data;
      document.getElementById('s-correct').textContent = d.correct;
      document.getElementById('s-incorrect').textContent = d.incorrect;
      document.getElementById('s-hands').textContent = d.hands;
      document.getElementById('s-streak').textContent = d.streak;
      document.getElementById('s-peeks').textContent = d.peeks;
    }
  }

  document.addEventListener('DOMContentLoaded', () => new GuidedTrainer());
})();

