(function (scope) {
  'use strict';
  function state(media) {
    const available = !!media && media.readyState >= 2;
    return {
      available,
      enabled: available && !media.muted && media.volume > 0 && !media.paused,
      paused: !!media?.paused,
    };
  }

  async function setSound(media, enabled) {
    if (!state(media).available) throw new Error('The live video is not ready for sound yet.');
    if (!enabled) { media.muted = true; return state(media); }
    const previous = { muted: media.muted, volume: media.volume, playing: !media.paused };
    media.muted = false;
    if (media.volume === 0) media.volume = 0.5;
    try {
      // Called directly from the sound button's click, preserving user activation.
      await media.play();
    } catch (error) {
      media.muted = previous.muted; media.volume = previous.volume;
      if (previous.playing && media.paused) {
        // Keep muted video running if enabling audio was rejected by the browser.
        media.muted = true;
        try { await media.play(); } catch { /* The UI will report the paused state. */ }
      }
      throw error;
    }
    return state(media);
  }

  function restorePreference(media, enabled) {
    // Restoring a preference is not a user gesture. Unmuting here can make
    // Chrome pause the live player and report an autoplay error, even if caught.
    if (state(media).available && enabled === false) media.muted = true;
    const current = state(media);
    return { ...current, needsClick: enabled === true && !current.enabled };
  }

  const api = { state, setSound, restorePreference };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.NanitActivityAudio = api;
})(globalThis);
