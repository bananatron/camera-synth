import { PRESETS } from './music.js';
import { HANDS } from './hands.js';
import { cameraViewport, projectCameraPoint } from './camera-viewport.js';

export function drawWave(canvas, samples) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#7d9660';
  const step = Math.max(1, Math.floor(samples.length / canvas.width));
  for (let x = 0; x < canvas.width; x += 2) {
    let peak = 0;
    for (let i = x * step; i < Math.min(samples.length, (x + 2) * step); i += 8)
      peak = Math.max(peak, Math.abs(samples[i]));
    const h = Math.max(1, Math.min(58, peak * 230));
    c.fillRect(x, 32 - h / 2, 1, h);
  }
}
export function drawHands(canvas, hands, instruments, video) {
  const w = canvas.clientWidth,
    h = canvas.clientHeight,
    viewport = cameraViewport(w, h, video.videoWidth, video.videoHeight);
  const pixelWidth = Math.round(w * devicePixelRatio),
    pixelHeight = Math.round(h * devicePixelRatio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const c = canvas.getContext('2d');
  c.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  c.clearRect(0, 0, w, h);
  c.strokeStyle = '#d2eba1';
  c.fillStyle = '#e3f4bc';
  c.lineWidth = 1;
  const connections = [
    [0, 1, 2, 3, 4],
    [0, 5, 6, 7, 8],
    [5, 9, 10, 11, 12],
    [9, 13, 14, 15, 16],
    [13, 17, 18, 19, 20],
    [0, 17],
  ];
  for (const hand of hands) {
    const slot = HANDS.indexOf(hand.side);
    c.strokeStyle = slot === 1 ? '#9bd9ed' : '#d2eba1';
    c.fillStyle = c.strokeStyle;
    const label = projectCameraPoint(hand.points[0], viewport);
    c.font = '11px monospace';
    c.fillText(
      (slot === 1 ? 'R · ' : 'L · ') + PRESETS[instruments[slot === 1 ? 1 : 0]].name,
      label.x + 8,
      label.y + 16,
    );
    for (const path of connections) {
      c.beginPath();
      path.forEach((index, i) => {
        const { x, y } = projectCameraPoint(hand.points[index], viewport);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      });
      c.stroke();
    }
    for (const p of hand.points) {
      c.beginPath();
      const point = projectCameraPoint(p, viewport);
      c.arc(point.x, point.y, 2, 0, Math.PI * 2);
      c.fill();
    }
  }
}
