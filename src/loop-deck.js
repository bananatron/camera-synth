import { PRESETS } from './music.js';
import { drawWave } from './visuals.js';

export function renderLoopDeck(container, tracks, layers) {
  if (!tracks.length) {
    container.innerHTML = '<div class="empty-tracks">No loops</div>';
    return;
  }
  container.innerHTML = tracks
    .map(
      (t, i) =>
        `<div class="track ${t.muted ? 'muted' : ''}" data-track="${t.id}"><span class="track-number">${String(i + 1).padStart(2, '0')}</span><div class="track-name"><b>${t.hand} · ${PRESETS[t.instrument].name}</b><small>${t.bars} ${t.bars === 1 ? 'BAR' : 'BARS'} · ${t.duration.toFixed(1)}s${layers.has(t.id) ? '' : ' · RENDERING'}</small></div><div class="track-wave"><canvas width="600" height="64" data-wave="${t.id}" aria-label="Recorded waveform"></canvas><i class="track-progress" data-progress="${t.id}"></i></div><button data-mute="${t.id}" aria-pressed="${t.muted}" aria-label="${t.muted ? 'Unmute' : 'Mute'} track ${i + 1}">${t.muted ? 'M' : '♫'}</button><input type="range" min="0" max="1" step=".01" value="${t.volume}" data-volume="${t.id}" aria-label="Track ${i + 1} volume"><button data-delete="${t.id}" aria-label="Delete track ${i + 1}">×</button></div>`,
    )
    .join('');
  for (const t of tracks) {
    const buffer = layers.get(t.id)?.buffer;
    if (buffer)
      drawWave(container.querySelector(`[data-wave="${t.id}"]`), buffer.getChannelData(0));
  }
}
