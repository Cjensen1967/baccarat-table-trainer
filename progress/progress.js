/* =====================================================================
 * progress.js — Stats / Progress dashboard.
 *
 * Reads from localStorage keys shared by all training modules:
 *   bac_stats_guided   bac_stats_dealing   bac_stats_drill   bac_stats_test
 *   bac_missed_hands
 *
 * Stats format (BacStats class):
 *   { correct, incorrect, hands, streak, bestStreak, peeks }
 *
 * This page is read-only. No training here — just reflection.
 * =================================================================== */

(function () {
  'use strict';

  const CIRCUM = 364.4; // 2π × 58

  const MODULES = [
    { id: 'guided',  key: 'bac_stats_guided',  label: 'Guided',    icon: '🎓' },
    { id: 'dealing', key: 'bac_stats_dealing', label: 'Dealing',   icon: '🃏' },
    { id: 'drill',   key: 'bac_stats_drill',   label: 'Drill',     icon: '⚡' },
    { id: 'test',    key: 'bac_stats_test',    label: 'Assessment',icon: '🏅' },
  ];

  /* ==================================================================
   * Data helpers
   * ================================================================== */

  function blank() {
    return { correct: 0, incorrect: 0, hands: 0, streak: 0, bestStreak: 0, peeks: 0 };
  }

  function loadStats(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return Object.assign(blank(), JSON.parse(raw));
    } catch (e) { return null; }
  }

  function saveStats(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  }

  function accuracy(s) {
    if (!s) return 0;
    const total = s.correct + s.incorrect;
    return total ? Math.round((s.correct / total) * 100) : 0;
  }

  function totalDecisions(s) {
    if (!s) return 0;
    return s.correct + s.incorrect;
  }

  function loadMissedCount() {
    try {
      return JSON.parse(localStorage.getItem('bac_missed_hands') || '[]').length;
    } catch (e) { return 0; }
  }

  /* ==================================================================
   * SVG ring helper
   * ================================================================== */

  function setRing(pct) {
    const fill = document.getElementById('pg-ring-fill');
    if (!fill) return;
    const offset = CIRCUM * (1 - pct / 100);
    fill.style.strokeDashoffset = offset;
    fill.style.stroke = pct >= 85
      ? 'var(--correct)'
      : pct >= 65
        ? 'var(--gold-400)'
        : pct === 0
          ? 'rgba(255,255,255,0.08)'
          : 'var(--incorrect)';
  }

  /* ==================================================================
   * Render
   * ================================================================== */

  function render() {
    const allStats = MODULES.map(m => ({ m, s: loadStats(m.key) }));
    const hasAny   = allStats.some(({ s }) => s !== null);

    // Aggregate totals
    let totalCorrect = 0, totalDec = 0, totalHands = 0, bestStreak = 0;
    allStats.forEach(({ s }) => {
      if (!s) return;
      totalCorrect += s.correct;
      totalDec     += s.correct + s.incorrect;
      totalHands   += s.hands;
      if (s.bestStreak > bestStreak) bestStreak = s.bestStreak;
    });
    const overallPct = totalDec ? Math.round((totalCorrect / totalDec) * 100) : 0;

    // Subtitle
    document.getElementById('pg-subtitle').textContent = hasAny
      ? `${totalHands} hands across all modes`
      : 'No training sessions yet';

    // Ring
    // Animate after a short delay so the transition fires
    requestAnimationFrame(() => {
      setTimeout(() => setRing(overallPct), 60);
    });

    document.getElementById('pg-ring-pct').textContent = hasAny ? overallPct + '%' : '–';

    // Overall count pills
    const countsEl = document.getElementById('pg-overall-counts');
    countsEl.innerHTML = hasAny ? `
      <div class="pg-stat-pill">
        <span class="pg-stat-pill__val">${totalHands}</span>
        <span class="pg-stat-pill__key">Hands</span>
      </div>
      <div class="pg-stat-pill">
        <span class="pg-stat-pill__val">${totalDec}</span>
        <span class="pg-stat-pill__key">Decisions</span>
      </div>
      <div class="pg-stat-pill">
        <span class="pg-stat-pill__val">${bestStreak}</span>
        <span class="pg-stat-pill__key">Best Streak</span>
      </div>
    ` : '';

    // Module breakdown
    const modsEl = document.getElementById('pg-modules');
    if (!hasAny) {
      modsEl.innerHTML = `
        <div class="pg-empty">
          <div class="pg-empty__icon">📊</div>
          <p class="pg-empty__msg">Nothing tracked yet</p>
          <p class="pg-empty__hint">Complete sessions in any training mode and your stats will appear here.</p>
          <a class="btn btn--gold" href="../index.html" style="margin-top:0.4rem">Start Training</a>
        </div>`;
    } else {
      modsEl.innerHTML = `
        <p class="pg-module-hd">By Mode</p>
        <div class="pg-module-row">
          ${allStats.map(({ m, s }) => buildModCard(m, s)).join('')}
        </div>`;
    }

    // Missed hands quick-link
    const missedCount = loadMissedCount();
    const missedEl = document.getElementById('pg-missed-link');
    missedEl.innerHTML = `
      <a href="../review/index.html">
        <span class="pg-missed-link__icon">🔁</span>
        <span class="pg-missed-link__text">
          <span class="pg-missed-link__label">Missed Hands</span>
          <span class="pg-missed-link__count">${
            missedCount === 0
              ? 'No mistakes on record'
              : `${missedCount} hand${missedCount !== 1 ? 's' : ''} waiting to review`
          }</span>
        </span>
        <i class="fas fa-chevron-right pg-missed-link__arrow"></i>
      </a>`;
  }

  function buildModCard(m, s) {
    const pct     = accuracy(s);
    const dec     = totalDecisions(s);
    const isEmpty = s === null;
    const accCls  = isEmpty ? '' : pct >= 85 ? 'pg-acc--good' : pct < 65 && dec > 0 ? 'pg-acc--low' : '';
    const accTxt  = isEmpty ? '—' : dec === 0 ? '—' : pct + '%';

    const metaParts = [];
    if (!isEmpty && s.hands > 0) metaParts.push(`${s.hands} hands`);
    if (!isEmpty && dec > 0)     metaParts.push(`${dec} decisions`);

    const streakHtml = (!isEmpty && s.bestStreak > 0)
      ? `<div class="pg-streak"><i class="fas fa-bolt"></i>${s.bestStreak} best</div>`
      : '';

    const barWidth = isEmpty || dec === 0 ? 0 : pct;

    return `<div class="pg-mod${isEmpty ? ' pg-mod--empty' : ''}">
      <div class="pg-mod__icon">${m.icon}</div>
      <div class="pg-mod__name">${m.label}</div>
      <div class="pg-mod__accuracy ${accCls}">${accTxt}</div>
      ${metaParts.length ? `<div class="pg-mod__meta">${metaParts.join(' · ')}</div>` : ''}
      ${streakHtml}
      <div class="pg-bar"><div class="pg-bar__fill" style="width:${barWidth}%"></div></div>
    </div>`;
  }

  /* ==================================================================
   * Reset all — custom confirm overlay
   * ================================================================== */

  document.getElementById('pg-reset-all-btn').addEventListener('click', () => {
    const hasAny = MODULES.some(m => loadStats(m.key) !== null);
    if (!hasAny) return;

    const overlay = document.createElement('div');
    overlay.className = 'pg-confirm';
    overlay.innerHTML = `
      <div class="pg-confirm__box">
        <h3>Reset All Stats?</h3>
        <p>This will permanently erase your progress across all training modes. This cannot be undone.</p>
        <div class="pg-confirm__actions">
          <button class="btn btn--ghost btn--lg" id="pg-cancel" style="flex:1">Cancel</button>
          <button class="btn btn--gold  btn--lg" id="pg-confirm-yes" style="flex:1">Reset</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#pg-confirm-yes').addEventListener('click', () => {
      MODULES.forEach(m => saveStats(m.key, null));
      MODULES.forEach(m => localStorage.removeItem(m.key));
      overlay.remove();
      render();
    });
    overlay.querySelector('#pg-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  });

  /* ==================================================================
   * Boot
   * ================================================================== */

  render();

})();
