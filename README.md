# Camera Synth

**Hand Loop** is a local hand-controlled synthesizer, drum machine, and multitrack looper with a retro Macintosh interface. Assign a different instrument to each hand, shape it with finger movements, and record each hand into its own synchronized loop.

## Run locally

Requires **Node.js 20 or newer** and a modern browser with Web Audio and WebAssembly support.

```sh
git clone https://github.com/bananatron/camera-synth.git
cd camera-synth
npm ci
npm run dev
```

Open **http://127.0.0.1:8931**. Start audio, select **Left Hand** or **Right Hand**, choose an instrument, then enable the camera. Camera and microphone data stay on your device. Tracking assets are bundled locally; no cloud inference or API key is needed. Mouse, touch, and keyboard controls also work without a camera.

## Controls

| Input                 | Synth                                       | Drums                                          |
| --------------------- | ------------------------------------------- | ---------------------------------------------- |
| Move sideways         | Pitch, locked to the selected key and scale | Break, electro, or four-on-the-floor pattern   |
| Move vertically       | Filter brightness                           | Half, normal, double, or quadruple session BPM |
| Tilt index finger     | Wave blend                                  | Drum tone                                      |
| Spread fingers        | FM intensity and drive                      | Hi-hat density                                 |
| Bend index finger     | Vibrato                                     | Decay                                          |
| Pinch thumb and index | Resonance                                   | Snare resonance                                |
| Close fist            | Silence                                     | Silence                                        |

Each hand has its own instrument and live readout. Hand identity stays stable when hands cross or the detection order changes. Choose a hand above the instrument palette to edit its assignment or play it with the mouse and keyboard.

- **Mouse/touch:** hold and drag the pad; scroll to change wave shape. Open **Modulation sliders** to simulate finger movements.
- **Keyboard:** Enter sustains; arrows move; W/S change the wave; Escape releases; R starts or closes a recording.
- **Loops:** the first take starts immediately; later takes arm on the next bar. Endings round to the nearest full 4/4 bar, with a one-bar minimum. Each hand that played gets its own loop with the same boundaries. Mute, mix, or delete either loop independently.
- **Finger snaps:** enable Snap control and allow microphone access. Use headphones to keep speaker playback out of the mic. Other sharp noises can also trigger it.
- **Export:** save eight bars of the current mix as a stereo WAV. Sessions live in the current tab; export before closing it. Clear the session to change tempo.

## Instruments

16 choices: electric keys, space strings, acid bass, laser lead, FM bells, tonewheel organ, 8-bit arcade, theremin, breath flute, synth brass, FM marimba, crystal pluck, wobble bass, deep-space drone, vowel choir, and drums.

The pool uses FM synthesis, detuning, sub oscillators, breath noise, filter modulation, vowel formants, and percussive envelopes. Marimba and pluck decay while held and retrigger on pitch changes or reopening a hand. Either hand can play drums independently of the other hand.

## Development

```sh
npm test              # Unit tests
npm run format        # Format app-owned source
npm run check         # Formatting, unit tests, and production build
npm run build         # Write static output to dist/
node scripts/serve.mjs --dist
```

For real browser checks, keep the development server running and open:

- http://127.0.0.1:8931/tests/browser.html — offline audio rendering, all presets, gesture modulation, percussive retriggering, separate hand loops, MediaPipe inference, permission cleanup, mixing, and WAV export.
- http://127.0.0.1:8931/tests/layout.html — mobile and desktop viewport checks.

GitHub Actions runs `npm run check` on pushes and pull requests. Browser checks require a browser and are run separately. Vendored MediaPipe files are excluded from formatting.

## Code map

| Module                                     | Responsibility                                          |
| ------------------------------------------ | ------------------------------------------------------- |
| `src/main.js`                              | App state and UI coordination                           |
| `src/synth.js`, `src/drums.js`             | Synth voices and drum synthesis/sequencing              |
| `src/audio.js`, `src/wav.js`               | Live routing, loop playback/rendering, and WAV encoding |
| `src/looper.js`                            | Bar snapping and separate hand-loop recording           |
| `src/music.js`, `src/hands.js`             | Presets, gesture mapping, and stable hand routing       |
| `src/input.js`, `src/snap.js`              | Camera/microphone lifecycle and snap detection          |
| `src/camera-viewport.js`, `src/visuals.js` | Camera geometry, hand overlays, and waveforms           |
| `src/pad-controls.js`, `src/loop-deck.js`  | Pointer/keyboard controls and loop-deck rendering       |
| `scripts/`                                 | Local static server and build                           |

Recorded gestures render to audio buffers that loop on the Web Audio clock. Playback rate corrects sample rounding so layers retain their musical durations. Camera inference runs in a dedicated worker; live drums and recorded drum layers share the same transport grid.

## Third-party assets

MediaPipe Tasks Vision and the Hand Landmarker model are bundled under `public/tracking/mediapipe/`. See [the tracking notice](public/tracking/NOTICE.txt) and [upstream license](public/tracking/mediapipe/LICENSE). The palm photograph is used only by browser tests; see [its attribution](tests/fixtures/README.txt). Test fixtures are excluded from the production build.
