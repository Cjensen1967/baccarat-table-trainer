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

  /* -- 2. Determine the "next" path relative to the project root.
   *
   * pathname examples (GitHub Pages / localhost):
   *   /baccarat-table-trainer/                 → root, no file
   *   /baccarat-table-trainer/index.html       → root, explicit file
   *   /baccarat-table-trainer/drill/index.html → module page
   *   /index.html                              → localhost root
   *   /drill/index.html                        → localhost module
   */
  var pathname = window.location.pathname;

  // Get the directory portion (strip filename if present)
  var dir = pathname.replace(/\/[^/]+\.html(\?.*)?$/, '').replace(/\/$/, '');
  // e.g. '/baccarat-table-trainer' or '/baccarat-table-trainer/drill' or ''

  var segments = dir.replace(/^\//, '').split('/').filter(Boolean);
  // e.g. ['baccarat-table-trainer'] or ['baccarat-table-trainer', 'drill'] or []

  // The first segment is the project base on GitHub Pages; empty on localhost root.
  var basePath = (segments.length > 0 ? '/' + segments[0] : '') + '/';
  // '/baccarat-table-trainer/' or '/'

  // Filename: whatever .html file we're on (fallback to index.html)
  var fileMatch = pathname.match(/\/([^/?#]+\.html)(\?|#|$)/);
  var fileName  = fileMatch ? fileMatch[1] : 'index.html';

  // Remaining segments after the project base = the module path
  var moduleParts = segments.slice(1); // e.g. ['drill'] or []
  var next = moduleParts.length > 0
    ? moduleParts.join('/') + '/' + fileName
    : fileName;
  // 'drill/index.html' or 'index.html'

  /* -- 3. Build absolute disclaimer URL and redirect */
  var disclaimerUrl = window.location.origin + basePath
    + 'disclaimer.html?next=' + encodeURIComponent(next);

  window.location.replace(disclaimerUrl);
})();
