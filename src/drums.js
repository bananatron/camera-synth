import { clamp } from './music.js';
export function drumRate(y, bpm) {
  return bpm * [4, 2, 1, 0.5][Math.min(3, Math.floor(clamp(y) * 4))];
}
export function drumHits(step, pattern = 0, spread = 0) {
  const s = ((step % 16) + 16) % 16,
    hits = [];
  const kicks = [
    [0, 8],
    [0, 6, 10],
    [0, 4, 8, 12],
  ][clamp(Math.floor(pattern), 0, 2)];
  if (kicks.includes(s)) hits.push('kick');
  if ([4, 12].includes(s)) hits.push('snare');
  if (s % 2 === 0 || spread > 0.55) hits.push('hat');
  if (spread > 0.8 && [7, 15].includes(s)) hits.push('snare');
  return hits;
}
export class DrumClock {
  constructor() {
    this.lastTick = -Infinity;
    this.origin = null;
  }
  schedule(now, until, frame, origin = 0, bpm = 100) {
    if (this.origin !== origin) {
      this.origin = origin;
      this.lastTick = -Infinity;
    }
    const quantum = 60 / bpm / 16,
      start = Math.max(0, Math.ceil((now - origin - 1e-7) / quantum), this.lastTick + 1),
      end = Math.floor((until - origin + 1e-7) / quantum),
      events = [];
    const multiplier = (frame.rate || bpm) / bpm;
    const stride = Math.max(1, Math.round(4 / multiplier));
    for (let tick = start; tick <= end; tick++)
      if (frame.gain > 0 && tick % stride === 0) {
        for (const kind of drumHits(Math.floor(tick / stride), frame.pattern, frame.spread))
          events.push({ time: origin + tick * quantum, kind, frame });
      }
    this.lastTick = Math.max(this.lastTick, end);
    return events;
  }
}
const noiseCache = new WeakMap();
function noise(ctx) {
  if (noiseCache.has(ctx)) return noiseCache.get(ctx);
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.5), ctx.sampleRate),
    s = b.getChannelData(0);
  let seed = 123456;
  for (let i = 0; i < s.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    s[i] = (seed >>> 0) / 2147483648 - 1;
  }
  noiseCache.set(ctx, b);
  return b;
}
export function playDrum(ctx, destination, { kind, time, frame }) {
  const bright = clamp(frame.morph ?? 0.5),
    spread = clamp(frame.spread ?? 0.5),
    bend = clamp(frame.bend ?? 0),
    velocity = clamp(frame.gain / 0.16) * 0.55;
  const gain = ctx.createGain();
  gain.connect(destination);
  if (kind === 'kick') {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(100 + bright * 160, time);
    o.frequency.exponentialRampToValueAtTime(42 + bright * 18, time + 0.12);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(velocity, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18 + bend * 0.3);
    o.connect(gain);
    o.start(time);
    o.stop(time + 0.5);
    o.onended = () => {
      o.disconnect();
      gain.disconnect();
    };
  } else {
    const source = ctx.createBufferSource();
    source.buffer = noise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = kind === 'hat' ? 'highpass' : 'bandpass';
    filter.frequency.value = kind === 'hat' ? 4500 + bright * 6000 : 800 + bright * 4000;
    filter.Q.value = kind === 'hat' ? 0.6 : 1 + (frame.pinch || 0) * 8;
    const duration =
      kind === 'hat' ? 0.025 + spread * 0.08 + bend * 0.12 : 0.1 + bright * 0.08 + bend * 0.15;
    gain.gain.setValueAtTime(Math.max(0.0001, velocity * (kind === 'hat' ? 0.35 : 0.65)), time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter).connect(gain);
    source.start(time);
    source.stop(time + duration + 0.01);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    if (kind === 'snare') {
      const body = ctx.createOscillator(),
        g = ctx.createGain();
      body.type = 'triangle';
      body.frequency.value = 170 + bright * 80;
      g.gain.setValueAtTime(velocity * 0.3, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
      body.connect(g).connect(destination);
      body.start(time);
      body.stop(time + 0.11);
      body.onended = () => {
        body.disconnect();
        g.disconnect();
      };
    }
  }
}
export function renderDrums(ctx, destination, track) {
  // Frame automation is sampled onto the same fixed transport lattice used live.
  const clock = new DrumClock(),
    bpm = track.bpm || 100,
    quantum = 60 / bpm / 16;
  let index = 0;
  for (let time = 0; time < track.duration - 1e-7; time += quantum) {
    while (index + 1 < track.events.length && track.events[index + 1].time <= time) index++;
    const frames = track.events[index]?.frame || [];
    const frame = frames.find((f) => f.gain > 0) || { gain: 0 };
    for (const e of clock.schedule(time, time + quantum * 0.01, frame, 0, bpm))
      playDrum(ctx, destination, e);
  }
}
