import test from 'node:test';
import assert from 'node:assert/strict';
import { pitchAt, noteName, mapHand, silentFrame } from '../src/music.js';

test('pitch stays in chosen scale and spans exactly two octaves', () => {
  const notes = Array.from({ length: 101 }, (_, i) => pitchAt(i / 100, 'minor', 48));
  assert.equal(notes[0], 48);
  assert.equal(notes.at(-1), 72);
  assert.ok(notes.every((n) => [0, 2, 3, 5, 7, 8, 10].includes((n - 48) % 12)));
  assert.equal(pitchAt(-5, 'minor', 48), 48);
  assert.equal(pitchAt(5, 'minor', 48), 72);
  assert.equal(noteName(60), 'C4');
});
function hand({ x = 0.5, y = 0.5, tilt = 0, closed = false } = {}) {
  const p = Array.from({ length: 21 }, () => ({ x, y, z: 0 }));
  p[0] = { x, y: y + 0.15, z: 0 };
  for (const b of [5, 9, 13, 17]) {
    p[b] = { x: x + (b - 11) * 0.008, y, z: 0 };
    p[b + 1] = { x: p[b].x, y: y - 0.06, z: 0 };
    p[b + 2] = { x: p[b].x, y: y - 0.1, z: 0 };
    p[b + 3] = { x: p[b].x + tilt * 0.12, y: closed ? y + 0.08 : y - 0.15, z: 0 };
  }
  return p;
}
test('mirrored screen position maps to pitch, height to brightness, finger tilt to wave', () => {
  const low = mapHand(hand({ x: 0.8, y: 0.8 }), { scale: 'minor', root: 48 });
  const high = mapHand(hand({ x: 0.2, y: 0.2, tilt: 1 }), { scale: 'minor', root: 48 });
  assert.ok(high.midi > low.midi);
  assert.ok(high.cutoff > low.cutoff);
  assert.ok(high.morph > low.morph);
  assert.ok(low.gain > 0);
  assert.equal(mapHand(hand({ closed: true })).gain, 0);
});
test('missing and malformed tracking fails silent without NaN audio parameters', () => {
  for (const points of [undefined, [], [{ x: NaN, y: 0 }], Array(21).fill({ x: Infinity, y: 0 })])
    assert.deepEqual(mapHand(points), silentFrame());
});
test('small finger tilts produce a large timbre sweep, independent of palm position', () => {
  const straight = mapHand(hand());
  const tilted = mapHand(hand({ tilt: 0.65 }));
  assert.equal(straight.midi, tilted.midi);
  assert.ok(tilted.morph - straight.morph > 0.35);
});
test('finger spread and index bend become independent, bounded audio controls', () => {
  const narrow = hand();
  narrow[8].x = 0.48;
  narrow[20].x = 0.52;
  const wide = hand();
  wide[8].x = 0.25;
  wide[20].x = 0.75;
  assert.ok(mapHand(wide).spread - mapHand(narrow).spread > 0.5);
  const bent = hand();
  bent[8].y = 0.58;
  assert.ok(mapHand(bent).bend - mapHand(hand()).bend > 0.5);
  for (const f of [mapHand(wide), mapHand(bent)])
    for (const key of ['spread', 'bend', 'pinch']) assert.ok(f[key] >= 0 && f[key] <= 1);
});
