// The video uses object-fit: cover, centered. Apply the identical transform to landmarks.
export function cameraViewport(width, height, sourceWidth = 640, sourceHeight = 480) {
  if (!(sourceWidth > 0 && sourceHeight > 0)) {
    sourceWidth = 640;
    sourceHeight = 480;
  }
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawnWidth = sourceWidth * scale,
    drawnHeight = sourceHeight * scale;
  return {
    x: (width - drawnWidth) / 2,
    y: (height - drawnHeight) / 2,
    width: drawnWidth,
    height: drawnHeight,
  };
}
export function projectCameraPoint(point, viewport) {
  return {
    x: viewport.x + (1 - point.x) * viewport.width,
    y: viewport.y + point.y * viewport.height,
  };
}
export function inferenceSize(width, height) {
  if (!(width > 0 && height > 0)) return { width: 320, height: 240 };
  const scale = 320 / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
