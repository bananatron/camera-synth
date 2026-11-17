import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveAssetPath } from '../scripts/static-path.mjs';
const root = path.resolve('/tmp/camera-synth');
test('static paths resolve app assets and locally vendored tracking in both modes', () => {
  assert.equal(resolveAssetPath('/', root), path.join(root, 'index.html'));
  assert.equal(resolveAssetPath('/src/music.js', root), path.join(root, 'src/music.js'));
  assert.equal(
    resolveAssetPath('/tracking/mediapipe/hand_landmarker.task', root),
    path.join(root, 'public/tracking/mediapipe/hand_landmarker.task'),
  );
  assert.equal(
    resolveAssetPath('/tracking/mediapipe/hand_landmarker.task', root, true),
    path.join(root, 'tracking/mediapipe/hand_landmarker.task'),
  );
  assert.equal(
    resolveAssetPath('/tests/fixtures/palm.jpg', root),
    path.join(root, 'tests/fixtures/palm.jpg'),
  );
  assert.equal(resolveAssetPath('/tests/browser.html', root, true), null);
});
test('development server never exposes repository internals, secrets, or traversal paths', () => {
  for (const url of [
    '/.env',
    '/.git/config',
    '/package.json',
    '/node_modules/prettier/bin/prettier.cjs',
    '/src/../.env',
    '/src/%2e%2e/.env',
    '/src/.private',
    '/src/%00.js',
    '/src/%ZZ.js',
  ])
    assert.equal(resolveAssetPath(url, root), null, url);
});
