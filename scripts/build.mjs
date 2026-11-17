import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await Promise.all([
  cp('index.html', 'dist/index.html'),
  cp('src', 'dist/src', { recursive: true }),
  cp('public/tracking', 'dist/tracking', { recursive: true }),
]);
console.log('Built Hand Loop into dist/');
