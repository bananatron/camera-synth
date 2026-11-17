import test from 'node:test';
import assert from 'node:assert/strict';
import { HandCamera } from '../src/input.js';
test('camera exposes pending permission state so the UI can cancel rather than opening a second stream', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
    cancel = globalThis.cancelAnimationFrame;
  let resolve,
    stopped = false;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: () => new Promise((r) => (resolve = r)) } },
  });
  globalThis.cancelAnimationFrame = () => {};
  try {
    let pendingAtStatus;
    const camera = new HandCamera(
      {},
      () => {},
      () => {
        pendingAtStatus = camera.pending;
      },
    );
    const task = camera.start();
    const pendingDuringRequest = camera.pending;
    camera.stop();
    resolve({
      getTracks: () => [
        {
          stop() {
            stopped = true;
          },
        },
      ],
    });
    await task;
    assert.equal(pendingAtStatus, true);
    assert.equal(pendingDuringRequest, true);
    assert.equal(camera.pending, false);
    assert.ok(stopped);
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else delete globalThis.navigator;
    globalThis.cancelAnimationFrame = cancel;
  }
});
