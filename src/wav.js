import { clamp } from './music.js';

export function encodeWav(channels, sampleRate) {
  const length = channels[0].length,
    count = channels.length,
    bytes = length * count * 2;
  const buffer = new ArrayBuffer(44 + bytes),
    v = new DataView(buffer);
  const str = (at, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + bytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, count, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * count * 2, true);
  v.setUint16(32, count * 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, bytes, true);
  for (let i = 0; i < length; i++)
    for (let c = 0; c < count; c++) {
      const s = clamp(channels[c][i], -1, 1);
      v.setInt16(44 + (i * count + c) * 2, s < 0 ? s * 32768 : s * 32767, true);
    }
  return buffer;
}
