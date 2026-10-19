const test = require('node:test');
const assert = require('node:assert/strict');
const { state, setSound, restorePreference } = require('../extension/audio.js');
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

test('restoring saved sound-on never automatically unmutes or pauses a muted player', () => {
  let unmuteAttempts = 0, playCalls = 0, muted = true;
  const video = media({ play() { playCalls++; } });
  Object.defineProperty(video, 'muted', { get() { return muted; }, set(value) {
    muted = value;
    if (!value) { unmuteAttempts++; video.paused = true; }
  } });
  const restored = restorePreference(video, true);
  assert.equal(restored.needsClick, true);
  assert.equal(video.muted, true); assert.equal(video.paused, false);
  assert.equal(unmuteAttempts, 0); assert.equal(playCalls, 0);
});

test('sound restoration preserves an already audible player and follows a legacy unset choice', () => {
  const video = media({ muted: false });
  assert.equal(restorePreference(video, true).needsClick, false);
  assert.equal(restorePreference(video, null).enabled, true);
  assert.equal(video.muted, false); assert.equal(video.paused, false);
  assert.equal(restorePreference(null, true).needsClick, true);
});

test('restoring saved sound-off only mutes and leaves playback running', () => {
  const video = media({ muted: false, play() { throw new Error('Must not play during restore'); } });
  assert.equal(restorePreference(video, false).needsClick, false);
  assert.equal(video.muted, true); assert.equal(video.paused, false);
});
