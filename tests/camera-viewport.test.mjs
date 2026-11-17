import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraViewport, projectCameraPoint, inferenceSize } from '../src/camera-viewport.js';
test('a 4:3 camera fills a wide desktop stage by cropping, preserving the camera proportions', () => {
  const box = cameraViewport(1600, 700, 640, 480);
  assert.equal(box.width / box.height, 640 / 480);
  assert.equal(box.width, 1600);
  assert.equal(box.height, 1200);
  assert.equal(box.y, -250);
  assert.deepEqual(projectCameraPoint({ x: 0.5, y: 0.5 }, box), { x: 800, y: 350 });
});
test('the mirrored hand overlay follows the camera crop for both portrait and landscape stages', () => {
  for (const [w, h] of [
    [1400, 650],
    [600, 1000],
  ]) {
    const box = cameraViewport(w, h, 1280, 720);
    const p = projectCameraPoint({ x: 0.25, y: 0.4 }, box);
    assert.equal(p.x, box.x + 0.75 * box.width);
    assert.equal(p.y, box.y + 0.4 * box.height);
    assert.ok(box.width >= w && box.height >= h);
  }
});
test('tracking input retains camera aspect instead of forcing every stream to 4:3', () => {
  assert.deepEqual(inferenceSize(1920, 1080), { width: 320, height: 180 });
  assert.deepEqual(inferenceSize(640, 480), { width: 320, height: 240 });
  assert.deepEqual(inferenceSize(0, 0), { width: 320, height: 240 });
});
