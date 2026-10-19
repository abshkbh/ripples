const test = require('node:test');
const assert = require('node:assert/strict');
const { ActivityTracker, frameDifference, viewTransform, inversePoint, normalizeRegion, csv } = require('../extension/core.js');
const frame = () => Uint8Array.from({ length: 1000 }, (_, i) => 60 + i % 100);
function altered(input, amount = 120) { const f = input.slice(); for (let i = 0; i < amount; i++) f[i] = f[i] + 70; return f; }
function baseline(tracker, until = 4000) { for (let t = 0; t <= until; t += 200) tracker.update(frame(), t); }

test('identical frames and uniform exposure changes do not become movement', () => {
  assert.equal(frameDifference(frame(), frame()).score, 0);
  const bright = frame().map(v => v + 25);
  assert.equal(frameDifference(frame(), bright).score, 0);
  assert.equal(frameDifference(frame(), bright).exposureShift, 25);
  assert.equal(frameDifference(frame(), altered(frame())).score, 12);
});
test('calibration, movement hysteresis, sustained motion, and settling produce one burst', () => {
  const tracker = new ActivityTracker(); const events = [];
  assert.equal(tracker.update(frame(), 0).state, 'calibrating');
  baseline(tracker);
  assert.equal(tracker.state, 'quiet');
  let result;
  for (let t = 4200; t <= 13000; t += 200) { result = tracker.update(t % 400 ? frame() : altered(frame()), t); events.push(...result.events); }
  assert.equal(result.state, 'sustained');
  assert.equal(events.filter(e => e.type === 'movement-start').length, 1);
  for (let t = 13200; t <= 18000; t += 200) { result = tracker.update(frame(), t); events.push(...result.events); }
  assert.equal(result.state, 'quiet');
  assert.equal(events.filter(e => e.type === 'movement-end').length, 1);
});
test('a sampling gap never contributes to an uninterrupted quiet stretch', () => {
  const tracker = new ActivityTracker(); baseline(tracker);
  const result = tracker.update(frame(), 20000);
  assert.equal(result.gap, true); assert.equal(result.state, 'calibrating'); assert.equal(result.quietSince, null);
});
test('a black or featureless frame becomes unknown, with recovery calibration', () => {
  const tracker = new ActivityTracker(); baseline(tracker);
  assert.equal(tracker.update(new Uint8Array(1000), 4200).state, 'unclear');
  assert.equal(tracker.update(frame(), 4400).state, 'calibrating');
  for (let t = 4600; t <= 7600; t += 200) tracker.update(frame(), t);
  assert.equal(tracker.state, 'quiet');
});
test('transient changed pixels do not log an event', () => {
  const tracker = new ActivityTracker(); baseline(tracker); const events = [];
  events.push(...tracker.update(altered(frame(), 30), 4200).events);
  for (let t = 4400; t <= 6000; t += 200) events.push(...tracker.update(frame(), t).events);
  assert.equal(events.length, 0);
});
test('video transforms and inverse region mapping agree through every rotation, crop, zoom, and pan', () => {
  for (const rotation of [0, 90, 180, 270]) for (const focus of [null, { x: 0.35, y: 0.1, w: 0.3, h: 0.8 }]) {
    const tr = viewTransform(1920, 1080, 900, 600, rotation, 2, focus, { x: 15, y: -30 });
    const x = 721, y = 392;
    const back = inversePoint(tr, tr.a * x + tr.c * y + tr.e, tr.b * x + tr.d * y + tr.f);
    assert.ok(Math.abs(back.x - x) < 0.000001); assert.ok(Math.abs(back.y - y) < 0.000001);
  }
});
test('regions clamp to the source and reject clicks or selections outside the image', () => {
  assert.deepEqual(normalizeRegion({ x: -50, y: -20 }, { x: 100, y: 100 }, 1000, 500), { x: 0, y: 0, w: 0.1, h: 0.2 });
  assert.equal(normalizeRegion({ x: 5, y: 5 }, { x: 8, y: 8 }, 1000, 500), null);
  assert.equal(normalizeRegion({ x: -70, y: -80 }, { x: -40, y: -30 }, 1000, 500), null);
});
test('CSV safely quotes notes and neutralizes spreadsheet formulas', () => {
  const text = csv([{ time: 0, title: 'Your note', detail: '=HYPERLINK("bad")' }, { time: 0, title: 'A, B', detail: 'Line 1\nLine 2' }]);
  assert.match(text, /"'=HYPERLINK\(""bad""\)"/);
  assert.match(text, /"A, B"/); assert.match(text, /"Line 1\nLine 2"/);
});
