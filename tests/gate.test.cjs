const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const gate = fs.readFileSync('js/core/gate.js', 'utf8');

function redirect(pathname, scriptUrl) {
  let target;
  const context = {
    URL,
    document: { currentScript: { src: scriptUrl } },
    window: {
      location: {
        pathname,
        origin: new URL(scriptUrl).origin,
        replace(url) { target = url; },
      },
    },
    sessionStorage: { getItem() { return null; } },
    localStorage: { getItem() { return null; } },
  };
  vm.runInNewContext(gate, context);
  return target;
}

test('disclaimer redirects from GitHub Pages subdirectory', () => {
  assert.equal(
    redirect('/baccarat-table-trainer/drill/index.html', 'https://example.github.io/baccarat-table-trainer/js/core/gate.js'),
    'https://example.github.io/baccarat-table-trainer/disclaimer.html?next=drill%2Findex.html'
  );
});
test('disclaimer redirects from Vercel root deployment', () => {
  assert.equal(
    redirect('/drill/index.html', 'https://example.vercel.app/js/core/gate.js'),
    'https://example.vercel.app/disclaimer.html?next=drill%2Findex.html'
  );
});
test('disclaimer redirects from root home page', () => {
  assert.equal(
    redirect('/', 'https://example.vercel.app/js/core/gate.js'),
    'https://example.vercel.app/disclaimer.html?next=index.html'
  );
});
