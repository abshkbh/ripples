const test = require('node:test');
const assert = require('node:assert/strict');
const { state, setSound } = require('../extension/audio.js');
const media = (overrides = {}) => ({ readyState: 4, muted: true, volume: 0.35, paused: false,
  async play() { this.paused = false; }, ...overrides });

test('enabling sound unmutes the original player and preserves a nonzero volume', async () => {
  const video = media();
  assert.equal((await setSound(video, true)).enabled, true);
  assert.equal(video.muted, false); assert.equal(video.volume, 0.35);
});
test('a zero-volume player becomes audible and a paused player resumes', async () => {
  const video = media({ volume: 0, paused: true });
  assert.equal((await setSound(video, true)).enabled, true);
  assert.equal(video.volume, 0.5); assert.equal(video.paused, false);
});
test('muting sound leaves video playback running', async () => {
  const video = media({ muted: false, async play() { throw new Error('play must not be called'); } });
  assert.equal((await setSound(video, false)).enabled, false);
  assert.equal(video.paused, false); assert.equal(video.volume, 0.35);
});
test('a browser playback rejection restores the original mute and volume settings', async () => {
  const video = media({ volume: 0, async play() { throw new Error('NotAllowedError'); } });
  await assert.rejects(setSound(video, true), /NotAllowedError/);
  assert.equal(video.muted, true); assert.equal(video.volume, 0);
});
test('unavailable media is disabled and cannot claim sound is playing', async () => {
  assert.equal(state(null).available, false); assert.equal(state(null).enabled, false);
  assert.equal(state(media({ readyState: 0 })).available, false);
  assert.equal(state(media({ readyState: 0, muted: false })).enabled, false);
  assert.equal(state(media({ muted: false, paused: true })).enabled, false);
  await assert.rejects(setSound(null, true), /not ready/);
});
