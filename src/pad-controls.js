import { clamp } from './music.js';

export function setupPlayPad({ pad, mouse, startAudio, record, isHelpOpen }) {
  function movePointer(event) {
    const r = pad.getBoundingClientRect();
    mouse.x = clamp((event.clientX - r.left) / r.width);
    mouse.y = clamp((event.clientY - r.top) / r.height);
  }
  pad.onpointerdown = (event) => {
    if (event.button !== 0) return;
    pad.focus();
    movePointer(event);
    mouse.on = true;
    pad.setPointerCapture(event.pointerId);
    void startAudio().catch(() => {});
  };
  pad.onpointermove = (event) => {
    if (pad.hasPointerCapture(event.pointerId)) movePointer(event);
  };
  pad.onpointerup = pad.onpointercancel = () => {
    mouse.on = false;
  };
  pad.onlostpointercapture = () => {
    mouse.on = false;
  };
  pad.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      mouse.morph = clamp(mouse.morph - event.deltaY * 0.002);
    },
    { passive: false },
  );
  pad.onkeydown = (event) => {
    if (
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Enter',
        'w',
        's',
        'W',
        'S',
        'Escape',
      ].includes(event.key)
    )
      event.preventDefault();
    else return;
    if (event.key === 'Enter') {
      mouse.on = !mouse.on;
      void startAudio().catch(() => {});
    }
    if (event.key === 'Escape') mouse.on = false;
    if (event.key === 'ArrowLeft') mouse.x = clamp(mouse.x - 0.04);
    if (event.key === 'ArrowRight') mouse.x = clamp(mouse.x + 0.04);
    if (event.key === 'ArrowUp') mouse.y = clamp(mouse.y - 0.06);
    if (event.key === 'ArrowDown') mouse.y = clamp(mouse.y + 0.06);
    if (event.key.toLowerCase() === 'w') mouse.morph = clamp(mouse.morph + 0.08);
    if (event.key.toLowerCase() === 's') mouse.morph = clamp(mouse.morph - 0.08);
  };
  window.addEventListener('blur', () => {
    mouse.on = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      mouse.on = false;
      return;
    }
    if (
      event.key.toLowerCase() === 'r' &&
      !event.repeat &&
      !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) &&
      !isHelpOpen()
    ) {
      event.preventDefault();
      void record();
    }
  });
}
