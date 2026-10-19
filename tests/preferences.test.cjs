const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, snapshot } = require('../extension/preferences.js');
const { viewTransform } = require('../extension/core.js');

test('a saved and reloaded view preserves Focus, pan, every setting, and the rendered framing', () => {
  const settings = {
    region: { x: 0.2, y: 0.1, w: 0.4, h: 0.6 }, dimensions: [1920, 1080],
    rotation: 270, zoom: 2.25, focused: true, pan: { x: -0.13, y: 0.08 },
    sensitivity: 'low', windowMinutes: 120, paused: true, closed: false, expanded: true, soundEnabled: true,
  };
  const restored = normalize(JSON.parse(JSON.stringify(snapshot(settings))));
  assert.deepEqual(restored, settings);
  const framing = prefs => viewTransform(1920, 1080, 900, 600, prefs.rotation, prefs.zoom,
    prefs.focused ? prefs.region : null, { x: prefs.pan.x * 900, y: prefs.pan.y * 600 });
  assert.deepEqual(framing(restored), framing(settings));
});

test('older preferences migrate without losing the existing region, rotation, zoom, or sensitivity', () => {
  const previous = { region: { x: 0.3, y: 0.2, w: 0.4, h: 0.6 }, dimensions: [1920, 1080], rotation: 180, zoom: 1.5, sensitivity: 'high' };
  const restored = normalize(previous);
  for (const key of Object.keys(previous)) assert.deepEqual(restored[key], previous[key]);
  assert.equal(restored.focused, false); assert.deepEqual(restored.pan, { x: 0, y: 0 });
  assert.equal(restored.windowMinutes, 15); assert.equal(restored.soundEnabled, null);
});

test('invalid or missing settings cannot restore an unusable crop or nonfinite pan', () => {
  const restored = normalize({ region: { x: 1.0005, y: 0, w: 0.0001, h: 1 }, focused: true,
    dimensions: [0, '1080'], zoom: Infinity, pan: { x: NaN, y: Infinity }, rotation: 45,
    windowMinutes: 999, paused: 'true', soundEnabled: 'true' });
  assert.equal(restored.region, null); assert.equal(restored.focused, false); assert.equal(restored.dimensions, null);
  assert.equal(restored.zoom, 1); assert.deepEqual(restored.pan, { x: 0, y: 0 });
  assert.equal(restored.rotation, 0); assert.equal(restored.windowMinutes, 15);
  assert.equal(restored.paused, false); assert.equal(restored.soundEnabled, null);
  assert.deepEqual(normalize(null), normalize());
});

test('pan stays bounded, and a minimized view cannot reopen expanded', () => {
  const restored = normalize({ zoom: 10, pan: { x: -4, y: 5 }, closed: true, expanded: true, soundEnabled: false });
  assert.equal(restored.zoom, 4); assert.deepEqual(restored.pan, { x: -1, y: 1 });
  assert.equal(restored.closed, true); assert.equal(restored.expanded, false); assert.equal(restored.soundEnabled, false);
});

test('serialized preferences are independent of later gestures', () => {
  const original = { region: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, dimensions: [1920, 1080], zoom: 2, pan: { x: 0.2, y: 0.3 } };
  const saved = snapshot(original);
  original.pan.x = 0.8; original.region.x = 0.4; original.dimensions[0] = 1280;
  assert.equal(saved.pan.x, 0.2); assert.equal(saved.region.x, 0.1); assert.equal(saved.dimensions[0], 1920);
});
