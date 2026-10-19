# Ripples

Small movements, made visible.

An independent local activity dashboard for Nanit, unaffiliated with Nanit. This Chrome extension runs on `https://my.nanit.com/`. It uses the video already playing in your signed-in Nanit tab. No Nanit credentials, separate connection, subscription, API, external service, or build step is required.

## Features

- **Live activity:** little movement, movement detected, sustained movement, calibration, and explicit unavailable states. A quiet stretch is observed stillness, not confirmed sleep.
- **Movement timeline:** 15-minute, 1-hour, and 2-hour windows. Hover to inspect a sample. Blank intervals represent missing observations; observations are never interpolated through gaps.
- **Automatic log:** session starts, movement starts and settling, settings changes, pauses, and video interruptions. Add your own notes and export CSV. It does not claim to recognize caregivers, pickups, or put-downs.
- **Viewing controls:** rotate in 90° steps, zoom 1–4×, drag to pan, select a tracking region, focus on that region, reset, and fullscreen (with an expanded in-tab fallback). Escape or **Exit expanded view** returns to the dashboard. Focus, pan, rotation, zoom, the timeline range, expanded/minimized viewing, sensitivity, and the tracking pause state persist across refreshes. The focus and tracking area map correctly through rotation and zoom.
- **Live sound:** the Sound button unmutes or mutes the original Nanit player; it creates no second stream and does not capture or record audio. It reflects the player's current mute/play state and reports playback failures. The sound choice is remembered; **Enable sound** appears if the browser requires a click to restore it.

## Install locally

Loading the extension grants this code access to the Nanit page and its private video. Review the source first. Its only declared API permission is `storage`, and its content script only matches `https://my.nanit.com/*`.

1. Open Chrome’s Extensions page (`chrome://extensions`).
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select Ripples’ **extension** folder.
4. Reload the Nanit tab once. The activity view will appear over the original page.
5. Choose **Set tracking area** and drag a rectangle around your baby. The rectangle stays in camera coordinates when you rotate or zoom. Calibration takes about three seconds. **Use full frame** works without drawing but includes room movement.

**Back to Nanit** restores the original page while observing continues when frames arrive. Use the floating button to reopen the activity view. To remove the view, turn the extension off in Chrome and reload Nanit; no Nanit account settings are changed.

For an update, use **Reload** on this existing extension in Chrome's Extensions page, then refresh Nanit. Keep the existing extension installed to retain its local data.

## What happens on refresh

The extension uses `chrome.storage.local` in the current Chrome profile. It keeps at most 250 event/note entries from the past 24 hours and 2 hours of timestamped movement scores. Preferences have a dedicated key, written immediately when a setting changes: tracking region, camera dimensions, rotation, zoom, Focus, pan, timeline range, sensitivity, tracking pause, minimized/expanded viewing, and sound choice. Existing history and older preferences migrate automatically. Raw video and audio are not stored by the extension.

Refreshing reloads that history and those settings, starts a new observation session, and recalibrates for about three seconds when tracking is enabled. The current quiet timer and session burst count reset. Paused tracking stays paused; a minimized dashboard stays minimized. Pan is saved as a fraction of the viewport so it remains meaningful after a window resize. A different video source or changed camera dimensions clear the tracking region and its dependent framing. No observations are made while the Nanit tab is closed or reloading. History writes are delayed by about 1.5 seconds, so the newest activity samples or events can be lost during an immediate refresh. Preference writes do not use that delay.

The saved sound choice is applied when the video becomes ready. Browser [autoplay rules](https://developer.chrome.com/blog/autoplay/) can require a click to restore sound; the UI shows **Enable sound** when that happens and keeps the video available. The preference remains saved. Expanded viewing restores inside the tab; entering native browser fullscreen requires a click.

## Local preview and tests

Requires Node.js 20 or newer. There are no dependencies to install.

```sh
npm test
npm run check
npm start
```

Open `http://127.0.0.1:4317`. The preview runs the same core and interface against a generated canvas video, clearly labeled **Simulated feed**. The test controls can generate motion, change lighting, interrupt frames, and replace the video. It contains no real nursery video or real activity data. The preview server binds only to localhost.

## How detection works

Frames from the selected region are downsampled to 160×90 pixels, at up to five samples per second. A median brightness-shift correction suppresses uniform exposure changes; the fraction of pixels with sufficiently large luminance changes produces a motion score. Smoothing, separate start/stop thresholds, and minimum durations suppress brief spikes. This is image-difference detection, not a trained sleep or person-recognition model. Sensitivity is adjustable.

No frames for five seconds, low-detail images, a sampling gap over 1.8 seconds, a source replacement, region changes, pauses, and visibility changes reset the relevant estimates. Returning to the page recalibrates. A video source replacement clears the tracking area to avoid silently applying it to a different camera. New frame delivery is not proof that the scene itself is fresh: an upstream camera could repeat frozen frames.

## Privacy and limits

- All image processing happens in the browser. Frames exist in memory only; no screenshots, audio, clips, or video are saved or uploaded.
- Extension-local storage holds preferences, up to 2 hours of movement samples, and at most 250 log entries from the past 24 hours. Expired records are pruned while running and on next startup. Chrome can clear this data by removing the extension. The preview has separate browser-local storage.
- Tracking requires the Nanit tab to stay open and playing. Browsers can throttle background tabs or sleeping computers. Keep the tab visible for continuous observation; gaps are displayed as unknown.
- A covered, rocking, shadowed, or moving scene can produce misleading motion readings. The app measures changed pixels, not why they changed.
- Protected or cross-origin-tainted video may prevent analysis. The app reports that state and leaves the original Nanit page available; it does not bypass video protections.
- No breathing, heart rate, oxygen, medical, or safety status is inferred. This is an activity and viewing tool.
- The interface, sound control, movement estimates, and persistence have been checked against a generated feed and one live Nanit setup. These checks do not establish clinical accuracy or reliable continuous background monitoring. Compatibility can change when Nanit changes its web player.

Private development captures and activity exports are excluded from this repository. The original Nanit page still connects to Nanit’s services as usual.

The extension uses Chrome’s documented [content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) and [unpacked installation workflow](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world).
