import { renderTrack, AudioEngine } from '/src/audio.js';
import { PRESETS, silentFrame } from '/src/music.js';
import { LoopRecorder } from '/src/looper.js';
import { HandCamera, SnapMic } from '/src/input.js';
const output = document.getElementById('results');
let passes = 0,
  failures = 0;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
async function check(name, fn) {
  try {
    await fn();
    passes++;
    output.textContent += '\nPASS ' + name;
  } catch (error) {
    failures++;
    output.textContent += '\nFAIL ' + name + ': ' + error.message;
  }
}
const frame = { midi: 60, cutoff: 8000, morph: 0.5, gain: 0.2 };
const track = {
  id: 1,
  instrument: 'keys',
  duration: 1,
  start: 0,
  volume: 0.8,
  muted: false,
  events: [
    { time: 0, frame: [frame] },
    { time: 0.5, frame: [silentFrame()] },
  ],
};
document.getElementById('run').onclick = async () => {
  document.getElementById('run').disabled = true;
  output.textContent = 'Running…';
  await check(
    'expanded instrument pool renders distinct audio with a quiet release and click-free seam',
    async () => {
      const fingerprints = [];
      assert(Object.keys(PRESETS).length >= 16, 'instrument pool has not expanded');
      for (const instrument of Object.keys(PRESETS).filter((k) => k !== 'drums')) {
        const buffer = await renderTrack({ ...track, instrument });
        const s = buffer.getChannelData(0);
        assert(buffer.length === 48000, 'wrong buffer length');
        assert(s.every(Number.isFinite), 'invalid sample');
        const rms = (a, b) => Math.sqrt(s.slice(a, b).reduce((sum, v) => sum + v * v, 0) / (b - a));
        assert(
          (PRESETS[instrument].decay ? rms(480, 7200) : rms(4000, 20000)) > 0.008,
          instrument + ' silent',
        );
        assert(rms(40000, 47000) < 0.0001, instrument + ' stuck note');
        assert(s[0] === 0 && s.at(-1) === 0, 'loop seam clicks');
        fingerprints.push(s[10000]);
      }
      assert(
        new Set(fingerprints.map((n) => n.toFixed(5))).size === Object.keys(PRESETS).length - 1,
        'presets sound identical',
      );
    },
  );
  await check(
    'finger spread and bend audibly change every synth at fixed hand position',
    async () => {
      for (const instrument of Object.keys(PRESETS).filter((k) => k !== 'drums')) {
        const base = { ...frame, spread: 0, bend: 0, pinch: 0 };
        const a = await renderTrack({ ...track, instrument, events: [{ time: 0, frame: [base] }] });
        const b = await renderTrack({
          ...track,
          instrument,
          events: [{ time: 0, frame: [{ ...base, spread: 1, bend: 1, pinch: 1 }] }],
        });
        const x = a.getChannelData(0),
          y = b.getChannelData(0);
        let delta = 0;
        const start = PRESETS[instrument].decay ? 480 : 5000,
          end = PRESETS[instrument].decay ? 7200 : 40000;
        for (let i = start; i < end; i++) delta += (x[i] - y[i]) ** 2;
        assert(Math.sqrt(delta / (end - start)) > 0.02, instrument + ' finger effect too weak');
      }
    },
  );
  await check('drum tracks render kick/snare/hats and height changes beat density', async () => {
    const f = { ...frame, spread: 0.5, morph: 0.5, pattern: 0, rate: 50 };
    const a = await renderTrack({
      ...track,
      instrument: 'drums',
      bpm: 100,
      duration: 4.8,
      events: [{ time: 0, frame: [f] }],
    });
    const b = await renderTrack({
      ...track,
      instrument: 'drums',
      bpm: 100,
      duration: 4.8,
      events: [{ time: 0, frame: [{ ...f, rate: 200 }] }],
    });
    const energy = (b) => b.getChannelData(0).reduce((sum, v) => sum + v * v, 0);
    assert(energy(a) > 10, 'drums silent');
    assert(energy(b) > energy(a) * 1.8, 'height does not increase beat density');
  });
  await check('a second hand contributes audio and missing hands stay silent', async () => {
    const one = await renderTrack({ ...track, events: [{ time: 0, frame: [frame] }] });
    const two = await renderTrack({ ...track, events: [{ time: 0, frame: [frame, frame] }] });
    const silence = await renderTrack({ ...track, events: [{ time: 0, frame: [] }] });
    const energy = (b) => b.getChannelData(0).reduce((sum, v) => sum + v * v, 0);
    assert(energy(two) > energy(one) * 3.9, 'second voice missing');
    assert(energy(silence) === 0, 'missing hands audible');
  });
  await check('percussive synths decay while held and retrigger when pitch changes', async () => {
    for (const instrument of ['marimba', 'pluck']) {
      const f = { ...frame, spread: 0.4 };
      const buffer = await renderTrack({
        ...track,
        duration: 1.4,
        instrument,
        events: [
          { time: 0, frame: [f] },
          { time: 0.7, frame: [{ ...f, midi: 67 }] },
        ],
      });
      const x = buffer.getChannelData(0);
      const rms = (start, end) => {
        const a = x.slice(Math.floor(start * 48000), Math.floor(end * 48000));
        return Math.sqrt(a.reduce((sum, v) => sum + v * v, 0) / a.length);
      };
      assert(rms(0.45, 0.6) < rms(0.03, 0.15) * 0.3, instrument + ' does not decay');
      assert(rms(0.73, 0.85) > rms(0.45, 0.6) * 3, instrument + ' does not retrigger');
    }
  });
  await check(
    'live hand instruments and drum clocks remain independent when either assignment changes',
    async () => {
      const engine = new AudioEngine();
      await engine.start();
      try {
        engine.setInstrument('bell', 1);
        const right = engine.live[1];
        engine.setInstrument('drums', 0);
        assert(engine.live[1] === right, 'changing left replaced right');
        assert(
          engine.live[0].instrument === 'drums' && engine.live[1].instrument === 'bell',
          'wrong assignments',
        );
        let rightFrame;
        const original = right.voice.set;
        right.voice.set = (f) => {
          rightFrame = f;
          original(f);
        };
        engine.setLive([{ ...frame, rate: 100, pattern: 0 }, silentFrame()], {
          bpm: 100,
          origin: 0,
        });
        assert(rightFrame.gain === 0, 'left input leaked into right');
        engine.setInstrument('drums', 1);
        assert(engine.live[0].clock !== engine.live[1].clock, 'drum clocks are shared');
      } finally {
        await engine.ctx.close();
      }
    },
  );
  await check(
    'one take renders two independently mutable hand loops with different instruments',
    async () => {
      const r = new LoopRecorder(120),
        left = { ...frame, midi: 48 },
        right = { ...frame, midi: 72 };
      r.begin(0, ['bass', 'bell'], [left, right]);
      r.capture(0.5, [silentFrame(), right]);
      r.requestEnd(2);
      const tracks = r.finish(2);
      assert(
        tracks.length === 2 && tracks[0].hand === 'Left' && tracks[1].hand === 'Right',
        'hand tracks missing',
      );
      const [a, b] = await Promise.all(tracks.map((t) => renderTrack(t)));
      const x = a.getChannelData(0),
        y = b.getChannelData(0);
      assert(
        x.some((v) => Math.abs(v) > 0.01) && y.some((v) => Math.abs(v) > 0.01),
        'hand audio missing',
      );
      const tail = x.slice(48000);
      assert(
        tail.every((v) => Math.abs(v) < 0.001),
        'right hand leaked into released left loop',
      );
      assert(
        y.slice(48000).some((v) => Math.abs(v) > 0.01),
        'left release muted right loop',
      );
      tracks[0].muted = true;
      assert(!tracks[1].muted, 'mute leaked between hands');
    },
  );
  await check(
    'actual reused MediaPipe worker loads local WASM/model and recognizes a palm photograph',
    async () => {
      const img = new Image();
      img.src = '/tests/fixtures/palm.jpg';
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      canvas.getContext('2d').drawImage(img, 0, 0, 320, 240);
      const pixels = canvas.getContext('2d').getImageData(0, 0, 320, 240).data.buffer;
      const worker = new Worker('/tracking/hand-worker.js');
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('worker timeout')), 25000);
          worker.onerror = (e) => {
            clearTimeout(timeout);
            reject(new Error(e.message));
          };
          worker.onmessage = ({ data }) => {
            if (data.type === 'error') {
              clearTimeout(timeout);
              reject(new Error(data.message));
            }
            if (data.type === 'ready')
              worker.postMessage(
                { type: 'frame', pixels, width: 320, height: 240, time: performance.now() },
                [pixels],
              );
            if (data.type === 'result') {
              clearTimeout(timeout);
              data.hands[0]?.points.length === 21
                ? resolve()
                : reject(new Error('palm not detected'));
            }
          };
          worker.postMessage({ type: 'init' });
        });
      } finally {
        worker.terminate();
      }
    },
  );
  await check(
    'camera permission failure reports a useful message and leaves no worker or stream',
    async () => {
      const original = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException('denied', 'NotAllowedError');
      };
      let message = '';
      try {
        const camera = new HandCamera(
          document.createElement('video'),
          () => {},
          (m) => (message = m),
        );
        await camera.start();
        assert(message.includes('permission denied'), 'no useful error');
        assert(!camera.stream && !camera.worker, 'leaked resources');
      } finally {
        navigator.mediaDevices.getUserMedia = original;
      }
    },
  );
  await check('cancelled camera request releases its late-arriving stream', async () => {
    const original = navigator.mediaDevices.getUserMedia;
    let resolve,
      stopped = false;
    navigator.mediaDevices.getUserMedia = () => new Promise((r) => (resolve = r));
    try {
      const camera = new HandCamera(
        document.createElement('video'),
        () => {},
        () => {},
      );
      const pending = camera.start();
      camera.stop();
      resolve({
        getTracks: () => [
          {
            stop() {
              stopped = true;
            },
          },
        ],
      });
      await pending;
      assert(stopped && !camera.stream, 'late camera stream leaked');
    } finally {
      navigator.mediaDevices.getUserMedia = original;
    }
  });
  await check('cancelled microphone request releases its late-arriving stream', async () => {
    const original = navigator.mediaDevices.getUserMedia;
    let resolve,
      stopped = false;
    navigator.mediaDevices.getUserMedia = () => new Promise((r) => (resolve = r));
    try {
      const mic = new SnapMic(
        () => {},
        () => {},
      );
      const pending = mic.start({});
      mic.stop();
      resolve({
        getTracks: () => [
          {
            stop() {
              stopped = true;
            },
          },
        ],
      });
      await pending;
      assert(stopped && !mic.stream, 'late microphone stream leaked');
    } finally {
      navigator.mediaDevices.getUserMedia = original;
    }
  });
  await check(
    'mixed-length layers loop with musical rate correction, mute, deletion, and valid WAV export',
    async () => {
      const engine = new AudioEngine();
      await engine.start();
      try {
        const t = { ...track, duration: 240 / 137, start: engine.ctx.currentTime };
        await engine.add(t);
        await engine.add({ ...t, id: 2, duration: t.duration * 2 });
        const layer = engine.layers.get(1);
        assert(
          Math.abs(layer.buffer.duration / layer.source.playbackRate.value - t.duration) < 1e-6,
          'duration drift',
        );
        assert(layer.source.loop && engine.layers.size === 2, 'loop sources missing');
        engine.volume(1, 0.4, true);
        assert(layer.track.muted, 'mute state missing');
        const wav = await engine.export(0.2);
        assert(wav.type === 'audio/wav' && wav.size > 1000, 'empty export');
        engine.remove(1);
        assert(engine.layers.size === 1, 'delete failed');
        engine.clear();
        assert(engine.layers.size === 0, 'clear failed');
      } finally {
        await engine.ctx.close();
      }
    },
  );
  output.textContent += '\n\n' + passes + ' passed, ' + failures + ' failed';
  document.title = failures ? 'FAIL — Hand Loop checks' : 'PASS — Hand Loop checks';
};
