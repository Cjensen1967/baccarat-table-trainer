/* =====================================================================
 * gate.js — Disclaimer gate for Baccarat Table Trainer.
 *
 * Include this in the <head> of every module page (before other scripts)
 * so it runs as early as possible.
 *
 * How it works:
 *   1. If the disclaimer flag is already set, do nothing.
 *   2. Otherwise redirect to disclaimer.html with a ?next= pointer back
 *      to the current page, then disclaimer.html returns here on accept.
 *
 * Works at any module depth (root index.html or module/index.html).
 * =================================================================== */
(function () {
  var FLAG = 'bac_exp_disclaimer_accepted';
  if (sessionStorage.getItem(FLAG)) return;

  var path = window.location.pathname;

  // Extract the last one or two path segments as the "next" target so the
  // disclaimer can return the trainee to exactly the page they were entering.
  //   /baccarat-table-trainer/drill/index.html  →  next = "drill/index.html"
  //   /baccarat-table-trainer/index.html        →  next = "index.html"
  var m = path.match(/\/([^/]+\/[^/]+\.html)$/) || path.match(/\/([^/]+\.html)$/);
  var next = (m && m[1]) ? m[1] : 'index.html';

  // Compute how many levels deep this page is so we can hop back to the
  // project root where disclaimer.html lives.
  //   "drill/index.html" → depth 1 → prefix "../"
  //   "index.html"       → depth 0 → prefix "./"
  var depth = next.split('/').length - 1;
  var prefix = depth > 0 ? new Array(depth + 1).join('../') : './';

  window.location.replace(prefix + 'disclaimer.html?next=' + encodeURIComponent(next));
})();
