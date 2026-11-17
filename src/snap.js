// A snap is a short, bright impulse above the recent room floor, followed by silence.
export class SnapDetector {
  constructor(sensitivity = 1) {
    this.sensitivity = sensitivity;
    this.floor = 0.004;
    this.last = -Infinity;
    this.candidate = null;
    this.armed = true;
  }
  feed({ rms, highRatio }, ms) {
    if (!Number.isFinite(rms) || !Number.isFinite(highRatio)) return false;
    const threshold = Math.max(0.028 / this.sensitivity, (this.floor * 5) / this.sensitivity);
    if (this.candidate) {
      const age = ms - this.candidate.at;
      if (rms < this.candidate.peak * 0.35) {
        this.candidate = null;
        if (age >= 5 && age <= 100 && ms - this.last > 800) {
          this.last = ms;
          return true;
        }
      } else if (age > 100) this.candidate = null;
    } else if (this.armed && rms > threshold && highRatio > 0.48 && ms - this.last > 800) {
      this.candidate = { at: ms, peak: rms };
      this.armed = false;
    }
    if (rms < threshold) {
      this.floor = this.floor * 0.97 + rms * 0.03;
      this.armed = true;
    }
    return false;
  }
}
