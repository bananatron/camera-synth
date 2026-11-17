import test from 'node:test';
import assert from 'node:assert/strict';
import { playbackRate, encodeWav } from '../src/audio.js';
test('sample-rounded buffers preserve the exact musical duration at playback', () => {
  const duration = 240 / 137;
  const bufferDuration = Math.round(duration * 48000) / 48000;
  assert.ok(Math.abs(bufferDuration / playbackRate(bufferDuration, duration) - duration) < 1e-12);
});
test('WAV export writes valid interleaved PCM, clips overloads and preserves silence', () => {
  const channels = [new Float32Array([-2, 0, 0.5, 2]), new Float32Array([1, 0, -0.5, -1])];
  const buf = encodeWav(channels, 48000);
  const v = new DataView(buf);
  assert.equal(new TextDecoder().decode(buf.slice(0, 4)), 'RIFF');
  assert.equal(v.getUint32(40, true), 16);
  assert.equal(v.getUint16(22, true), 2);
  assert.equal(v.getUint32(24, true), 48000);
  assert.equal(v.getInt16(44, true), -32768);
  assert.equal(v.getInt16(46, true), 32767);
  assert.equal(v.getInt16(48, true), 0);
});
