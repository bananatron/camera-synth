import path from 'node:path';

export function resolveAssetPath(pathname, root, production = false) {
  let name;
  try {
    name = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (name.includes('\0') || name.includes('\\')) return null;
  if (name.split('/').some((part) => part.startsWith('.'))) return null;
  if (name === '/') name = '/index.html';
  const allowed =
    name === '/index.html' ||
    name.startsWith('/src/') ||
    name.startsWith('/tracking/') ||
    (!production && name.startsWith('/tests/'));
  if (!allowed) return null;
  if (!production && name.startsWith('/tracking/')) name = '/public' + name;
  const file = path.resolve(root, '.' + name);
  return file.startsWith(root + path.sep) ? file : null;
}
