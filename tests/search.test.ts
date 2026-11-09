import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findInRuns, type TextRun } from '../src/pdf/search';
const run = (text: string, x: number, y = 500): TextRun => ({
  text,
  transform: [1, 0, 0, 10, x, y],
  width: text.length * 5,
  height: 10,
});
test('finds words split across adjacent text runs and maps highlights back to both runs', () => {
  assert.deepEqual(findInRuns([run('Nee', 0), run('dle', 15)], 'needle'), [
    [
      { index: 0, from: 0, to: 3 },
      { index: 1, from: 0, to: 3 },
    ],
  ]);
});
test('finds phrases across line breaks without merging unrelated words', () => {
  const runs = [{ ...run('First', 0), hasEOL: true }, run('Last', 0, 480)];
  assert.equal(findInRuns(runs, 'first last').length, 1);
  assert.equal(findInRuns(runs, 'firstlast').length, 0);
  assert.equal(findInRuns([run('one', 0), run('two', 28)], 'onetwo').length, 0);
});
test('case folding keeps offsets stable and does not interpret regex syntax', () => {
  assert.deepEqual(findInRuns([run('İ Name [a]', 0)], '[a]'), [[{ index: 0, from: 7, to: 10 }]]);
  assert.equal(findInRuns([run('MÜLLER', 0)], 'müller').length, 1);
  assert.deepEqual(findInRuns([run('test', 0)], '  '), []);
});
