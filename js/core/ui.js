/* =====================================================================
 * ui.js — Shared UI helpers for the trainer screens: the feedback
 * banner, the rules/help sheet, and small DOM conveniences.
 * =================================================================== */

const BacUI = {
  _fbTimer: null,

  /**
   * Show the bottom feedback banner. This is ONLY ever called AFTER a
   * trainee has committed a decision (or to surface an optional hint).
   * @param {'correct'|'incorrect'|'hint'} type
   * @param {string} title  Short label (e.g. "Correct", "Not quite").
   * @param {string} detail Explanation shown after the decision.
   * @param {number} [duration] Auto-hide ms (0 = sticky).
   */
  feedback(type, title, detail = '', duration = 2600) {
    const el = document.getElementById('feedback');
    if (!el) return;
    el.className = `feedback ${type}`;
    el.innerHTML =
      `<div class="feedback__title">${title}</div>` +
      (detail ? `<div class="feedback__detail">${detail}</div>` : '');
    // force reflow so re-trigger animates
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._fbTimer);
    if (duration > 0) {
      this._fbTimer = setTimeout(() => el.classList.remove('show'), duration);
    }
  },

  hideFeedback() {
    const el = document.getElementById('feedback');
    if (el) el.classList.remove('show');
    clearTimeout(this._fbTimer);
  },

  /* Wire a backdrop+sheet pair with a trigger and close button.
   * onOpen fires each time it opens (used to count "peeks"). */
  bindSheet({ trigger, sheet, backdrop, close, onOpen }) {
    const sheetEl = document.getElementById(sheet);
    const backdropEl = document.getElementById(backdrop);
    const open = () => {
      backdropEl.classList.add('open');
      sheetEl.classList.add('open');
      if (onOpen) onOpen();
    };
    const shut = () => {
      backdropEl.classList.remove('open');
      sheetEl.classList.remove('open');
    };
    const triggerEl = document.getElementById(trigger);
    if (triggerEl) triggerEl.addEventListener('click', open);
    const closeEl = document.getElementById(close);
    if (closeEl) closeEl.addEventListener('click', shut);
    backdropEl.addEventListener('click', shut);
    return { open, close: shut };
  },

  /* Enable/disable + show/hide a contextual action button. A button that
   * is not part of the current decision is fully inert (no leakage). */
  setActive(el, active) {
    if (!el) return;
    el.classList.toggle('active', active);
    el.disabled = !active;
  },
};

window.BacUI = BacUI;
