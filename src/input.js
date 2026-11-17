import { SnapDetector } from './snap.js';
import { inferenceSize } from './camera-viewport.js';
export class HandCamera {
  constructor(video, onHands, onStatus) {
    this.video = video;
    this.onHands = onHands;
    this.onStatus = onStatus;
    this.generation = 0;
  }
  async start() {
    const generation = ++this.generation;
    this.pending = true;
    try {
      this.onStatus('Asking for camera…');
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error('Camera needs HTTPS or localhost.');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      this.video.srcObject = stream;
      await this.video.play();
      this.onStatus('Loading hand tracker…');
      const worker = new Worker('/tracking/hand-worker.js');
      this.worker = worker;
      const canvas = document.createElement('canvas'),
        size = inferenceSize(this.video.videoWidth, this.video.videoHeight);
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let busy = false,
        last = 0;
      const fail = (message) => {
        if (generation === this.generation) {
          this.stop();
          this.onStatus(message);
        }
      };
      const watchdog = () => {
        clearTimeout(this.watch);
        this.watch = setTimeout(() => fail('Tracker timed out. Try camera again.'), 20000);
      };
      worker.onerror = () => fail('Hand tracker failed. Try camera again.');
      worker.onmessage = ({ data }) => {
        if (generation !== this.generation) return;
        if (data.type === 'error') {
          fail('Tracker unavailable. Try camera again.');
          return;
        }
        if (data.type === 'ready') {
          this.pending = false;
          this.onStatus('Camera on · show an open hand');
          busy = false;
          clearTimeout(this.watch);
          this.ready = true;
        }
        if (data.type === 'result') {
          busy = false;
          clearTimeout(this.watch);
          this.onHands(data.hands);
        }
      };
      watchdog();
      worker.postMessage({ type: 'init' });
      const tick = (time) => {
        if (generation !== this.generation) return;
        if (this.ready && !busy && time - last > 65 && this.video.readyState >= 2) {
          last = time;
          busy = true;
          ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer;
          worker.postMessage(
            { type: 'frame', pixels, width: canvas.width, height: canvas.height, time },
            [pixels],
          );
          watchdog();
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
      stream
        .getVideoTracks()[0]
        .addEventListener('ended', () => fail('Camera disconnected. Try camera again.'));
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      this.onStatus(
        error.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow access and retry.'
          : error.name === 'NotFoundError'
            ? 'No camera found. Use the play pad below.'
            : error.message,
      );
    }
  }
  stop() {
    this.generation++;
    this.pending = false;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.watch);
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.onHands([]);
  }
}
export class SnapMic {
  constructor(onSnap, onLevel) {
    this.onSnap = onSnap;
    this.onLevel = onLevel;
    this.generation = 0;
  }
  async start(ctx) {
    const generation = ++this.generation;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false,
    });
    if (generation !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;
    this.source = ctx.createMediaStreamSource(stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0;
    this.source.connect(this.analyser);
    this.detector = new SnapDetector();
    const samples = new Float32Array(1024),
      spectrum = new Float32Array(512);
    this.timer = setInterval(() => {
      this.analyser.getFloatTimeDomainData(samples);
      this.analyser.getFloatFrequencyData(spectrum);
      const rms = Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length);
      let total = 0,
        high = 0;
      for (let i = 0; i < spectrum.length; i++) {
        const energy = 10 ** (spectrum[i] / 10);
        total += energy;
        if ((i * ctx.sampleRate) / 1024 > 2200) high += energy;
      }
      this.onLevel(rms);
      if (this.detector.feed({ rms, highRatio: high / Math.max(total, 1e-12) }, performance.now()))
        this.onSnap();
    }, 10);
  }
  stop() {
    this.generation++;
    clearInterval(this.timer);
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.onLevel(0);
  }
}
