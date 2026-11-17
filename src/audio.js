import { PRESETS, silentFrame } from './music.js';
import { createVoice } from './synth.js';
import { encodeWav } from './wav.js';
export { createVoice } from './synth.js';
export { encodeWav } from './wav.js';
import { loopPhase } from './looper.js';
import { DrumClock, playDrum, renderDrums } from './drums.js';
export const playbackRate = (bufferDuration, musicalDuration) => bufferDuration / musicalDuration;
export async function renderTrack(track, sampleRate = 48000) {
  const length = Math.max(1, Math.round(track.duration * sampleRate)),
    offline = new OfflineAudioContext(1, length, sampleRate);
  if (track.instrument === 'drums') renderDrums(offline, offline.destination, track);
  else {
    const voices = [
      createVoice(offline, offline.destination, track.instrument),
      createVoice(offline, offline.destination, track.instrument),
    ];
    for (const e of track.events)
      voices.forEach((v, i) => v.set(e.frame[i] || silentFrame(), Math.max(0, e.time)));
  }
  const buffer = await offline.startRendering(),
    samples = buffer.getChannelData(0),
    fade = Math.min(240, Math.floor(length / 2));
  for (let i = 0; i < fade; i++) {
    samples[i] *= i / fade;
    samples[length - 1 - i] *= i / fade;
  }
  return buffer;
}
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.live = [];
    this.layers = new Map();
    this.instruments = ['keys', 'bass'];
    this.playing = true;
  }
  async start() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.75;
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -12;
      this.limiter.knee.value = 15;
      this.limiter.ratio.value = 10;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.master.connect(this.limiter).connect(this.analyser).connect(this.ctx.destination);
      this.instruments.forEach((instrument, slot) => this.setInstrument(instrument, slot));
    }
    if (this.playing) await this.ctx.resume();
  }
  setInstrument(instrument, slot = 0) {
    if (!PRESETS[instrument] || ![0, 1].includes(slot)) throw new Error('Invalid hand instrument.');
    this.instruments[slot] = instrument;
    if (!this.ctx) return;
    const old = this.live[slot];
    if (old?.instrument === instrument) return;
    old?.voice?.stop();
    old?.bus.disconnect();
    const bus = this.ctx.createGain();
    bus.connect(this.master);
    this.live[slot] = {
      instrument,
      bus,
      voice: instrument === 'drums' ? null : createVoice(this.ctx, bus, instrument),
      clock: instrument === 'drums' ? new DrumClock() : null,
    };
  }
  setLive(frames, { bpm = 100, origin = 0 } = {}) {
    this.live.forEach((channel, slot) => {
      const frame = frames[slot] || silentFrame();
      if (channel.voice) {
        channel.voice.set(frame);
        return;
      }
      channel.bus.gain.setTargetAtTime(frame.gain > 0 ? 1 : 0, this.ctx.currentTime, 0.008);
      for (const event of channel.clock.schedule(
        this.ctx.currentTime + 0.005,
        this.ctx.currentTime + 0.1,
        frame,
        origin ?? 0,
        bpm,
      ))
        playDrum(this.ctx, channel.bus, event);
    });
  }
  async add(track) {
    const buffer = await renderTrack(track, this.ctx.sampleRate);
    const source = this.ctx.createBufferSource(),
      gain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = playbackRate(buffer.duration, track.duration);
    gain.gain.value = 0;
    source.connect(gain).connect(this.master);
    const start = this.ctx.currentTime + 0.025;
    const offset = loopPhase(start, track.start, track.duration) * source.playbackRate.value;
    source.start(start, Math.min(offset, buffer.duration - 1 / this.ctx.sampleRate));
    gain.gain.setTargetAtTime(track.muted ? 0 : track.volume, start, 0.015);
    const layer = { source, gain, buffer, track };
    this.layers.set(track.id, layer);
    return layer;
  }
  volume(id, volume, muted) {
    const l = this.layers.get(id);
    if (l) {
      l.track.volume = volume;
      l.track.muted = muted;
      l.gain.gain.setTargetAtTime(muted ? 0 : volume, this.ctx.currentTime, 0.015);
    }
  }
  remove(id) {
    const l = this.layers.get(id);
    if (l) {
      l.source.stop();
      l.source.disconnect();
      l.gain.disconnect();
      this.layers.delete(id);
    }
  }
  clear() {
    for (const id of this.layers.keys()) this.remove(id);
  }
  async toggle() {
    this.playing = !this.playing;
    if (this.ctx) await this.ctx[this.playing ? 'resume' : 'suspend']();
    return this.playing;
  }
  async export(seconds) {
    const offline = new OfflineAudioContext(
      2,
      Math.round(seconds * this.ctx.sampleRate),
      this.ctx.sampleRate,
    );
    const limiter = offline.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 15;
    limiter.ratio.value = 10;
    limiter.connect(offline.destination);
    for (const { buffer, track } of this.layers.values()) {
      if (track.muted) continue;
      const source = offline.createBufferSource(),
        gain = offline.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.playbackRate.value = playbackRate(buffer.duration, track.duration);
      gain.gain.value = track.volume * 0.75;
      source.connect(gain).connect(limiter);
      source.start();
    }
    const out = await offline.startRendering();
    return new Blob([encodeWav([out.getChannelData(0), out.getChannelData(1)], out.sampleRate)], {
      type: 'audio/wav',
    });
  }
}
