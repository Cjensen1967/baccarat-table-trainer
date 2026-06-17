/* =====================================================================
 * stats.js — Per-module performance tracking with localStorage backing.
 *
 * Each training module keeps its own namespaced stats so progress in the
 * Guided Trainer and Real Dealing Trainer are tracked independently while
 * still rolling up into a shared dashboard total.
 * =================================================================== */

class Stats {
  constructor(namespace) {
    this.key = `bac_stats_${namespace}`;
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return Object.assign(this.blank(), JSON.parse(raw));
    } catch (e) {
      /* corrupt data — fall through to blank */
    }
    return this.blank();
  }

  blank() {
    return { correct: 0, incorrect: 0, hands: 0, peeks: 0, streak: 0, bestStreak: 0 };
  }

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.data));
  }

  recordCorrect() {
    this.data.correct++;
    this.data.streak++;
    if (this.data.streak > this.data.bestStreak) this.data.bestStreak = this.data.streak;
    this.save();
  }

  recordIncorrect() {
    this.data.incorrect++;
    this.data.streak = 0;
    this.save();
  }

  recordHand() {
    this.data.hands++;
    this.save();
  }

  recordPeek() {
    this.data.peeks++;
    this.save();
  }

  reset() {
    this.data = this.blank();
    this.save();
  }

  get successRate() {
    const total = this.data.correct + this.data.incorrect;
    return total === 0 ? 0 : Math.round((this.data.correct / total) * 100);
  }
}

window.BacStats = Stats;
