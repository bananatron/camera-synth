import test from 'node:test';
import assert from 'node:assert/strict';
import { routeHands } from '../src/hands.js';
const left = { side: 'Left', x: 0.8, gain: 0.1, midi: 48 },
  right = { side: 'Right', x: 0.2, gain: 0.2, midi: 72 };
test('hand slots follow identity when detection order changes or hands cross', () => {
  assert.deepEqual(
    routeHands([right, left], (h) => h),
    [left, right],
  );
  const crossed = [
    { ...left, x: 0.1 },
    { ...right, x: 0.9 },
  ];
  assert.deepEqual(
    routeHands(crossed, (h) => h),
    crossed,
  );
});
test('a missing or unidentified hand is silent instead of borrowing the other instrument', () => {
  const [l, r] = routeHands([right, { side: 'unknown', gain: 1 }], (h) => h);
  assert.equal(l.gain, 0);
  assert.equal(r, right);
});
