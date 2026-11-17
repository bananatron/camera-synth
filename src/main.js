import { drawHands } from './visuals.js';
import { setupPlayPad } from './pad-controls.js';
import { renderLoopDeck } from './loop-deck.js';
import { PRESETS, mapHand, pitchAt, noteName, clamp } from './music.js';
import { LoopRecorder, barSeconds, loopPhase } from './looper.js';
import { AudioEngine } from './audio.js';
import { drumRate } from './drums.js';
import { cameraViewport, projectCameraPoint } from './camera-viewport.js';
import { HandCamera, SnapMic } from './input.js';
import { HANDS, routeHands } from './hands.js';
const $ = (id) => document.getElementById(id);
const engine = new AudioEngine(),
  recorder = new LoopRecorder(100);
const instruments = ['keys', 'bass'];
let selectedHand = 0,
  instrument = instruments[0],
  hands = [],
  handsAt = -Infinity,
  mouse = { x: 0.5, y: 0.5, morph: 0.35, on: false },
  frames = [],
  cameraWanted = false,
  micWanted = false,
  recordBusy = false,
  rendering = 0;
const status = (message) => {
  $('status').textContent = message;
};
const settings = () => ({
  root: Number($('root').value),
  scale: $('scale').value,
  sensitivity: Number($('sensitivity').value),
});
const camera = new HandCamera(
  $('video'),
  (detected) => {
    hands = detected;
    handsAt = performance.now();
  },
  (message) => {
    $('camera-state').textContent = message.toUpperCase();
    $('camera-dot').classList.toggle('on', !!camera.stream);
    if (!camera.stream && !camera.pending) {
      cameraWanted = false;
      $('camera').textContent = '▣ Camera';
    }
    status(message);
  },
);
const mic = new SnapMic(
  () => {
    if (!engine.playing) return;
    status('Snap heard!');
    $('snap').classList.add('heard');
    setTimeout(() => $('snap').classList.remove('heard'), 200);
    void record();
  },
  (rms) => {
    $('mic-status').textContent = micWanted
      ? 'MIC LISTENING ' + '▮'.repeat(Math.min(10, Math.ceil(rms * 50))) + ' · USE HEADPHONES'
      : 'MIC OFF';
  },
);
function renderInstruments() {
  $('hand-targets').innerHTML = HANDS.map(
    (hand, slot) =>
      `<button data-hand="${slot}" aria-pressed="${slot === selectedHand}" aria-label="Edit ${hand.toLowerCase()}-hand instrument: ${PRESETS[instruments[slot]].name}"><span>${hand.toUpperCase()} HAND</span><b>${PRESETS[instruments[slot]].name}</b></button>`,
  ).join('');
  const scroll = $('instruments').scrollTop;
  $('instruments').innerHTML = Object.entries(PRESETS)
    .map(
      ([key, p]) =>
        `<button class="instrument" data-instrument="${key}" aria-pressed="${key === instrument}" ${recorder.active ? 'disabled' : ''}><span class="instrument-icon" aria-hidden="true">${p.icon}</span><span><b>${p.name}</b></span><span class="check" aria-hidden="true">${key === instrument ? '✓' : ''}</span></button>`,
    )
    .join('');
  $('instruments').scrollTop = scroll;
}
$('instruments').addEventListener('click', (event) => {
  const button = event.target.closest('[data-instrument]');
  if (!button || recorder.active) return;
  instrument = button.dataset.instrument;
  instruments[selectedHand] = instrument;
  engine.setInstrument(instrument, selectedHand);
  renderInstruments();
  updateMode();
  status(PRESETS[instrument].name);
});
renderInstruments();
$('hand-targets').onclick = (event) => {
  const button = event.target.closest('[data-hand]');
  if (!button) return;
  selectedHand = Number(button.dataset.hand);
  instrument = instruments[selectedHand];
  renderInstruments();
  updateMode();
};
function updateMode() {
  const drums = instrument === 'drums';
  $('play-label').textContent =
    HANDS[selectedHand].toUpperCase() + (drums ? ' / DRUMS' : ' / SYNTH');
  $('axis-top').textContent = drums ? '4× BPM ↑' : 'FILTER ↑';
  $('axis-bottom').textContent = drums ? '↓ ½× BPM' : '↓ FILTER';
  $('axis-left').textContent = drums ? 'BREAK' : 'LOW NOTE';
  $('axis-right').textContent = drums ? '4 / FLOOR' : 'HIGH NOTE';
  $('note-label').textContent = drums ? 'PATTERN' : 'NOTE';
  $('brightness-label').textContent = drums ? 'DRUM RATE' : 'FILTER';
  $('spread-label').textContent = drums ? 'SPREAD / HATS' : 'SPREAD / FM';
  $('bend-label').textContent = drums ? 'BEND / DECAY' : 'BEND / VIBRATO';
  $('root').disabled = drums;
  $('scale').disabled = drums;
}
updateMode();
$('sensitivity').oninput = () => {
  $('sensitivity-value').textContent = Number($('sensitivity').value).toFixed(1) + '×';
};
async function startAudio() {
  try {
    await engine.start();
    engine.master.gain.value = Number($('master').value);
    $('power').textContent = '◉ Audio on';
    $('power').disabled = true;
    $('pause').disabled = false;
    $('record').disabled = false;
    $('snap').disabled = false;
    $('audio-dot').classList.add('on');
    status('Audio on');
  } catch (error) {
    status('Could not start audio: ' + error.message);
    throw error;
  }
}
$('power').onclick = () => void startAudio().catch(() => {});
$('pause').onclick = async () => {
  const playing = await engine.toggle();
  $('pause').textContent = playing ? 'Ⅱ Pause' : '▶ Resume';
  $('audio-dot').classList.toggle('on', playing);
  status(playing ? 'Session resumed.' : 'Session paused. Resume to keep playing.');
};
$('master').oninput = () => {
  if (engine.master)
    engine.master.gain.setTargetAtTime(Number($('master').value), engine.ctx.currentTime, 0.015);
};
$('bpm').onchange = () => {
  try {
    recorder.setTempo(Number($('bpm').value));
    status('Tempo set to ' + recorder.bpm + ' BPM.');
  } catch (error) {
    $('bpm').value = recorder.bpm;
    status(error.message);
  }
};
$('camera').onclick = async () => {
  if (cameraWanted) {
    cameraWanted = false;
    camera.stop();
    $('camera').textContent = '▣ Camera';
    $('camera-state').textContent = 'MOUSE / KEYBOARD';
    $('camera-dot').classList.remove('on');
    status('Camera off');
    return;
  }
  cameraWanted = true;
  $('camera').textContent = '▣ Stop camera';
  try {
    await startAudio();
    if (cameraWanted) await camera.start();
  } catch {
    cameraWanted = false;
    $('camera').textContent = '▣ Camera';
  }
};
$('snap').onclick = async () => {
  if (micWanted) {
    micWanted = false;
    mic.stop();
    $('snap').setAttribute('aria-pressed', 'false');
    $('snap').textContent = 'ϟ Snap control';
    status('Snap control off.');
    return;
  }
  micWanted = true;
  $('snap').textContent = 'ϟ Cancel mic';
  $('snap').setAttribute('aria-pressed', 'true');
  status('Allow microphone access for snap control.');
  try {
    await startAudio();
    if (!micWanted) return;
    await mic.start(engine.ctx);
    if (!micWanted) return;
    $('snap').textContent = 'ϟ Snap listening';
    status('Snap to start or close a loop. Use headphones.');
  } catch (error) {
    micWanted = false;
    mic.stop();
    $('snap').setAttribute('aria-pressed', 'false');
    $('snap').textContent = 'ϟ Snap control';
    status(
      error.name === 'NotAllowedError'
        ? 'Microphone permission denied. Allow access and retry.'
        : 'Microphone unavailable. You can still use Record.',
    );
  }
};
function lockControls() {
  const locked = !!recorder.active || recorder.tracks.length > 0;
  $('bpm').disabled = locked;
  $('cancel').hidden = !recorder.active;
  $('clear').disabled = !locked;
  $('export').disabled = engine.layers.size === 0 || rendering > 0;
  renderInstruments();
}
async function record() {
  if (recordBusy) return;
  recordBusy = true;
  try {
    if (!engine.ctx) await startAudio();
    if (!engine.playing) {
      await engine.toggle();
      $('pause').textContent = 'Ⅱ Pause';
      $('audio-dot').classList.add('on');
    }
    const now = engine.ctx.currentTime;
    if (!recorder.active) {
      const start = recorder.begin(now, instruments, frames);
      status(
        start > now + 0.03
          ? 'Armed. Recording starts on the next bar.'
          : 'Recording. Play a phrase, then close your loop.',
      );
    } else if (recorder.active.end === null) {
      const end = recorder.requestEnd(now);
      status(end > now ? 'Closing on the nearest bar…' : 'Loop snapped to the nearest bar.');
    }
    lockControls();
  } catch (error) {
    status(error.message);
  } finally {
    recordBusy = false;
  }
}
$('record').onclick = () => void record();
$('cancel').onclick = () => {
  recorder.cancel();
  $('record').classList.remove('is-recording');
  $('record-label').textContent = 'Record';
  $('record').disabled = false;
  lockControls();
  status('Recording cancelled.');
};
function clearSession() {
  recorder.clear();
  engine.clear();
  renderTracks();
  lockControls();
  $('record-label').textContent = 'Record';
  $('record').disabled = false;
  $('record').classList.remove('is-recording');
  status('Cleared');
}
$('clear').onclick = () => {
  if (recorder.tracks.length > 0) {
    $('clear').textContent = 'Clear all?';
    $('clear').onclick = () => {
      clearSession();
      $('clear').textContent = 'Clear session';
      $('clear').onclick = clearHandler;
    };
    setTimeout(() => {
      $('clear').textContent = 'Clear session';
      $('clear').onclick = clearHandler;
    }, 3500);
  } else clearSession();
};
const clearHandler = $('clear').onclick;
function renderTracks() {
  $('track-count').textContent = recorder.tracks.length;
  renderLoopDeck($('tracks'), recorder.tracks, engine.layers);
}
$('tracks').onclick = (event) => {
  const b = event.target.closest('button');
  if (!b) return;
  if (b.dataset.delete) {
    const id = Number(b.dataset.delete);
    recorder.remove(id);
    engine.remove(id);
    renderTracks();
    lockControls();
    status('Loop removed.');
  }
  if (b.dataset.mute) {
    const t = recorder.tracks.find((t) => t.id === Number(b.dataset.mute));
    t.muted = !t.muted;
    engine.volume(t.id, t.volume, t.muted);
    renderTracks();
  }
};
$('tracks').oninput = (event) => {
  const id = Number(event.target.dataset.volume),
    t = recorder.tracks.find((t) => t.id === id);
  if (t) {
    t.volume = Number(event.target.value);
    engine.volume(t.id, t.volume, t.muted);
  }
};
$('export').onclick = async () => {
  $('export').disabled = true;
  $('export').textContent = 'Rendering…';
  status('Exporting 8 bars of your current mix…');
  try {
    const blob = await engine.export(barSeconds(recorder.bpm) * 8);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hand-loop-' + recorder.bpm + 'bpm.wav';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    status('Exported 8 bars of your mix as WAV.');
  } catch (error) {
    status('Export failed: ' + error.message);
  } finally {
    $('export').textContent = '↧ Export WAV';
    lockControls();
  }
};
const pad = $('playpad');
setupPlayPad({
  pad,
  mouse,
  startAudio: () => (engine.ctx ? Promise.resolve() : startAudio()),
  record,
  isHelpOpen: () => $('help-dialog').open,
});
$('help').onclick = () => $('help-dialog').showModal();
$('close-help').onclick = $('got-it').onclick = () => $('help-dialog').close();
let lastDraw = 0;
async function commit(track) {
  rendering++;
  renderTracks();
  lockControls();
  try {
    await engine.add(track);
    if (!recorder.tracks.includes(track)) engine.remove(track.id);
    else status(track.hand + ' · ' + PRESETS[track.instrument].name + ' loop playing');
  } catch (error) {
    recorder.remove(track.id);
    status('Could not render the loop: ' + error.message);
  } finally {
    rendering--;
    renderTracks();
    lockControls();
  }
}
setInterval(() => {
  const now = engine.ctx?.currentTime || 0,
    perf = performance.now();
  if (perf - handsAt > 350) hands = [];
  const viewport = cameraViewport(
    pad.clientWidth,
    pad.clientHeight,
    $('video').videoWidth,
    $('video').videoHeight,
  );
  frames = routeHands(hands, (h) => {
    const frame = mapHand(h.points, settings()),
      point = projectCameraPoint(h.points[9], viewport);
    frame.x = clamp(point.x / Math.max(1, pad.clientWidth));
    frame.y = clamp(point.y / Math.max(1, pad.clientHeight));
    frame.midi = pitchAt(frame.x, settings().scale, settings().root);
    frame.cutoff = 220 * 50 ** (1 - frame.y);
    return frame;
  });
  if (mouse.on)
    frames[selectedHand] = {
      midi: pitchAt(mouse.x, settings().scale, settings().root),
      cutoff: 180 * 55 ** (1 - mouse.y),
      morph: mouse.morph,
      spread: Number($('spread-control').value),
      bend: Number($('bend-control').value),
      pinch: Number($('pinch-control').value),
      x: mouse.x,
      y: mouse.y,
      gain: 0.16,
    };
  frames = frames.map((frame, slot) =>
    instruments[slot] === 'drums'
      ? {
          ...frame,
          rate: drumRate(frame.y ?? 0.5, recorder.bpm),
          pattern: Math.min(2, Math.floor((frame.x ?? 0.5) * 3)),
        }
      : frame,
  );
  if (engine.ctx?.state === 'running') {
    engine.setLive(frames, { bpm: recorder.bpm, origin: recorder.origin });
    recorder.capture(now, frames);
    const tracks = recorder.finish(now);
    if (tracks !== null) {
      lockControls();
      if (tracks.length) tracks.forEach((track) => void commit(track));
      else status('Silent take discarded');
    }
  }
  const a = recorder.active,
    bar = barSeconds(recorder.bpm);
  $('record').classList.toggle('is-recording', !!a && now >= a.start);
  $('record').disabled = !engine.ctx || (!!a && a.end !== null);
  $('record-label').textContent = a
    ? now < a.start
      ? 'Armed…'
      : a.end !== null
        ? 'Closing loop…'
        : 'Close & loop'
    : 'Record';
  if (a) {
    $('loop-status').textContent =
      now < a.start
        ? `Recording in ${(a.start - now).toFixed(1)}s · starts on the next bar`
        : `${a.end !== null ? 'Closing' : 'Recording'} · ${Math.max(0, (now - a.start) / bar).toFixed(1)} bars · ${a.instruments.map((key) => PRESETS[key].name).join(' / ')}`;
  } else $('loop-status').textContent = recorder.tracks.length ? 'Playing' : 'Idle';
  const f = frames[selectedHand]?.gain > 0 ? frames[selectedHand] : null;
  frames.forEach((frame, slot) => {
    $(slot === 0 ? 'left-monitor' : 'right-monitor').textContent =
      (slot === 0 ? 'L · ' : 'R · ') +
      PRESETS[instruments[slot]].name +
      ' · ' +
      (frame.gain > 0
        ? instruments[slot] === 'drums'
          ? frame.rate + ' BPM'
          : noteName(frame.midi + PRESETS[instruments[slot]].octave)
        : '—');
  });
  $('note').textContent = f
    ? instrument === 'drums'
      ? ['BREAK', 'ELECTRO', '4 / FLOOR'][f.pattern]
      : noteName(f.midi + PRESETS[instrument].octave)
    : '—';
  $('brightness').textContent = f
    ? instrument === 'drums'
      ? f.rate + ' BPM'
      : f.cutoff >= 1000
        ? (f.cutoff / 1000).toFixed(1) + 'k'
        : Math.round(f.cutoff) + ' Hz'
    : '—';
  for (const key of ['spread', 'bend', 'pinch']) {
    const value = f?.[key] || 0;
    $(key + '-meter').value = value;
    $(key + '-value').textContent = Math.round(value * 100) + '%';
  }
  $('wave').textContent = f ? Math.round(f.morph * 100) + '%' : '—';
  $('hand-count').textContent = hands.length + ' / 2';
  $('pad-welcome').hidden = hands.length > 0 || mouse.on || !!camera.stream;
  $('cursor').hidden = !mouse.on;
  $('cursor').style.left = mouse.x * 100 + '%';
  $('cursor').style.top = mouse.y * 100 + '%';
  const elapsed = recorder.origin === null ? 0 : Math.max(0, now - recorder.origin);
  $('session-time').textContent =
    String(Math.floor(elapsed / 60)).padStart(2, '0') +
    ':' +
    String(Math.floor(elapsed % 60)).padStart(2, '0');
  document
    .querySelectorAll('.beats i')
    .forEach((el, i) =>
      el.classList.toggle(
        'active',
        recorder.origin !== null && Math.floor(elapsed / (60 / recorder.bpm)) % 4 === i,
      ),
    );
  for (const t of recorder.tracks) {
    const el = document.querySelector(`[data-progress="${t.id}"]`);
    if (el) el.style.left = (loopPhase(now, t.start, t.duration) / t.duration) * 100 + '%';
  }
  if (perf - lastDraw > 70) {
    lastDraw = perf;
    drawHands($('hands'), hands, instruments, $('video'));
    const canvas = $('scope'),
      c = canvas.getContext('2d');
    c.fillStyle = '#dbe2ca';
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = '#81976a';
    c.lineWidth = 1;
    const data = new Uint8Array(1024);
    if (engine.analyser) engine.analyser.getByteTimeDomainData(data);
    else data.fill(128);
    c.beginPath();
    for (let x = 0; x < canvas.width; x++) {
      const y = (data[Math.floor((x / canvas.width) * 1024)] / 128 - 1) * 25 + 30;
      x ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
}, 30);
setInterval(() => {
  $('clock').textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}, 1000);
window.addEventListener('pagehide', () => {
  camera.stop();
  mic.stop();
  engine.ctx?.close();
});
