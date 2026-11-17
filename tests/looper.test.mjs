import test from 'node:test';
import assert from 'node:assert/strict';
import { LoopRecorder, barSeconds, nextBoundary, loopPhase } from '../src/looper.js';
const frame = [{ midi: 60, cutoff: 1500, morph: 0.3, gain: 0.2 }];
test('first phrase rounds to nearest bar, trims overshoot, and establishes a clock', () => {
  const r = new LoopRecorder(120);
  r.begin(10, ['keys', 'keys'], frame);
  r.capture(11, frame);
  r.capture(12.3, frame);
  assert.equal(r.requestEnd(12.2), 12);
  const [t] = r.finish(12.2);
  assert.equal(t.duration, 2);
  assert.equal(r.origin, 10);
  assert.ok(t.events.every((e) => e.time < 2));
  assert.equal(t.events[0].time, 0);
});
test('early close waits for at least one full bar and captures the tail', () => {
  const r = new LoopRecorder(120);
  r.begin(0, ['bass', 'bass'], frame);
  assert.equal(r.requestEnd(0.2), 2);
  assert.equal(r.finish(1.9), null);
  r.capture(1.95, frame);
  assert.equal(r.finish(2)[0].events.at(-1).time, 1.95);
});
test('overdubs arm at a shared bar, allow different lengths, and never drift', () => {
  const r = new LoopRecorder(120);
  r.begin(0, ['keys', 'keys'], frame);
  r.requestEnd(2);
  r.finish(2);
  assert.equal(r.begin(2.1, ['bass', 'bass'], frame), 4);
  r.capture(3, frame);
  r.capture(4, frame);
  r.requestEnd(8.1);
  const [t] = r.finish(8.1);
  assert.equal(t.duration, 4);
  assert.ok(t.events.every((e) => e.time >= 0));
  assert.equal(loopPhase(100004.5, 0, 4), 0.5);
  assert.equal(nextBoundary(6, 0, 2), 6);
  assert.equal(barSeconds(120), 2);
});
test('cancel resets an uncommitted first clock, many tracks have no artificial cap', () => {
  const r = new LoopRecorder(120);
  r.begin(5, ['keys', 'keys'], frame);
  r.cancel();
  assert.equal(r.origin, null);
  for (let i = 0; i < 40; i++) {
    const start = r.begin(i * 2, ['keys', 'keys'], frame);
    r.requestEnd(start + 2);
    assert.ok(r.finish(start + 2));
  }
  assert.equal(r.tracks.length, 40);
});
test('tempo cannot change underneath recordings or loops; invalid tempo is rejected', () => {
  const r = new LoopRecorder(120);
  assert.throws(() => r.setTempo(0));
  r.begin(0, ['keys', 'keys'], frame);
  assert.throws(() => r.setTempo(90));
  r.cancel();
  r.setTempo(90);
  assert.equal(r.bpm, 90);
});
test('an armed overdub uses the latest hand state at its actual start, never a stale held note', () => {
  const r = new LoopRecorder(120);
  r.begin(0, ['keys', 'keys'], frame);
  r.requestEnd(2);
  r.finish(2);
  r.begin(2.1, ['keys', 'keys'], frame);
  r.capture(3.9, []);
  r.capture(4.02, []);
  r.capture(4.5, frame);
  r.requestEnd(6);
  const [t] = r.finish(6);
  assert.equal(t.events[0].time, 0);
  assert.equal(t.events[0].frame[0].gain, 0);
});
test('a take becomes separate left and right loops with independent instruments and identical boundaries', () => {
  const r = new LoopRecorder(120),
    instruments = ['bass', 'drums'];
  const left = { ...frame[0], midi: 48 },
    right = { ...frame[0], midi: 72, rate: 120, pattern: 2 };
  r.begin(0, instruments, [left, right]);
  instruments[0] = 'bell';
  r.capture(0.5, [
    { ...left, midi: 50 },
    { ...right, pattern: 1 },
  ]);
  r.requestEnd(2);
  const tracks = r.finish(2);
  assert.equal(tracks.length, 2);
  assert.deepEqual(
    tracks.map((t) => [t.hand, t.instrument]),
    [
      ['Left', 'bass'],
      ['Right', 'drums'],
    ],
  );
  assert.equal(tracks[0].start, tracks[1].start);
  assert.equal(tracks[0].duration, tracks[1].duration);
  assert.equal(tracks[0].takeId, tracks[1].takeId);
  assert.notEqual(tracks[0].id, tracks[1].id);
  assert.deepEqual(tracks[0].events[1].frame, [{ ...left, midi: 50 }]);
  assert.deepEqual(tracks[1].events[1].frame, [{ ...right, pattern: 1 }]);
});
test('a one-hand take omits the silent hand and preserves note releases', () => {
  const r = new LoopRecorder(120);
  r.begin(0, ['keys', 'bell'], [null, frame[0]]);
  r.capture(0.5, []);
  r.requestEnd(2);
  const tracks = r.finish(2);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].hand, 'Right');
  assert.equal(tracks[0].events.at(-1).frame[0].gain, 0);
});
test('a silent take creates no empty loops and leaves tempo unlocked', () => {
  const r = new LoopRecorder(120);
  r.begin(0, ['keys', 'drums'], []);
  r.requestEnd(2);
  assert.deepEqual(r.finish(2), []);
  assert.equal(r.tracks.length, 0);
  assert.equal(r.origin, null);
  r.setTempo(90);
});
test('removing or muting a hand loop does not affect its partner', () => {
  const r = new LoopRecorder(120);
  r.begin(0, ['keys', 'bass'], [frame[0], frame[0]]);
  r.requestEnd(2);
  const [l, right] = r.finish(2);
  l.muted = true;
  l.volume = 0.1;
  r.remove(l.id);
  assert.equal(r.tracks.length, 1);
  assert.equal(r.tracks[0], right);
  assert.equal(right.muted, false);
  assert.equal(right.volume, 0.8);
  assert.equal(r.origin, 0);
});
