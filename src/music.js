export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  pentatonic: [0, 3, 5, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};
export const PRESETS = {
  keys: {
    name: 'Electric keys',
    icon: '▥',
    a: 'sine',
    b: 'triangle',
    octave: 0,
    detune: 3,
    resonance: 0.7,
    fm: 2,
    description: 'FM / tine',
  },
  pad: {
    name: 'Space strings',
    icon: '≋',
    a: 'sawtooth',
    b: 'sawtooth',
    octave: 0,
    detune: 16,
    resonance: 1.2,
    fm: 0.5,
    description: 'Detuned / resonant',
  },
  bass: {
    name: 'Acid bass',
    icon: '▂',
    a: 'sawtooth',
    b: 'square',
    octave: -12,
    detune: 0,
    resonance: 4,
    fm: 1,
    description: 'Drive / squelch',
  },
  lead: {
    name: 'Laser lead',
    icon: 'ϟ',
    a: 'square',
    b: 'sawtooth',
    octave: 0,
    detune: 7,
    resonance: 2,
    fm: 3,
    description: 'FM / vibrato',
  },
  bell: {
    name: 'FM bells',
    icon: '♧',
    a: 'sine',
    b: 'sine',
    octave: 12,
    detune: 0,
    resonance: 0.5,
    fm: 2.71,
    description: 'Metallic / inharmonic',
  },
  organ: {
    name: 'Tonewheel organ',
    icon: '▥',
    a: 'sine',
    b: 'sine',
    bRatio: 2,
    octave: 0,
    detune: 0,
    resonance: 0.7,
    fm: 1,
    fmBase: 0,
    fmDepth: 0.5,
    sub: 0.18,
    description: 'Drawbars / rotary',
  },
  chip: {
    name: '8-bit arcade',
    icon: '▧',
    a: 'square',
    b: 'triangle',
    bRatio: 2,
    octave: 0,
    detune: 0,
    resonance: 0.7,
    fm: 4,
    fmBase: 0,
    fmDepth: 0.15,
    glide: 0.001,
    vibrato: 1200,
    lfoType: 'square',
    description: 'Pulse / octave trill',
  },
  theremin: {
    name: 'Theremin',
    icon: '∿',
    a: 'sine',
    b: 'sine',
    bRatio: 2,
    octave: 0,
    detune: 0,
    resonance: 0.5,
    fm: 0.5,
    fmBase: 0,
    fmDepth: 0.6,
    glide: 0.09,
    vibrato: 300,
    attack: 0.035,
    description: 'Glide / vibrato',
  },
  flute: {
    name: 'Breath flute',
    icon: '♮',
    a: 'sine',
    b: 'triangle',
    bRatio: 2,
    octave: 0,
    detune: 2,
    resonance: 0.7,
    fm: 2,
    fmBase: 0.03,
    fmDepth: 0.4,
    breath: 0.1,
    attack: 0.035,
    description: 'Air / harmonics',
  },
  brass: {
    name: 'Synth brass',
    icon: '◁',
    a: 'sawtooth',
    b: 'sawtooth',
    octave: 0,
    detune: 8,
    resonance: 3,
    fm: 1,
    fmBase: 0.03,
    fmDepth: 0.7,
    attack: 0.045,
    filterEnvelope: true,
    description: 'Filter attack / growl',
  },
  marimba: {
    name: 'FM marimba',
    icon: '▤',
    a: 'sine',
    b: 'sine',
    bRatio: 4,
    octave: 0,
    detune: 0,
    resonance: 0.5,
    fm: 3.99,
    fmBase: 1,
    fmDepth: 4,
    decay: 0.38,
    attack: 0.002,
    level: 1.6,
    description: 'Mallet / pluck',
  },
  pluck: {
    name: 'Crystal pluck',
    icon: '◇',
    a: 'triangle',
    b: 'sawtooth',
    bRatio: 2,
    octave: 0,
    detune: 3,
    resonance: 1.2,
    fm: 2,
    fmBase: 0.1,
    fmDepth: 3,
    decay: 0.3,
    attack: 0.002,
    level: 1.6,
    description: 'Short / metallic',
  },
  wobble: {
    name: 'Wobble bass',
    icon: '≈',
    a: 'sawtooth',
    b: 'square',
    octave: -12,
    detune: 4,
    resonance: 6,
    fm: 0.5,
    fmBase: 0,
    fmDepth: 1.7,
    wah: true,
    sub: 0.2,
    description: 'LFO / sub',
  },
  drone: {
    name: 'Deep-space drone',
    icon: '◎',
    a: 'sawtooth',
    b: 'triangle',
    bRatio: 0.5,
    octave: -12,
    detune: 18,
    resonance: 2,
    fm: 0.25,
    fmBase: 0.1,
    fmDepth: 1.4,
    sub: 0.25,
    glide: 0.08,
    attack: 0.08,
    description: 'Sub / evolving',
  },
  choir: {
    name: 'Vowel choir',
    icon: '◌',
    a: 'sawtooth',
    b: 'sine',
    octave: 0,
    detune: 4,
    resonance: 4,
    fm: 1.5,
    fmBase: 0,
    fmDepth: 0.4,
    formant: true,
    attack: 0.04,
    level: 3,
    description: 'Formants / vowels',
  },
  drums: { name: 'Drum machine', icon: '▦', octave: 0, description: 'Kick / snare / hats' },
};
export function pitchAt(x, scale = 'minor', root = 48) {
  const s = SCALES[scale] || SCALES.minor;
  const i = Math.round(clamp(x) * s.length * 2);
  return root + Math.floor(i / s.length) * 12 + s[i % s.length];
}
export function noteName(midi) {
  return (
    ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][((midi % 12) + 12) % 12] +
    (Math.floor(midi / 12) - 1)
  );
}
export const silentFrame = () => ({ midi: 60, cutoff: 1000, morph: 0, gain: 0 });
export function mapHand(p, { scale = 'minor', root = 48, sensitivity = 1.5 } = {}) {
  if (
    !p ||
    p.length !== 21 ||
    p.some(
      (v) => !v || !Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z ?? 0),
    )
  )
    return silentFrame();
  let curl = 0,
    indexCurl = 0;
  for (const b of [5, 9, 13, 17]) {
    const u = [p[b + 1].x - p[b].x, p[b + 1].y - p[b].y, (p[b + 1].z || 0) - (p[b].z || 0)];
    const v = [
      p[b + 3].x - p[b + 2].x,
      p[b + 3].y - p[b + 2].y,
      (p[b + 3].z || 0) - (p[b + 2].z || 0),
    ];
    const fingerCurl =
      Math.acos(
        clamp(
          u.reduce((s, n, i) => s + n * v[i], 0) /
            Math.max(1e-8, Math.hypot(...u) * Math.hypot(...v)),
          -1,
          1,
        ),
      ) / Math.PI;
    curl += fingerCurl / 4;
    if (b === 5) indexCurl = fingerCurl;
  }
  const palm = p[9],
    finger = p[8],
    base = p[5];
  const tilt = Math.atan2(finger.x - base.x, base.y - finger.y);
  const distance = (a, b) =>
    Math.hypot(p[a].x - p[b].x, p[a].y - p[b].y, (p[a].z || 0) - (p[b].z || 0));
  const width = Math.max(0.025, distance(5, 17));
  return {
    midi: pitchAt(1 - palm.x, scale, root),
    cutoff: 220 * Math.pow(50, 1 - clamp(palm.y)),
    morph: clamp(0.5 + (tilt * sensitivity) / 1.3),
    spread: clamp(((distance(8, 20) / width - 0.8) * sensitivity) / 0.95),
    bend: clamp(indexCurl * sensitivity * 1.8),
    pinch: 1 - clamp((distance(4, 8) / width - 0.18) / 1.1),
    x: clamp(1 - palm.x),
    y: clamp(palm.y),
    gain: curl > 0.72 ? 0 : 0.16,
  };
}
