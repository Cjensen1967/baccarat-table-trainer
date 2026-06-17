/* =====================================================================
 * gate.js — Experimental entry gate.
 *
 * Unlike the original modules (which redirected to the root disclaimer
 * and then dumped the user into the OLD app), this gate keeps the user
 * INSIDE the experimental app: it sends them to experimental/disclaimer.html
 * with a ?next= pointer back to wherever they were headed.
 *
 * Include this in the <head> of every experimental trainer page, BEFORE
 * the other scripts, so it runs as early as possible.
 * =================================================================== */
(function () {
  var FLAG = 'bac_exp_disclaimer_accepted';
  if (sessionStorage.getItem(FLAG)) return;

  // Work out this page's path relative to the experimental/ root so the
  // disclaimer can return us to the exact module we were entering.
  var path = window.location.pathname;
  var m = path.match(/experimental\/(.+)$/);
  var next = m ? m[1] : 'index.html';

  // Build the correct relative hop up to experimental/disclaimer.html for
  // whatever depth this page sits at (root dashboard or a module folder).
  var depth = next.split('/').length - 1; // 0 at root, 1 in a module folder
  var prefix = depth > 0 ? new Array(depth + 1).join('../') : './';
  var url = prefix + 'disclaimer.html?next=' + encodeURIComponent(next);
  window.location.replace(url);

})();
