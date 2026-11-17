import { PRESETS, silentFrame, clamp } from './music.js';

export function createVoice(ctx, destination, instrument = 'keys') {
  const preset = PRESETS[instrument] || PRESETS.keys;
  const filter = ctx.createBiquadFilter();
  filter.type = preset.formant ? 'bandpass' : 'lowpass';
  filter.Q.value = preset.resonance;
  const envelope = ctx.createGain();
  envelope.gain.value = 0;
  filter.connect(envelope).connect(destination);
  const drive = ctx.createGain(),
    shaper = ctx.createWaveShaper();
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 2) / Math.tanh(2);
  }
  shaper.curve = curve;
  shaper.oversample = '2x';
  drive.connect(shaper).connect(filter);
  const extras = [],
    sources = [];
  if (preset.formant) {
    const vowel = ctx.createBiquadFilter(),
      level = ctx.createGain();
    vowel.type = 'bandpass';
    vowel.Q.value = 4;
    level.gain.value = 0.4;
    shaper.connect(vowel).connect(level).connect(envelope);
    extras.push(vowel, level);
  }
  const sub = preset.sub ? ctx.createOscillator() : null;
  if (sub) {
    const level = ctx.createGain();
    level.gain.value = preset.sub;
    sub.type = 'sine';
    sub.connect(level).connect(filter);
    sub.start();
    sources.push(sub);
    extras.push(level);
  }
  if (preset.breath) {
    const breath = ctx.createBufferSource(),
      level = ctx.createGain(),
      buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate),
      samples = buffer.getChannelData(0);
    let seed = 751;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      samples[i] = (seed >>> 0) / 2147483648 - 1;
    }
    breath.buffer = buffer;
    breath.loop = true;
    level.gain.value = preset.breath;
    breath.connect(level).connect(filter);
    breath.start();
    sources.push(breath);
    extras.push(level);
  }

  const oscillators = [ctx.createOscillator(), ctx.createOscillator()],
    blends = [ctx.createGain(), ctx.createGain()];
  oscillators.forEach((o, i) => {
    o.type = i ? preset.b : preset.a;
    o.connect(blends[i]).connect(drive);
    o.start();
  });
  const mod = ctx.createOscillator(),
    fm = ctx.createGain();
  mod.type = 'sine';
  mod.connect(fm).connect(oscillators[0].frequency);
  mod.start();
  const lfo = ctx.createOscillator(),
    vibrato = ctx.createGain();
  lfo.type = preset.lfoType || 'sine';
  lfo.connect(vibrato);
  oscillators.forEach((o) => vibrato.connect(o.detune));
  lfo.start();
  const wah = preset.wah ? ctx.createGain() : null;
  if (wah) {
    lfo.connect(wah).connect(filter.frequency);
    extras.push(wah);
  }
  let lastMidi = null,
    gate = false;
  const target = (param, value, time, smooth = 0.018) => param.setTargetAtTime(value, time, smooth);
  function set(frame, time = ctx.currentTime) {
    const f = frame || silentFrame(),
      spread = clamp(f.spread ?? 0),
      bend = clamp(f.bend ?? 0),
      pinch = clamp(f.pinch ?? 0),
      morph = clamp(f.morph ?? 0.5);
    const frequency = 440 * 2 ** ((f.midi + preset.octave - 69) / 12),
      on = f.gain > 0,
      strike = on && (!gate || lastMidi !== f.midi);
    oscillators.forEach((o, i) => {
      target(
        o.frequency,
        frequency * (i ? (preset.bRatio ?? (instrument === 'bell' ? 2 : 1)) : 1),
        time,
        preset.glide ?? 0.01,
      );
      target(
        o.detune,
        (i ? 1 : -1) * (preset.detune + (instrument === 'pad' ? spread * 35 : 0)),
        time,
      );
    });
    target(mod.frequency, frequency * preset.fm, time, 0.01);
    const defaultAmount =
      instrument === 'bell'
        ? 0.8 + spread * 7
        : instrument === 'lead'
          ? 0.1 + spread * 5
          : instrument === 'bass'
            ? spread * 2.5
            : instrument === 'pad'
              ? spread * 1.5
              : 0.03 + spread * 3;
    const amount =
      preset.fmDepth !== undefined ? (preset.fmBase || 0) + spread * preset.fmDepth : defaultAmount;
    target(fm.gain, frequency * amount, time);
    if (sub) target(sub.frequency, frequency * 0.5, time, preset.glide ?? 0.01);
    target(lfo.frequency, preset.wah ? 1 + spread * 12 : 3 + bend * 14, time);
    target(
      vibrato.gain,
      bend * bend * (preset.vibrato ?? (instrument === 'lead' ? 360 : 180)),
      time,
    );
    target(blends[0].gain, Math.cos((morph * Math.PI) / 2) * 0.35, time);
    target(blends[1].gain, Math.sin((morph * Math.PI) / 2) * 0.35, time);
    target(
      drive.gain,
      instrument === 'bass' || instrument === 'lead' ? 1 + spread * 9 : 1 + spread * 2,
      time,
    );
    const cutoff = preset.formant
      ? 350 + morph * 2400
      : clamp(f.cutoff * (1 + spread * 2), 80, 18000);
    target(filter.frequency, cutoff, time);
    if (preset.formant) target(extras[0].frequency, cutoff * 2.1, time);
    if (wah) target(wah.gain, cutoff * (0.25 + bend * 0.6), time);
    if (preset.filterEnvelope && strike) {
      filter.frequency.cancelScheduledValues(time);
      filter.frequency.setValueAtTime(Math.max(80, cutoff * 0.15), time);
      filter.frequency.exponentialRampToValueAtTime(cutoff, time + 0.12);
    }

    target(filter.Q, preset.resonance + pinch * (instrument === 'bass' ? 21 : 12), time);
    const gain =
      clamp(f.gain, 0, 0.25) * (instrument === 'bass' ? 0.65 : 0.85) * (preset.level || 1);
    if (preset.decay) {
      if (strike) {
        envelope.gain.cancelScheduledValues(time);
        envelope.gain.setValueAtTime(0.0001, time);
        envelope.gain.linearRampToValueAtTime(gain, time + 0.003);
        envelope.gain.exponentialRampToValueAtTime(0.0001, time + preset.decay);
      }
      if (!on && gate) {
        envelope.gain.cancelScheduledValues(time);
        target(envelope.gain, 0, time, 0.012);
      }
    } else target(envelope.gain, gain, time, on ? (preset.attack ?? 0.008) : 0.012);
    gate = on;
    lastMidi = f.midi;
  }
  return {
    set,
    stop(time = ctx.currentTime) {
      [...oscillators, mod, lfo, ...sources].forEach((o) => o.stop(time + 0.08));
      envelope.gain.setTargetAtTime(0, time, 0.008);
      setTimeout(() => {
        [
          ...oscillators,
          ...blends,
          mod,
          fm,
          lfo,
          vibrato,
          drive,
          shaper,
          filter,
          envelope,
          ...sources,
          ...extras,
        ].forEach((n) => n.disconnect());
      }, 120);
    },
  };
}
