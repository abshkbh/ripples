(function (scope) {
  'use strict';

  const PROFILES = {
    low: { pixel: 18, start: 3.5, stop: 1.2 },
    normal: { pixel: 12, start: 2, stop: 0.65 },
    high: { pixel: 8, start: 1, stop: 0.35 },
  };

  function frameDifference(previous, current, threshold = 12) {
    if (!previous || previous.length !== current.length || !current.length) return null;
    // Remove a uniform exposure change before counting moving pixels.
    const histogram = new Uint32Array(511);
    let sum = 0;
    let sumSquared = 0;
    for (let i = 0; i < current.length; i++) {
      histogram[current[i] - previous[i] + 255]++;
      sum += current[i];
      sumSquared += current[i] * current[i];
    }
    let count = 0;
    let offset = 0;
    for (let i = 0; i < histogram.length; i++) {
      count += histogram[i];
      if (count >= current.length / 2) { offset = i - 255; break; }
    }
    let changed = 0;
    for (let i = 0; i < current.length; i++) {
      if (Math.abs(current[i] - previous[i] - offset) > threshold) changed++;
    }
    const mean = sum / current.length;
    return {
      score: changed / current.length * 100,
      exposureShift: offset,
      mean,
      contrast: Math.sqrt(Math.max(0, sumSquared / current.length - mean * mean)),
    };
  }

  class ActivityTracker {
    constructor(sensitivity = 'normal') { this.sensitivity = sensitivity; this.reset(); }

    reset() {
      this.previous = null;
      this.lastTime = null;
      this.startedAt = null;
      this.state = 'calibrating';
      this.score = 0;
      this.movingSince = null;
      this.candidateSince = null;
      this.quietCandidateSince = null;
      this.quietSince = null;
    }

    update(frame, time) {
      const events = [];
      const gap = this.lastTime !== null && time - this.lastTime > 1800;
      if (gap) this.reset();
      if (this.startedAt === null) this.startedAt = time;
      const diff = frameDifference(this.previous, frame, PROFILES[this.sensitivity].pixel);
      this.previous = frame.slice();
      this.lastTime = time;
      if (!diff) return this.result(events, gap);
      if (diff.mean < 3 || diff.mean > 252 || diff.contrast < 2) {
        this.state = 'unclear';
        this.startedAt = time;
        this.movingSince = null;
        this.candidateSince = null;
        this.quietCandidateSince = null;
        this.quietSince = null;
        this.score = 0;
        return this.result(events, gap);
      }
      if (this.state === 'unclear') this.state = 'calibrating';
      this.score = this.score * 0.5 + diff.score * 0.5;
      if (time - this.startedAt < 3000) return this.result(events, gap);
      if (this.state === 'calibrating') { this.state = 'quiet'; this.quietSince = time; }
      const profile = PROFILES[this.sensitivity];
      if (this.state === 'quiet') {
        if (this.score >= profile.start) {
          if (this.candidateSince === null) this.candidateSince = time;
          if (time - this.candidateSince >= 600) {
            this.state = 'moving';
            this.movingSince = this.candidateSince;
            this.quietSince = null;
            events.push({ type: 'movement-start', time, score: this.score });
          }
        } else this.candidateSince = null;
      } else {
        if (this.score <= profile.stop) {
          if (this.quietCandidateSince === null) this.quietCandidateSince = time;
          if (time - this.quietCandidateSince >= 2500) {
            events.push({ type: 'movement-end', time, duration: time - this.movingSince });
            this.state = 'quiet';
            this.quietSince = time;
            this.movingSince = null;
            this.candidateSince = null;
            this.quietCandidateSince = null;
          }
        } else this.quietCandidateSince = null;
        if (this.movingSince !== null && time - this.movingSince >= 6000) this.state = 'sustained';
      }
      return this.result(events, gap);
    }

    result(events, gap) {
      return { state: this.state, score: this.score, movingSince: this.movingSince,
        quietSince: this.quietSince, events, gap };
    }
  }

  function viewTransform(sourceWidth, sourceHeight, width, height, rotation = 0, zoom = 1, focus = null, pan = { x: 0, y: 0 }) {
    const angle = rotation * Math.PI / 180;
    const cos = Math.round(Math.cos(angle));
    const sin = Math.round(Math.sin(angle));
    const rect = focus || { x: 0, y: 0, w: 1, h: 1 };
    const fw = sourceWidth * rect.w;
    const fh = sourceHeight * rect.h;
    const scale = Math.min(width / (Math.abs(cos) * fw + Math.abs(sin) * fh),
      height / (Math.abs(sin) * fw + Math.abs(cos) * fh)) * zoom;
    const cx = (rect.x + rect.w / 2) * sourceWidth;
    const cy = (rect.y + rect.h / 2) * sourceHeight;
    const a = cos * scale, b = sin * scale, c = -sin * scale, d = cos * scale;
    return { a, b, c, d, e: width / 2 + pan.x - a * cx - c * cy,
      f: height / 2 + pan.y - b * cx - d * cy };
  }

  function inversePoint(transform, x, y) {
    const { a, b, c, d, e, f } = transform;
    const determinant = a * d - b * c;
    return { x: (d * (x - e) - c * (y - f)) / determinant,
      y: (-b * (x - e) + a * (y - f)) / determinant };
  }

  function normalizeRegion(start, end, width, height) {
    const clamp = (value) => Math.max(0, Math.min(1, value));
    const left = clamp(Math.min(start.x, end.x) / width);
    const top = clamp(Math.min(start.y, end.y) / height);
    const right = clamp(Math.max(start.x, end.x) / width);
    const bottom = clamp(Math.max(start.y, end.y) / height);
    if ((right - left) * width < 24 || (bottom - top) * height < 24) return null;
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  function csv(events) {
    const quote = (value) => {
      let text = String(value ?? '');
      // Keep user notes from becoming spreadsheet formulas when exported.
      if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    return ['Time,Event,Details', ...events.map(event =>
      [new Date(event.time).toISOString(), event.title, event.detail].map(quote).join(','))].join('\r\n');
  }

  const api = { ActivityTracker, frameDifference, viewTransform, inversePoint, normalizeRegion, csv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.NanitActivityCore = api;
})(globalThis);
