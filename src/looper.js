import { silentFrame } from './music.js';
import { HANDS } from './hands.js';
export const barSeconds = (bpm) => 240 / bpm;
export const nextBoundary = (time, origin, unit) =>
  origin + Math.ceil((time - origin - 1e-7) / unit) * unit;
export const loopPhase = (time, origin, duration) =>
  (((time - origin) % duration) + duration) % duration;
const clone = (x) => structuredClone(x);
export class LoopRecorder {
  constructor(bpm = 100) {
    this.bpm = bpm;
    this.origin = null;
    this.active = null;
    this.tracks = [];
    this.serial = 0;
    this.takeSerial = 0;
  }
  setTempo(bpm) {
    if (!Number.isFinite(bpm) || bpm < 40 || bpm > 240)
      throw new Error('Choose a tempo from 40 to 240 BPM.');
    if (this.active || this.tracks.length) throw new Error('Clear the session to change tempo.');
    this.bpm = bpm;
  }
  begin(now, instruments, frame) {
    if (this.active) throw new Error('A recording is already active.');
    if (!Array.isArray(instruments) || instruments.length !== 2)
      throw new Error('Choose an instrument for each hand.');
    if (this.origin === null) this.origin = now;
    const start = this.tracks.length ? nextBoundary(now, this.origin, barSeconds(this.bpm)) : now;
    this.active = {
      start,
      instruments: [...instruments],
      events: [{ time: 0, frame: clone(frame) }],
      end: null,
    };
    return start;
  }
  capture(now, frame) {
    const a = this.active;
    if (!a || (a.end !== null && now > a.end)) return;
    if (now < a.start) {
      a.events[0] = { time: 0, frame: clone(frame) };
      return;
    }
    const time = now - a.start;
    const event = { time, frame: clone(frame) };
    if (time < 0.001) a.events[0] = event;
    else a.events.push(event);
  }
  requestEnd(now) {
    const a = this.active;
    if (!a) return null;
    if (a.end !== null) return a.end;
    const bar = barSeconds(this.bpm);
    a.end = a.start + Math.max(1, Math.round((now - a.start) / bar)) * bar;
    return a.end;
  }
  finish(now) {
    const a = this.active;
    if (!a || a.end === null || now + 1e-6 < a.end) return null;
    const duration = a.end - a.start;
    const events = a.events.filter((e) => e.time < duration),
      takeId = ++this.takeSerial;
    const tracks = HANDS.flatMap((hand, slot) => {
      const handEvents = events.map((e) => ({
        time: e.time,
        frame: [clone(e.frame[slot] || silentFrame())],
      }));
      if (!handEvents.some((e) => e.frame[0].gain > 0)) return [];
      return [
        {
          id: ++this.serial,
          takeId,
          hand,
          instrument: a.instruments[slot],
          start: a.start,
          duration,
          bpm: this.bpm,
          bars: Math.round(duration / barSeconds(this.bpm)),
          events: handEvents,
          muted: false,
          volume: 0.8,
        },
      ];
    });
    this.active = null;
    this.tracks.push(...tracks);
    if (!this.tracks.length) this.origin = null;
    return tracks;
  }
  cancel() {
    this.active = null;
    if (!this.tracks.length) this.origin = null;
  }
  remove(id) {
    this.tracks = this.tracks.filter((t) => t.id !== id);
    if (!this.tracks.length && !this.active) this.origin = null;
  }
  clear() {
    this.tracks = [];
    this.active = null;
    this.origin = null;
  }
}
