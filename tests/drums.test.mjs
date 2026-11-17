import test from 'node:test';
import assert from 'node:assert/strict';
import { drumRate, drumHits, DrumClock } from '../src/drums.js';
test('height selects half, normal, double or quadruple beat speed on the session grid', () => {
  assert.equal(drumRate(0.95, 100), 50);
  assert.equal(drumRate(0.65, 100), 100);
  assert.equal(drumRate(0.35, 100), 200);
  assert.equal(drumRate(0.05, 100), 400);
});
test('patterns include kick, snare, hats, and finger spread adds rhythmic detail', () => {
  const minimal = Array.from({ length: 16 }, (_, i) => drumHits(i, 0, 0)).flat();
  const dense = Array.from({ length: 16 }, (_, i) => drumHits(i, 2, 1)).flat();
  assert.ok(minimal.includes('kick'));
  assert.ok(minimal.includes('snare'));
  assert.ok(minimal.includes('hat'));
  assert.ok(dense.length > minimal.length);
});
test('lookahead scheduling has no duplicate hits, respects silence and stays on-grid after rate changes', () => {
  const c = new DrumClock();
  const f = { gain: 0.2, rate: 100, pattern: 0, spread: 0.5 };
  const first = c.schedule(0, 0.12, f, 0, 100);
  assert.ok(first.length > 0);
  const overlap = c.schedule(0.03, 0.09, f, 0, 100);
  assert.equal(overlap.length, 0);
  const rest = c.schedule(0.1, 0.5, { ...f, gain: 0 }, 0, 100);
  assert.equal(rest.length, 0);
  const faster = c.schedule(0.6, 1, { ...f, rate: 200 }, 0, 100);
  assert.ok(faster.length > 0);
  assert.ok(
    faster.every(
      (e) => Math.abs(e.time / (60 / 100 / 16) - Math.round(e.time / (60 / 100 / 16))) < 1e-7,
    ),
  );
});
