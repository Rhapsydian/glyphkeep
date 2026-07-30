import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '@glyphrogue/core';
import { rollLoadoutOptions, LOADOUT_ROLL_COUNT } from '../src/loadout.js';

// Object key order is insertion order for string keys - the pool
// rollLoadoutOptions samples from starts as ['a', 'b', 'c', 'd', 'e', 'f'].
const CATALOG = { a: {}, b: {}, c: {}, d: {}, e: {}, f: {} };

function fakeApi(values) {
  const api = createApi();
  let index = 0;
  api.rng.next = () => values[index++];
  return api;
}

test('rolls the requested count of distinct ids, all from the catalog', () => {
  const api = createApi(); // real seeded rng - a property test, not a scripted one
  const picks = rollLoadoutOptions(api, CATALOG, 5);

  assert.equal(picks.length, 5);
  assert.equal(new Set(picks).size, 5, 'no duplicate picks');
  for (const id of picks) assert.ok(id in CATALOG);
});

test('a scripted rng sequence produces exact, deterministic picks', () => {
  // Each pick removes the chosen entry from the shrinking pool via splice -
  // an rng of 0 always selects whatever's currently at index 0.
  const api = fakeApi([0, 0, 0]);

  const picks = rollLoadoutOptions(api, CATALOG, 3);

  assert.deepEqual(picks, ['a', 'b', 'c']);
});

test('throws rather than silently truncating when count exceeds the catalog size', () => {
  const api = createApi();

  assert.throws(() => rollLoadoutOptions(api, CATALOG, 7));
});

test('LOADOUT_ROLL_COUNT is 5, per DESIGN.md\'s "5 randomly-rolled starting items"', () => {
  assert.equal(LOADOUT_ROLL_COUNT, 5);
});
