/* =====================================================================
 * rules.js — Baccarat third-card rules engine (single source of truth)
 *
 * These rules are deliberately kept verbatim to the standard punto banco
 * tableau. Do not change without a documented reason.
 *
 *   PLAYER:
 *     0-5 : Draw
 *     6-7 : Stand
 *     8-9 : Natural (initial two cards only)
 *
 *   BANKER (when Player stands, Banker follows Player's draw rule):
 *     0-2 : Always draw
 *     3   : Draw unless Player's third card is 8
 *     4   : Draw if Player's third card is 2-7
 *     5   : Draw if Player's third card is 4-7
 *     6   : Draw if Player's third card is 6-7
 *     7   : Stand
 *     8-9 : Natural (initial two cards only)
 * =================================================================== */

const BacRules = {
  /* Sum of an array of Card objects, mod 10. */
  handTotal(cards) {
    return cards.reduce((sum, c) => sum + (c ? c.value : 0), 0) % 10;
  },

  /* Natural = a two-card total of 8 or 9. */
  isNatural(total) {
    return total === 8 || total === 9;
  },

  /* Whether either two-card hand is a natural. */
  anyNatural(playerTotal, bankerTotal) {
    return this.isNatural(playerTotal) || this.isNatural(bankerTotal);
  },

  /* Player draws on 0-5, stands on 6-7. (Naturals handled earlier.) */
  shouldPlayerDraw(playerTotal) {
    return playerTotal <= 5;
  },

  /**
   * Whether the Banker should draw a third card.
   * @param {number} bankerTotal  Banker's two-card total.
   * @param {number|null} playerThirdValue  Baccarat value of Player's third
   *        card, or null/undefined if the Player stood (drew no third card).
   */
  shouldBankerDraw(bankerTotal, playerThirdValue) {
    if (bankerTotal >= 8) return false; // natural, no draw
    if (bankerTotal === 7) return false;

    // Player stood -> Banker follows the Player drawing rule.
    if (playerThirdValue === null || playerThirdValue === undefined) {
      return bankerTotal <= 5;
    }

    const p = playerThirdValue; // 0-9 (10/face already mapped to 0)
    switch (bankerTotal) {
      case 0:
      case 1:
      case 2:
        return true;
      case 3:
        return p !== 8;
      case 4:
        return p >= 2 && p <= 7;
      case 5:
        return p >= 4 && p <= 7;
      case 6:
        return p === 6 || p === 7;
      default:
        return false;
    }
  },

  /* Final outcome given two completed hands. Returns 'player'|'banker'|'tie'. */
  outcome(playerCards, bankerCards) {
    const p = this.handTotal(playerCards);
    const b = this.handTotal(bankerCards);
    if (p === b) return 'tie';
    return p > b ? 'player' : 'banker';
  },

  /* Outcome when there is a natural on the opening four cards. */
  naturalOutcome(playerTotal, bankerTotal) {
    if (playerTotal === bankerTotal) return 'tie';
    return playerTotal > bankerTotal ? 'player' : 'banker';
  },

  /* A short, *post-decision* explanation string for a Banker draw choice.
   * Never call this before the trainee has committed — it reveals the rule. */
  explainBanker(bankerTotal, playerThirdValue, didDraw) {
    if (bankerTotal >= 7) {
      return `Banker total ${bankerTotal}: stands (7 stands, 8-9 natural).`;
    }
    if (playerThirdValue === null || playerThirdValue === undefined) {
      return `Player stood, so Banker follows the player rule — draws on 0-5, stands on 6-7. Banker had ${bankerTotal}.`;
    }
    const ranges = {
      0: 'always draws', 1: 'always draws', 2: 'always draws',
      3: 'draws unless Player\'s third is 8',
      4: 'draws on Player\'s third 2-7',
      5: 'draws on Player\'s third 4-7',
      6: 'draws on Player\'s third 6-7',
    };
    return `Banker ${bankerTotal} ${ranges[bankerTotal] || ''}; Player's third card was ${playerThirdValue}.`;
  },
};

window.BacRules = BacRules;
