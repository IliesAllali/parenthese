import test from 'node:test'
import assert from 'node:assert/strict'
import { easeOutCubic, getEntranceProgress, seededFloat, lerp } from '../src/heroGraphMath.js'

test('seededFloat is deterministic and bounded', () => {
  const a = seededFloat('p-mother', 3)
  const b = seededFloat('p-mother', 3)
  const c = seededFloat('p-father', 3)

  assert.equal(a, b)
  assert.notEqual(a, c)
  assert.ok(a >= 0 && a <= 1)
  assert.ok(c >= 0 && c <= 1)
})

test('getEntranceProgress follows expected boundaries', () => {
  assert.equal(getEntranceProgress(0, 100, 500), 0)
  assert.equal(getEntranceProgress(100, 100, 500), 0)
  assert.equal(getEntranceProgress(601, 100, 500), 1)
  assert.equal(getEntranceProgress(250, 100, 500) > 0, true)
  assert.equal(getEntranceProgress(250, 100, 500) < 1, true)
})

test('getEntranceProgress respects reduced motion override', () => {
  assert.equal(getEntranceProgress(0, 9999, 500, true), 1)
})

test('easeOutCubic and lerp basics', () => {
  assert.equal(easeOutCubic(0), 0)
  assert.equal(easeOutCubic(1), 1)
  assert.equal(lerp(0, 10, 0.5), 5)
})
