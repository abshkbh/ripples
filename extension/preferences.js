(function (scope) {
  'use strict';
  const clamp = (value, min, max, fallback) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

  function normalize(input = {}) {
    const raw = input && typeof input === 'object' ? input : {};
    const r = raw.region;
    const region = r && [r.x, r.y, r.w, r.h].every(Number.isFinite) &&
      r.x >= 0 && r.x < 1 && r.y >= 0 && r.y < 1 && r.w > 0 && r.h > 0 && r.x + r.w <= 1.001 && r.y + r.h <= 1.001 ?
      { x: r.x, y: r.y, w: Math.min(r.w, 1 - r.x), h: Math.min(r.h, 1 - r.y) } : null;
    const dimensions = Array.isArray(raw.dimensions) && raw.dimensions.length === 2 &&
      raw.dimensions.every(n => Number.isInteger(n) && n > 0) ? [...raw.dimensions] : null;
    const zoom = clamp(raw.zoom, 1, 4, 1);
    return {
      region, dimensions,
      rotation: [0, 90, 180, 270].includes(raw.rotation) ? raw.rotation : 0,
      zoom,
      focused: !!region && raw.focused === true,
      // Pan is relative to viewport size, so it survives window resizing.
      pan: zoom > 1 ? { x: clamp(raw.pan?.x, -1, 1, 0), y: clamp(raw.pan?.y, -1, 1, 0) } : { x: 0, y: 0 },
      sensitivity: ['low', 'normal', 'high'].includes(raw.sensitivity) ? raw.sensitivity : 'normal',
      windowMinutes: [15, 60, 120].includes(raw.windowMinutes) ? raw.windowMinutes : 15,
      paused: raw.paused === true,
      closed: raw.closed === true,
      expanded: raw.expanded === true && raw.closed !== true,
      // Null preserves the original player's choice for older installations.
      soundEnabled: typeof raw.soundEnabled === 'boolean' ? raw.soundEnabled : null,
    };
  }

  function snapshot(input) { return normalize(input); }

  const api = { normalize, snapshot };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.NanitActivityPreferences = api;
})(globalThis);
