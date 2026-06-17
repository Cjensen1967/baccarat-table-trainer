/* =====================================================================
 * review.js — Missed Hands review module.
 *
 * Reads from localStorage key 'bac_missed_hands'.
 * Entries are saved by individual training modules (test.js, etc.)
 * whenever the trainee commits a wrong decision.
 *
 * Data format per entry:
 * {
 *   id:      string,     unique identifier
 *   source:  string,     'test' | 'dealing' | 'guided' | 'drill'
 *   ts:      number,     unix timestamp in ms
 *   pCards:  [ {img, d}, ... ],   Player cards (img path, display text)
 *   bCards:  [ {img, d}, ... ],   Banker cards
 *   pFinal:  number,
 *   bFinal:  number,
 *   natural: boolean,
 *   errors:  [ { step, choice, correct, ruleText }, ... ]
 * }
 * =================================================================== */

(function () {
  'use strict';

  const LS_KEY = 'bac_missed_hands';

  const SOURCE_LABELS = {
    test:    'Assessment',
    dealing: 'Dealing',
    guided:  'Guided',
    drill:   'Drill'
  };

  const STEP_LABELS   = { player: 'Player', banker: 'Banker', winner: 'Winner' };
  const CHOICE_LABELS = { draw: 'Draw', stand: 'Stand', player: 'Player', banker: 'Banker', tie: 'Tie' };

  /* ==================================================================
   * Storage helpers
   * ================================================================== */

  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch (e) { return []; }
  }

  function saveAll(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch (e) {}
  }

  function clearAll() {
    saveAll([]);
  }

  /* ==================================================================
   * Time formatting
   * ================================================================== */

  function formatAge(ts) {
    const diff = Date.now() - ts;
    if (diff < 60_000)       return 'just now';
    if (diff < 3_600_000)    return Math.floor(diff / 60_000)    + 'm ago';
    if (diff < 86_400_000)   return Math.floor(diff / 3_600_000) + 'h ago';
    if (diff < 604_800_000)  return Math.floor(diff / 86_400_000) + 'd ago';
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /* ==================================================================
   * Rendering
   * ================================================================== */

  function cardImg(c) {
    return `<img class="rv-mini-img" src="${c.img}" alt="${c.d}" loading="lazy">`;
  }

  function buildCard(h) {
    const src   = SOURCE_LABELS[h.source] || h.source;
    const bHtml = (h.bCards || []).map(cardImg).join('');
    const pHtml = (h.pCards || []).map(cardImg).join('');

    const errHtml = (h.errors || []).map(e => {
      const step   = STEP_LABELS[e.step]   || e.step;
      const chose  = CHOICE_LABELS[e.choice]  || e.choice;
      const should = CHOICE_LABELS[e.correct] || e.correct;
      return `<div class="rv-error">
        <span class="rv-error__step">${step}:</span>
        You said <b>${chose}</b> — should be <b>${should}</b>.
        ${e.ruleText ? `<span class="rv-error__rule">${e.ruleText}</span>` : ''}
      </div>`;
    }).join('');

    const naturalBadge = h.natural
      ? '<span class="rv-natural-badge">Natural</span><br>'
      : '';

    return `<article class="rv-card" data-src="${h.source}" data-id="${h.id}">
      <div class="rv-card__meta">
        <span class="rv-card__src rv-src--${h.source}">${src}</span>
        <span class="rv-card__time">${formatAge(h.ts)}</span>
      </div>
      <div class="rv-card__table">
        <div class="rv-mini-hand rv-mini-hand--banker">
          <span class="rv-mini-label">B</span>
          <div class="rv-mini-cards">${bHtml}</div>
          <span class="rv-mini-total">${h.bFinal}</span>
        </div>
        <div class="rv-mini-hand rv-mini-hand--player">
          <span class="rv-mini-label">P</span>
          <div class="rv-mini-cards">${pHtml}</div>
          <span class="rv-mini-total">${h.pFinal}</span>
        </div>
      </div>
      ${naturalBadge}
      <div class="rv-errors">${errHtml}</div>
    </article>`;
  }

  /* ==================================================================
   * Main render
   * ================================================================== */

  let currentFilter = 'all';

  function render() {
    const all  = loadAll();
    const list = document.getElementById('rv-list');
    const empty = document.getElementById('rv-empty');
    const subtitle = document.getElementById('rv-subtitle');

    // Apply filter
    const shown = currentFilter === 'all'
      ? all
      : all.filter(h => h.source === currentFilter);

    // Subtitle
    const total = all.length;
    subtitle.textContent = total === 0
      ? 'No mistakes on record'
      : `${total} missed hand${total !== 1 ? 's' : ''} across all modes`;

    if (shown.length === 0) {
      list.innerHTML = '';
      list.hidden = true;
      empty.hidden = false;

      // Adjust empty-state message when filtered but total > 0
      const emptyMsg  = empty.querySelector('.rv-empty__msg');
      const emptyHint = empty.querySelector('.rv-empty__hint');
      if (currentFilter !== 'all' && total > 0) {
        emptyMsg.textContent  = `No missed hands from ${SOURCE_LABELS[currentFilter] || currentFilter}.`;
        emptyHint.textContent = 'Switch filter to All to see mistakes from other modes.';
      } else {
        emptyMsg.textContent  = 'No missed hands to review!';
        emptyHint.textContent = 'Mistakes from Assessment, Dealing, and Guided sessions will appear here.';
      }
    } else {
      list.hidden = false;
      empty.hidden = true;
      list.innerHTML = shown.map(buildCard).join('');
    }
  }

  /* ==================================================================
   * Filter buttons
   * ================================================================== */

  document.querySelectorAll('.rv-filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.rv-filter-btn').forEach(b => b.classList.remove('rv-filter-btn--active'));
      btn.classList.add('rv-filter-btn--active');
      currentFilter = btn.dataset.src;
      render();
    });
  });

  /* ==================================================================
   * Clear button — custom confirm overlay (no browser confirm())
   * ================================================================== */

  document.getElementById('rv-clear-btn').addEventListener('click', () => {
    const all = loadAll();
    if (all.length === 0) return;

    // Build overlay
    const overlay = document.createElement('div');
    overlay.className = 'rv-confirm';
    overlay.innerHTML = `
      <div class="rv-confirm__box">
        <h3>Clear All Missed Hands?</h3>
        <p>This will permanently remove all ${all.length} saved mistakes. You cannot undo this.</p>
        <div class="rv-confirm__actions">
          <button class="btn btn--ghost btn--lg" id="rv-cancel" style="flex:1">Cancel</button>
          <button class="btn btn--gold  btn--lg" id="rv-confirm-yes" style="flex:1">Clear</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#rv-confirm-yes').addEventListener('click', () => {
      clearAll();
      overlay.remove();
      render();
    });
    overlay.querySelector('#rv-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  });

  /* ==================================================================
   * Boot
   * ================================================================== */

  render();

})();
