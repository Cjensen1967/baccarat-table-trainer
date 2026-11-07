/* =====================================================================
 * gate.js — Disclaimer gate for Baccarat Table Trainer.
 *
 * Include this in the <head> of every module page (before other scripts).
 *
 * How it works:
 *   1. Check localStorage (persistent) and sessionStorage (per-tab).
 *      Either being set means the disclaimer was already accepted.
 *   2. Both checks are wrapped in try/catch — if storage is blocked
 *      (strict private browsing, iOS WebView restrictions, etc.) we
 *      silently allow through rather than triggering an infinite loop.
 *   3. Redirect uses an ABSOLUTE URL so it is immune to trailing-slash
 *      ambiguity and GitHub Pages directory-index quirks.
 *
 * The "next" query parameter carries the path RELATIVE TO THE PROJECT
 * ROOT so disclaimer.html can return the trainee to any module page.
 * =================================================================== */
(function () {
  'use strict';

  var FLAG = 'bac_disclaimer_v1';

  /* -- 1. Check both storage types; silently allow if storage is blocked */
  try {
    if (sessionStorage.getItem(FLAG) || localStorage.getItem(FLAG)) return;
  } catch (e) {
    return; // storage unavailable — allow through, never loop
  }

  /* -- 2. Resolve the project root from this script's URL.
   * Works at / on Vercel and under /baccarat-table-trainer/ on GitHub Pages.
   */
  var root = new URL('../../', document.currentScript.src);
  var relativePath = window.location.pathname.slice(root.pathname.length);
  if (window.location.pathname === root.pathname.slice(0, -1)) relativePath = '';
  if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
  if (!relativePath || !relativePath.endsWith('.html')) relativePath += 'index.html';

  var disclaimerUrl = new URL('disclaimer.html', root);
  disclaimerUrl.searchParams.set('next', relativePath);
  window.location.replace(disclaimerUrl.href);
})();
