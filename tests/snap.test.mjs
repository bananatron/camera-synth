import test from 'node:test';
import assert from 'node:assert/strict';
import { SnapDetector } from '../src/snap.js';
test('short bright transient fires once after its falling edge, with cooldown', () => {
  const d = new SnapDetector();
  for (let t = 0; t < 300; t += 10) assert.equal(d.feed({ rms: 0.003, highRatio: 0.1 }, t), false);
  assert.equal(d.feed({ rms: 0.2, highRatio: 0.75 }, 310), false);
  assert.equal(d.feed({ rms: 0.003, highRatio: 0.1 }, 330), true);
  d.feed({ rms: 0.2, highRatio: 0.8 }, 400);
  assert.equal(d.feed({ rms: 0.003, highRatio: 0.1 }, 420), false);
  d.feed({ rms: 0.2, highRatio: 0.8 }, 1200);
  assert.equal(d.feed({ rms: 0.003, highRatio: 0.1 }, 1220), true);
});
test('sustained music, bass and quiet room noise do not count as snaps', () => {
  for (const [rms, highRatio] of [
    [0.002, 0.7],
    [0.3, 0.1],
    [0.2, 0.8],
  ]) {
    const d = new SnapDetector();
    let hits = 0;
    for (let t = 0; t < 1000; t += 10) hits += d.feed({ rms, highRatio }, t) ? 1 : 0;
    hits += d.feed({ rms: 0.001, highRatio: 0.1 }, 1010) ? 1 : 0;
    assert.equal(hits, 0);
  }
});
