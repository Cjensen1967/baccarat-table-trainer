// Run: node --test tests/rules.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync('js/core/rules.js', 'utf8'), context);
const rules = context.window.BacRules;

test('Player draws on 0–5 only', () => {
  for (let n = 0; n <= 9; n++) assert.equal(rules.shouldPlayerDraw(n), n <= 5);
});
test('Banker follows simple rule when Player stands', () => {
  for (let n = 0; n <= 9; n++) assert.equal(rules.shouldBankerDraw(n, null), n <= 5);
});
test('Banker conditional drawing tableau is exhaustive', () => {
  for (let b = 0; b <= 9; b++) {
    for (let p = 0; p <= 9; p++) {
      const expected = b <= 2 ? true :
        b === 3 ? p !== 8 :
        b === 4 ? p >= 2 && p <= 7 :
        b === 5 ? p >= 4 && p <= 7 :
        b === 6 ? p === 6 || p === 7 : false;
      assert.equal(rules.shouldBankerDraw(b, p), expected, `Banker ${b}, Player third ${p}`);
    }
  }
});
test('Naturals and outcome totals', () => {
  assert.equal(rules.anyNatural(8, 2), true);
  assert.equal(rules.anyNatural(7, 6), false);
  assert.equal(rules.handTotal([{value: 8}, {value: 7}]), 5);
  assert.equal(rules.outcome([{value: 9}], [{value: 8}]), 'player');
  assert.equal(rules.outcome([{value: 3}], [{value: 3}]), 'tie');
});
