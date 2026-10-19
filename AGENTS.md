# Working on Ripples

This guide applies to the whole repository. Read `README.md` for the user-facing feature descriptions, storage behavior, and limitations.

## What this project does

Ripples is an independent Chrome Manifest V3 extension for `https://my.nanit.com/*`. It adds a dashboard to the video already playing in the signed-in Nanit page: local movement estimates, a timeline, an event log, sound controls, and persistent viewing settings.

The demo uses the same interface with a generated video. Movement detection uses frame differences, not a trained model. Keep descriptions accurate: stillness does not establish sleep or wellbeing, and this code does not detect breathing or medical status.

## Local setup

Requirements:

- Node.js 20 or newer, with npm, for the preview and checks.
- Chrome and access to a Nanit camera for live integration testing.

Run commands from the repository root:

```sh
npm test
npm run check
npm start
```

There are no dependencies to install and no build step. `npm install` is unnecessary. The files in `extension/` are the files Chrome loads directly; Node.js is not required to run the installed extension.

The demo is served at `http://127.0.0.1:4317`. If that port is occupied, use another port:

```sh
PORT=4318 npm start
```

Start the server from the checkout you are editing. An older copy of the project may already have a preview running on the default port. The server binds to localhost and serves only `demo/` and `extension/`. Stop it with Ctrl+C.

## Install and update in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this checkout's `extension/` directory, not the repository root.
4. Open the signed-in Nanit web app and start the camera video.
5. Refresh the Nanit tab. Ripples should mount automatically.
6. Click **Set tracking area**, draw a rectangle around the area to observe, and allow about three seconds for calibration. **Use full frame** is an alternative that also includes room movement.

After editing extension files, click **Reload** on the existing extension card in Chrome, then refresh the Nanit tab. There is no automatic extension reload. Demo edits need only a browser refresh.

Keep the same installed extension and directory for normal updates. Loading an unpacked extension from a different path can give it a different identity and separate local storage. Do not assume data transfers automatically between checkouts. Removing the installed extension clears its extension-local data.

Use **Back to Nanit** to show the original page; the floating button reopens Ripples. Disable the extension and refresh the tab to stop using it. Ripples does not change Nanit account settings.

## Code structure

| Path | Responsibility |
| --- | --- |
| `extension/manifest.json` | MV3 metadata, the `storage` permission, Nanit URL match, and content-script load order. |
| `extension/content.js` | Live-page entry point; checks the origin and calls `NanitActivityView.mount({ demo: false })`. |
| `extension/core.js` | Frame differences, activity state transitions, sensitivity profiles, view transforms, inverse coordinate mapping, region normalization, and safe CSV generation. |
| `extension/audio.js` | Reads and changes sound on the existing media element, preserves playback, and restores sound preferences without attempting automatic unmute. |
| `extension/preferences.js` | Normalizes and snapshots saved settings, clamps values, and supplies defaults for older data. |
| `extension/alerts.js` | Continuous quiet-observation timer, one reminder per quiet stretch, and a user-armed local Web Audio chime. |
| `extension/styles.js` | Dashboard CSS as the `NanitActivityStyles` string. |
| `extension/view.js` | Shared dashboard: Shadow DOM, video discovery, canvas rendering, sampling, timeline, log, interactions, and storage. |
| `demo/index.html` | Preview page; loads the same extension modules and the demo fixture. |
| `demo/fixture.js` | Generated canvas video and controls for motion, lighting, interruptions, and video replacement. |
| `demo/preview.css` | Preview page styling outside the dashboard. |
| `scripts/serve.cjs` | Local preview server with route restrictions and a Content Security Policy. |
| `scripts/check.cjs` | JavaScript syntax checks and manifest permission, host-match, and content-script existence checks. |
| `tests/core.test.cjs` | Movement state transitions, gaps, exposure changes, geometry, and CSV safety. |
| `tests/audio.test.cjs` | Mute/unmute, volume, playback, unavailable media, and rejected playback. |
| `tests/preferences.test.cjs` | Preference round trips, rendered framing, legacy defaults, invalid data, and snapshot independence. |
| `tests/alerts.test.cjs` | Quiet thresholds, rearming, stale observations, clock changes, and unavailable or blocked chimes. |
| `package.json` | Project metadata and npm commands; keep `private: true` to prevent accidental npm publication. |

### Runtime flow

The manifest loads scripts in this order:

```text
core.js -> audio.js -> preferences.js -> alerts.js -> styles.js -> view.js -> content.js
```

The shared modules expose the existing `NanitActivity*` globals. `core.js`, `audio.js`, `preferences.js`, and `alerts.js` also export through CommonJS for Node tests. Preserve this pattern unless deliberately changing the loading architecture; content scripts are not loaded as ES modules.

`view.js` mounts an open Shadow DOM dashboard and discovers the page's video. Frames are watched with `requestVideoFrameCallback`, with a media-time polling fallback. Rendering and activity analysis use the existing video; audio remains on that original media element. The selected tracking area is sampled at 160×90 pixels, at up to five samples per second.

The demo replaces the live entry point with `demo/fixture.js`, which creates a synthetic stream and calls `mount({ demo: true })`.

## Persistence and compatibility

The legacy names below are intentional and still used after the Ripples rename:

| Data | Live extension key | Demo key |
| --- | --- | --- |
| History | `nanit-activity-v1` | `nanit-activity-demo-v1` |
| Preferences | `nanit-activity-v1-preferences` | `nanit-activity-demo-v1-preferences` |

Live data uses `chrome.storage.local`; demo data uses `localStorage`. Do not rename these keys or the shared globals just to match the brand. Changes to persisted data need compatible defaults or an explicit migration.

- Preferences save immediately under their own key so delayed history writes cannot overwrite recent viewing changes. Older preferences can be read from history's `prefs` field.
- History saves after a delay of about 1.5 seconds and retains up to two hours of samples and 250 log entries from the past 24 hours.
- Region coordinates are normalized to the source video. Pan is stored as a fraction of viewport size, then converted for rendering. Keep selection and inverse transforms correct through rotation, Focus, zoom, and pan.
- Source replacement or changed camera dimensions invalidates the tracking area and dependent framing. Missing observations must remain gaps rather than being interpolated into activity or quiet time.
- Refresh restores settings and history but starts a fresh observation session and calibration. Session counters and the current quiet timer reset.
- Sound preference can survive refresh even when Chrome requires a click before audible playback. Preserve **Enable sound** handling. Native fullscreen also requires user activation; saved expanded viewing restores within the tab.
- Quiet reminders default to off with a two-minute duration and chime enabled. Their preferences persist, but elapsed time and dismissal state do not. Only continuous fresh `quiet` samples advance the timer; hidden tabs, missing/unclear frames, tracking changes, and pauses reset it. A dismissed reminder rearms after detected movement. Chime audio must be armed from a user click after refresh; it is separate from the source player's audio.

## Verification workflow

For JavaScript, manifest, or behavior changes, run:

```sh
npm test
npm run check
```

`npm test` uses Node's built-in test runner. `npm run check` checks syntax and the declared manifest configuration; neither command exercises Chrome or the live player. Add focused regression coverage when changing detection, geometry, audio, or persistence. Documentation-only edits do not require rerunning the runtime suite.

Use the generated demo first for browser checks relevant to the change:

1. Select a tracking area and wait for calibration.
2. Generate movement, then switch back to quiet; inspect the activity card, timeline, and event log.
3. Check rotation, zoom, pan, and Focus. Change settings and refresh immediately to verify persistence.
4. Check pause/resume, minimizing, and expanded viewing when those paths change.
5. Use lighting changes, interrupted frames, and source replacement to check unknown states, gaps, and recalibration.
6. Check manual notes and CSV export when changing the log.
7. For reminder changes, verify the test button, one alert per quiet stretch, dismissal/rearming, reset after interruptions, and preference restoration. Use a short selectable duration in the demo, then restore the intended duration. Test the banner in minimized and fullscreen views. Do not interpret quiet reminders as sleep, breathing, or safety detection.

The generated feed has no nursery audio. Unit tests can verify media state changes, but they do not establish audible speaker output. Live sound checks require the real player; distinguish observed mute/play state from sound independently heard.

For live checks, first confirm Chrome loaded this checkout and the updated extension. Keep the existing working installation and saved data in mind when switching paths. Report which behaviors were actually checked and any untested limits.

## Change and sharing guidelines

- Keep processing local and reuse the existing signed-in video. Preserve the current narrow host match and storage permission; do not add recording, telemetry, credentials, or another camera connection as incidental changes.
- Render user notes as text and preserve CSV formula neutralization and quoting.
- Keep `package.json` and `extension/manifest.json` versions aligned when making a release.
- Use generated footage for public examples by default. If the user explicitly requests a live documentation screenshot, cover faces with an opaque placeholder and inspect the flattened final image before including it. Keep unedited nursery captures, recordings, exports, and personal development notes out of Git.
- `.gitignore` excludes `artifacts/`, `private/`, `recordings/`, CSV/log exports, `.env` files, and development output. Check staged files before sharing; do not force-add private artifacts.
- Keep this guide and `README.md` consistent with changes to commands, loading, storage, and installation.
