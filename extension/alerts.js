(function (scope) {
  'use strict';
  const DELAYS = [30, 60, 120, 300, 600, 900];

  class QuietReminder {
    constructor() { this.enabled = false; this.seconds = 120; this.reset(); }

    configure(enabled, seconds) {
      const nextEnabled = enabled === true;
      const nextSeconds = DELAYS.includes(seconds) ? seconds : 120;
      if (nextEnabled !== this.enabled || nextSeconds !== this.seconds) this.reset();
      this.enabled = nextEnabled; this.seconds = nextSeconds;
    }

    reset() {
      this.startedAt = null; this.lastAt = null;
      this.fired = false; this.active = false;
    }

    // Only actual, fresh samples advance this timer. Wall-clock ticks never do.
    observe(state, time) {
      if (!this.enabled || state !== 'quiet' || !Number.isFinite(time)) {
        this.reset(); return false;
      }
      if (this.lastAt !== null && (time < this.lastAt || time - this.lastAt > 1800)) this.reset();
      if (this.startedAt === null) this.startedAt = time;
      this.lastAt = time;
      if (!this.fired && time - this.startedAt >= this.seconds * 1000) {
        this.fired = true; this.active = true;
        return true;
      }
      return false;
    }

    expire(time) {
      if (this.lastAt !== null && (!Number.isFinite(time) || time < this.lastAt || time - this.lastAt > 1800)) this.reset();
    }

    dismiss() { this.active = false; }

    snapshot() {
      return { enabled: this.enabled, seconds: this.seconds, active: this.active, fired: this.fired,
        quietMs: this.startedAt === null ? 0 : this.lastAt - this.startedAt,
        observing: this.startedAt !== null };
    }
  }

  function createChime(Context = scope.AudioContext || scope.webkitAudioContext) {
    let context = null, failed = false;
    const ready = () => context?.state === 'running' && !failed;
    return {
      ready,
      async arm() {
        if (!Context) throw new Error('Chime audio is unavailable in this browser.');
        failed = false;
        if (!context || context.state === 'closed') context = new Context();
        // Call from an explicit click; do not try to bypass autoplay policy.
        if (!ready()) await context.resume();
        if (!ready()) throw new Error('Click Enable chime to allow sound in this tab.');
      },
      play() {
        if (!ready()) return false;
        try {
          const now = context.currentTime;
          for (const [offset, frequency] of [[0, 660], [0.28, 880]]) {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = 'sine'; oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0, now + offset);
            gain.gain.linearRampToValueAtTime(0.12, now + offset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.23);
            oscillator.connect(gain); gain.connect(context.destination);
            oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
            oscillator.start(now + offset); oscillator.stop(now + offset + 0.25);
          }
          return true;
        } catch { failed = true; return false; }
      },
    };
  }

  const api = { QuietReminder, createChime, DELAYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.NanitActivityAlerts = api;
})(globalThis);
