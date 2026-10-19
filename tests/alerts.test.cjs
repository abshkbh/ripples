const test = require('node:test');
const assert = require('node:assert/strict');
const { QuietReminder, createChime } = require('../extension/alerts.js');

const observe = (reminder, start, end, state = 'quiet') => {
  const fired = [];
  for (let time = start; time <= end; time += 1000) if (reminder.observe(state, time)) fired.push(time);
  return fired;
};

test('two minutes of continuous quiet observations fire exactly once', () => {
  const reminder = new QuietReminder(); reminder.configure(true, 120);
  assert.deepEqual(observe(reminder, 0, 119000), []);
  assert.equal(reminder.snapshot().quietMs, 119000);
  assert.equal(reminder.observe('quiet', 120000), true);
  assert.equal(reminder.snapshot().active, true);
  assert.deepEqual(observe(reminder, 121000, 240000), []);
  reminder.dismiss();
  assert.equal(reminder.snapshot().active, false);
  assert.deepEqual(observe(reminder, 241000, 260000), []);
  reminder.observe('moving', 261000);
  assert.deepEqual(observe(reminder, 262000, 382000), [382000]);
});

test('gaps, unclear video, calibration and expired frames cannot count as quiet time', () => {
  for (const interruption of ['unclear', 'calibrating', 'moving', 'sustained', 'offline']) {
    const reminder = new QuietReminder(); reminder.configure(true, 120);
    observe(reminder, 0, 119000);
    reminder.observe(interruption, 120000);
    assert.deepEqual(observe(reminder, 121000, 240000), []);
    assert.equal(reminder.observe('quiet', 241000), true);
  }
  const reminder = new QuietReminder(); reminder.configure(true, 120);
  observe(reminder, 0, 119000);
  assert.equal(reminder.observe('quiet', 122000), false);
  assert.equal(reminder.snapshot().quietMs, 0);
  reminder.expire(125000);
  assert.equal(reminder.snapshot().observing, false);
  assert.equal(reminder.observe('quiet', 126000), false);
});

test('arming or changing duration starts fresh; disabling and clock changes reset the timer', () => {
  const reminder = new QuietReminder();
  assert.deepEqual(observe(reminder, 0, 120000), []);
  reminder.configure(true, 120);
  observe(reminder, 121000, 180000);
  reminder.configure(true, 30);
  assert.deepEqual(observe(reminder, 181000, 210000), []);
  assert.equal(reminder.observe('quiet', 211000), true);
  reminder.configure(false, 30);
  assert.equal(reminder.snapshot().active, false);
  reminder.configure(true, 30);
  observe(reminder, 300000, 320000);
  assert.equal(reminder.observe('quiet', 290000), false);
  assert.equal(reminder.snapshot().quietMs, 0);
  reminder.expire(NaN);
  assert.equal(reminder.snapshot().observing, false);
});

test('wall-clock passage without samples never advances the reminder', () => {
  const reminder = new QuietReminder(); reminder.configure(true, 120);
  reminder.observe('quiet', 0);
  reminder.expire(1000);
  assert.equal(reminder.snapshot().quietMs, 0);
  reminder.expire(120000);
  assert.equal(reminder.snapshot().active, false);
  assert.equal(reminder.snapshot().observing, false);
});

test('a chime requires armed audio and reports rejected or unavailable playback', async () => {
  const starts = [];
  let context;
  class Context {
    constructor() { context = this; this.state = 'suspended'; this.currentTime = 10; this.destination = {}; }
    async resume() { this.state = 'running'; }
    createOscillator() { return { frequency: {}, connect() {}, disconnect() {}, start(time) { starts.push(time); }, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  }
  const chime = createChime(Context);
  assert.equal(chime.play(), false);
  await chime.arm();
  assert.equal(chime.ready(), true);
  assert.equal(chime.play(), true);
  assert.deepEqual(starts, [10, 10.28]);
  context.state = 'suspended';
  assert.equal(chime.play(), false);
  class Rejected extends Context { async resume() { throw new Error('NotAllowedError'); } }
  await assert.rejects(createChime(Rejected).arm(), /NotAllowedError/);
  await assert.rejects(createChime(null).arm(), /unavailable/);
  class Broken extends Context { createOscillator() { throw new Error('Audio graph unavailable'); } }
  const broken = createChime(Broken);
  await broken.arm();
  assert.equal(broken.play(), false);
  assert.equal(broken.ready(), false);
});
