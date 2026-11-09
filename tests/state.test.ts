import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Field } from '../src/domain';
import { boundRect, emptyHistory, fieldReducer, isDirty } from '../src/state/fields';
const field: Field = {
  id: 'a',
  x: 20,
  y: 30,
  width: 120,
  height: 24,
  page: 0,
  source: 'detected',
  kind: 'text',
  label: 'Name',
  value: '',
};
test('undo to baseline clears dirty state; redo and discard preserve the saved baseline', () => {
  let state = fieldReducer(emptyHistory, { type: 'reset', fields: [field] });
  state = fieldReducer(state, {
    type: 'patch',
    id: 'a',
    patch: { label: 'Vorname', value: 'Erika' },
  });
  assert(isDirty(state));
  state = fieldReducer(state, { type: 'undo' });
  assert(!isDirty(state));
  state = fieldReducer(state, { type: 'redo' });
  assert.equal(state.current[0].value, 'Erika');
  state = fieldReducer(state, { type: 'discard' });
  assert.deepEqual(state.current, [field]);
  assert(!isDirty(state));
});
test('shared native field values stay synchronized and readonly fields remain unchanged', () => {
  const native = { ...field, source: 'native' as const, nativeName: 'shared' };
  let state = fieldReducer(emptyHistory, {
    type: 'reset',
    fields: [native, { ...native, id: 'b', page: 1 }, { ...field, id: 'c', readOnly: true }],
  });
  state = fieldReducer(state, { type: 'patch', id: 'a', patch: { value: 'Erika' } });
  assert.equal(state.current[1].value, 'Erika');
  state = fieldReducer(state, { type: 'patch', id: 'c', patch: { value: 'changed' } });
  assert.equal(state.current[2].value, '');
});
test('drag and resize cannot move fields outside the page', () => {
  assert.deepEqual(
    boundRect({ x: -8, y: 800, width: 900, height: 40 }, { width: 595, height: 842 }),
    { x: 0, y: 800, width: 595, height: 40 },
  );
  assert.deepEqual(
    boundRect({ x: 580, y: 835, width: 160, height: 24 }, { width: 595, height: 842 }),
    { x: 435, y: 818, width: 160, height: 24 },
  );
});
