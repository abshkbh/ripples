(function (scope) {
  'use strict';
  const icons = {
    moon: '<path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/>',
    activity: '<path d="M2 12h5l3-7 4 14 3-7h5"/>',
    left: '<path d="M3 10a9 9 0 1 1 2 9M3 4v6h6"/>',
    right: '<path d="M21 10a9 9 0 1 0-2 9m2-15v6h-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    area: '<path d="M3 8V3h5m8 0h5v5m0 8v5h-5M8 21H3v-5M8 8h8v8H8Z"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5m0 8v5h-5M8 21H3v-5"/>',
    reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    camera: '<rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="12" cy="12.5" r="4"/>',
    sound: '<path d="M11 5 6 9H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    muted: '<path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/>',
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.activity}</svg>`;
  const clock = (time) => new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  function duration(milliseconds) {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return minutes < 60 ? `${minutes}m ${seconds % 60}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  function mount({ demo = false } = {}) {
    if (document.getElementById('nanit-activity-root')) return;
    const core = scope.NanitActivityCore;
    const host = document.createElement('div');
    host.id = 'nanit-activity-root';
    host.style.cssText = 'position:relative;z-index:2147483646;';
    document.documentElement.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const originalBodyInert = document.body.inert;
    document.body.inert = true;
    root.innerHTML = `<style>${scope.NanitActivityStyles}</style>
      <div class="app" role="region" aria-label="Ripples activity view">
        <header class="topbar"><div class="brand"><div class="brand-mark">☾</div><div><div class="eyebrow">Ripples · for Nanit</div><h1>Your nursery</h1></div></div>
          <div class="top-actions">${demo ? '<span class="demo-badge">Simulated feed · preview</span>' : ''}<span class="local-badge">${svg('lock')}Processed on this device</span><button id="back" class="text-button">Back to Nanit ↗</button></div>
        </header>
        <main class="layout"><div class="main">
          <section aria-label="Live video"><div class="section-title"><h2>Live view</h2><div class="feed-status"><span class="feed-tag"><i id="feed-dot" class="dot offline"></i><span id="feed-label">Connecting</span></span><button id="sound" class="sound-toggle" aria-label="Turn live sound on" aria-pressed="false" disabled><span id="sound-icon">${svg('muted')}</span><span id="sound-label">Sound off</span></button></div></div>
            <div class="viewer" id="viewer"><canvas id="video-canvas" aria-label="Live Nanit video. Use Set tracking area to select the movement detection region." tabindex="0"></canvas>
              <div class="viewer-header"><span class="viewer-pill">${demo ? 'SIMULATED VIDEO' : 'NANIT · LIVE VIEW'}</span><span id="frame-age">Waiting for video</span></div>
              <div class="viewer-empty" id="viewer-empty">${svg('camera')}<strong>Waiting for the camera</strong><span>Open your camera in Nanit. This view connects automatically.</span></div>
              <div class="viewer-message" id="viewer-message">Select the area around your baby to start tracking movement.</div>
              <button class="viewer-exit" id="exit-expanded" hidden>Exit expanded view</button>
            </div>
            <div class="controls" role="group" aria-label="Viewing controls">
              <button id="rotate-left" class="icon-button" aria-label="Rotate left 90 degrees" title="Rotate left">${svg('left')}</button>
              <button id="rotate-right" class="icon-button" aria-label="Rotate right 90 degrees" title="Rotate right">${svg('right')}</button>
              <span class="control-divider"></span><button id="zoom-out" class="icon-button" aria-label="Zoom out">${svg('minus')}</button><span id="zoom-label" class="zoom-label">100%</span><button id="zoom-in" class="icon-button" aria-label="Zoom in">${svg('plus')}</button>
              <button id="reset-view" class="icon-button" title="Reset rotation, zoom, and pan">${svg('reset')}<span class="optional">Reset</span></button>
              <span class="spacer"></span><button id="set-area" class="icon-button" aria-pressed="false">${svg('area')}<span>Set tracking area</span></button>
              <button id="focus" class="icon-button" aria-pressed="false" disabled>Focus</button>
              <button id="fullscreen" class="icon-button" aria-label="Toggle video fullscreen" title="Fullscreen (Esc to exit)">${svg('expand')}</button>
            </div>
            <div class="tracking-strip"><span class="tiny-area"></span><span id="area-status">Movement tracking needs a selected area.</span><button class="text-button" id="whole-frame">Use full frame</button></div>
          </section>
          <section class="card timeline-card" aria-label="Movement timeline"><div class="timeline-top"><h2>Movement timeline</h2><div class="segment" role="group" aria-label="Timeline duration"><button data-window="15" aria-pressed="true">15m</button><button data-window="60" aria-pressed="false">1h</button><button data-window="120" aria-pressed="false">2h</button></div></div>
            <canvas class="timeline" id="timeline" role="img" aria-label="Movement timeline. No observations yet."></canvas><div class="timeline-labels"><span id="timeline-start">15 minutes ago</span><span>Now</span></div>
            <div class="timeline-footer"><div class="legend"><span><i></i>Little movement</span><span><i class="motion"></i>Movement</span><span><i class="gap"></i>No data</span></div><span id="observed-time">0s observed</span></div><div id="timeline-readout" class="timeline-readout">Hover over the timeline to inspect an observation.</div>
          </section>
          ${demo ? '<div class="demo-controls"><span>TEST FEED</span><button data-demo="quiet" aria-pressed="true">Quiet</button><button data-demo="moving" aria-pressed="false">Moving</button><button data-demo="lighting">Lighting change</button><button data-demo="paused" aria-pressed="false">Interrupt feed</button><button data-demo="replace">Replace video</button></div>' : ''}
          <footer class="footnote"><span>Activity describes visible movement. It does not confirm sleep or breathing.</span><span id="session-start">Current session</span></footer>
        </div><aside class="sidebar" aria-label="Activity and event log">
          <section class="card activity-card" id="activity-card" data-state="offline" aria-label="Live activity"><div class="card-kicker"><span>Right now</span><span id="quality">Waiting</span></div><div class="activity-icon">${svg('moon')}</div><h2 class="activity-title" id="activity-title" aria-live="polite">Getting ready</h2><p class="activity-detail" id="activity-detail">Waiting for a live video frame.</p><div class="meter" role="meter" aria-label="Changed pixels in tracking area" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="motion-meter"><div class="meter-fill" id="meter-fill"></div></div><div class="meter-label"><span>Movement intensity</span><span id="score">—</span></div><div class="activity-stats"><div><div class="stat-value" id="quiet-time">—</div><div class="stat-label">Current quiet stretch</div></div><div><div class="stat-value" id="burst-count">0</div><div class="stat-label">Movement bursts</div></div></div></section>
          <section class="card reminder-card" aria-label="Quiet reminder settings"><div class="log-header"><h2>Quiet reminder</h2><button id="quiet-enable" class="small-button" aria-pressed="false">Turn on</button></div><div class="settings-row"><label for="quiet-delay">After little movement for</label><select id="quiet-delay"><option value="30">30 seconds</option><option value="60">1 minute</option><option value="120" selected>2 minutes</option><option value="300">5 minutes</option><option value="600">10 minutes</option><option value="900">15 minutes</option></select></div><div class="settings-row"><span>Chime</span><button id="quiet-sound" class="small-button" aria-pressed="true">On</button></div><p id="quiet-status" class="reminder-status">Reminder is off.</p><div class="reminder-actions"><button id="quiet-test" class="small-button">Test reminder</button><button id="quiet-arm" class="small-button" hidden>Enable chime</button></div><p id="quiet-audio-status" class="help-copy"></p><p class="help-copy">Counts only fresh observations while this tab is visible. Gaps and pauses restart the timer. This does not assess breathing or wellbeing.</p></section>
          <section class="card" aria-label="Automatic event log"><div class="log-header"><h2>Activity log</h2><button id="export" class="small-button">Export CSV</button></div><div class="subtitle" style="margin-bottom:16px">Automatic events · most recent first</div><ol class="events" id="events"></ol><div class="empty-log" id="empty-log">Movement events will appear here once tracking starts.</div><form id="note-form" class="note-form"><input id="note" type="text" maxlength="200" placeholder="Add a note…" aria-label="Event note"><button type="submit">Add</button></form><div class="help-copy">Notes stay on this device. Events are retained for 24 hours, up to 250 entries.</div></section>
          <section class="card" aria-label="Tracking settings"><div class="settings-row"><label for="sensitivity">Movement sensitivity</label><select id="sensitivity"><option value="low">Low</option><option value="normal" selected>Normal</option><option value="high">High</option></select></div><div class="settings-row"><span>Observation</span><button id="pause" class="small-button" aria-pressed="false">Pause tracking</button></div><p class="help-copy">Patterns, shadows, and rocking can affect motion estimates. Keep this tab visible for continuous observation.</p><p class="help-copy privacy">Video frames stay in memory. Only event text, movement samples, and your settings are saved locally.</p></section>
        </aside></main>
      </div><button class="open-button" id="open" hidden><span>☾</span> Ripples activity view</button><div id="toast" class="toast" role="status" hidden></div>
      <section id="quiet-banner" class="quiet-banner" role="alert" aria-atomic="true" hidden><strong id="quiet-banner-title">Quiet reminder</strong><p id="quiet-banner-detail"></p><div class="reminder-actions"><button id="quiet-review">Review live view</button><button id="quiet-dismiss">Dismiss</button></div></section>`;

    const $ = (id) => root.getElementById(id);
    const app = root.querySelector('.app');
    const viewer = $('viewer');
    const canvas = $('video-canvas');
    const ctx = canvas.getContext('2d');
    const timeline = $('timeline');
    const timelineContext = timeline.getContext('2d');
    let sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 160; sampleCanvas.height = 90;
    let sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
    const tracker = new core.ActivityTracker();
    const reminder = new scope.NanitActivityAlerts.QuietReminder();
    const chime = scope.NanitActivityAlerts.createChime();
    const started = Date.now();
    let source = null, callbackId = null, sourceWidth = 0, sourceHeight = 0;
    let lastFrame = 0, sourceAttachedAt = Date.now(), lastMediaTime = -1, lastSample = 0, lastBucket = 0, lastTick = 0;
    let result = null, region = null, rotation = 0, zoom = 1, focused = false, pan = { x: 0, y: 0 };
    let selecting = false, drag = null, transform = null, paused = false, blocked = false;
    let events = [], samples = [], windowMinutes = 15, burstCount = 0;
    let stateKey = '', needsDraw = true, closed = false, expanded = false, saveTimer = null, toastTimer = null;
    let gapOpen = false, knownLive = false, lastRenderedSecond = 0, booted = false;
    let savedDimensions = null;
    let audioBusy = false;
    let soundEnabled = null, audioRestored = false, audioNeedsClick = false;
    let quietAlertEnabled = false, quietAlertSeconds = 120, quietAlertSound = true, quietTestActive = false;
    const storageKey = demo ? 'nanit-activity-demo-v1' : 'nanit-activity-v1';
    const preferencesKey = `${storageKey}-preferences`;
    const storage = !demo && scope.chrome?.storage?.local ? {
      async load() {
        const saved = await chrome.storage.local.get([storageKey, preferencesKey]);
        return { data: saved[storageKey], preferences: saved[preferencesKey] ?? saved[storageKey]?.prefs };
      },
      async save(value) { await chrome.storage.local.set({ [storageKey]: value }); },
      async savePreferences(value) { await chrome.storage.local.set({ [preferencesKey]: value }); },
    } : {
      async load() {
        const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
        const data = read(storageKey);
        return { data, preferences: read(preferencesKey) ?? data?.prefs };
      },
      async save(value) { localStorage.setItem(storageKey, JSON.stringify(value)); },
      async savePreferences(value) { localStorage.setItem(preferencesKey, JSON.stringify(value)); },
    };

    function toast(message) {
      $('toast').textContent = message; $('toast').hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
    }
    function prune() {
      const now = Date.now();
      events = events.filter(e => e.time >= now - 86400000).slice(0, 250);
      samples = samples.filter(s => s.time >= now - 7200000).slice(-7200);
    }
    function currentPreferences() {
      return scope.NanitActivityPreferences.snapshot({ region, dimensions: savedDimensions, rotation, zoom,
        focused, pan, sensitivity: tracker.sensitivity, windowMinutes, paused, closed, expanded, soundEnabled,
        quietAlertEnabled, quietAlertSeconds, quietAlertSound });
    }
    function savePreferences() {
      if (!booted) return;
      // A dedicated key prevents the slower history writer from overwriting a recent view change.
      storage.savePreferences(currentPreferences()).catch(() => toast('Your viewing settings could not be saved locally.'));
    }
    function saveSoon() {
      if (saveTimer || !booted) return;
      saveTimer = setTimeout(async () => {
        saveTimer = null; prune();
        try {
          await storage.save({ events, samples, prefs: currentPreferences() });
        } catch { toast('Local storage is unavailable. This session is still visible.'); }
      }, 1500);
    }
    function addEvent(kind, title, detail = '', time = Date.now()) {
      events.unshift({ kind, title, detail, time }); prune(); renderEvents(); saveSoon();
    }
    function renderEvents() {
      $('events').replaceChildren();
      $('empty-log').hidden = events.length > 0;
      for (const event of events) {
        const li = document.createElement('li'); li.className = 'event'; li.dataset.kind = event.kind;
        const dot = document.createElement('span'); dot.className = 'event-dot';
        const content = document.createElement('div');
        const line = document.createElement('div'); line.className = 'event-line';
        const title = document.createElement('span'); title.className = 'event-title'; title.textContent = event.title;
        const time = document.createElement('time'); time.className = 'event-time'; time.dateTime = new Date(event.time).toISOString();
        time.textContent = clock(event.time); time.title = new Date(event.time).toLocaleString();
        const detail = document.createElement('div'); detail.className = 'event-detail'; detail.textContent = event.detail;
        line.append(title, time); content.append(line, detail); li.append(dot, content); $('events').append(li);
      }
    }
    function resetTracking(reason, log = true) {
      tracker.reset(); result = null; lastSample = 0;
      reminder.reset(); quietTestActive = false; updateQuietControls(Date.now());
      if (log) addEvent('settings', reason, 'Estimates restart with a 3-second calibration.');
    }
    function updateQuietControls(now) {
      reminder.expire(now);
      const status = reminder.snapshot();
      $('quiet-enable').textContent = quietAlertEnabled ? 'Turn off' : 'Turn on';
      $('quiet-enable').setAttribute('aria-pressed', String(quietAlertEnabled));
      $('quiet-delay').value = String(quietAlertSeconds);
      $('quiet-sound').textContent = quietAlertSound ? 'On' : 'Off';
      $('quiet-sound').setAttribute('aria-pressed', String(quietAlertSound));
      let text = 'Reminder is off.';
      if (quietAlertEnabled) {
        if (document.hidden) text = 'Paused while this tab is hidden.';
        else if (paused) text = 'Tracking paused — timer has restarted.';
        else if (!region) text = 'Select a tracking area to start the timer.';
        else if (blocked || result?.state === 'unclear') text = 'Analysis unavailable — timer has restarted.';
        else if (!lastFrame || now - lastFrame > 1800) text = 'Waiting for fresh observations.';
        else if (!result || result.state === 'calibrating') text = 'Waiting for calibration.';
        else if (status.fired) text = status.active ? 'Quiet reminder shown.' : 'Dismissed — movement will rearm the reminder.';
        else if (status.observing) text = `Quiet for ${duration(status.quietMs)} of ${duration(quietAlertSeconds * 1000)}.`;
        else text = 'Movement detected — waiting for a quiet stretch.';
      }
      $('quiet-status').textContent = text;
      $('quiet-audio-status').textContent = !quietAlertSound ? 'Chime is off.' : chime.ready() ? 'Chime is ready in this tab.' : 'Click Test reminder or Enable chime to allow sound in this tab.';
      $('quiet-arm').hidden = !quietAlertEnabled || !quietAlertSound || chime.ready();
      const banner = $('quiet-banner');
      const parent = (root.fullscreenElement || document.fullscreenElement) === viewer ? viewer : root;
      if (banner.parentNode !== parent) parent.append(banner);
      banner.hidden = !status.active && !quietTestActive;
    }
    async function armQuietChime() {
      try { await chime.arm(); }
      catch { toast('Chime could not be enabled. The on-screen reminder still works. Try Test reminder.'); }
      updateQuietControls(Date.now());
    }
    function showQuietReminder(test = false) {
      quietTestActive = test;
      $('quiet-banner-title').textContent = test ? 'Test reminder' : `Little movement observed for ${duration(quietAlertSeconds * 1000)}`;
      $('quiet-banner-detail').textContent = test ? 'This is a test of the on-screen reminder. No quiet threshold was reached.' : 'Review the live video. This reminder does not assess breathing or wellbeing.';
      addEvent('reminder', test ? 'Quiet reminder tested' : 'Quiet reminder', test ? 'Manual test; no activity condition was inferred.' : `Little movement was continuously observed for ${duration(quietAlertSeconds * 1000)}. Review the live video.`);
      if (!test && quietAlertSound && !chime.play()) $('quiet-banner-detail').textContent += ' Chime was unavailable; enable it from the reminder settings.';
      updateQuietControls(Date.now());
    }
    function sourcePoint(event) {
      if (!transform || !sourceWidth) return null;
      const bounds = canvas.getBoundingClientRect();
      return core.inversePoint(transform, (event.clientX - bounds.left) * canvas.width / bounds.width,
        (event.clientY - bounds.top) * canvas.height / bounds.height);
    }
    function commitRegion(next, label) {
      region = next; focused = false; zoom = 1; pan = { x: 0, y: 0 }; selecting = false;
      savedDimensions = sourceWidth && sourceHeight ? [sourceWidth, sourceHeight] : null;
      $('set-area').setAttribute('aria-pressed', 'false');
      $('focus').disabled = !region; $('focus').setAttribute('aria-pressed', 'false');
      resetTracking(label); updateControls(); savePreferences(); needsDraw = true;
      updateStatus(Date.now());
    }
    function updateControls() {
      $('zoom-label').textContent = `${Math.round(zoom * 100)}%`;
      $('zoom-out').disabled = zoom <= 1; $('zoom-in').disabled = zoom >= 4;
      $('set-area').setAttribute('aria-pressed', String(selecting));
      $('focus').setAttribute('aria-pressed', String(focused));
      $('pause').textContent = paused ? 'Resume tracking' : 'Pause tracking';
      $('pause').setAttribute('aria-pressed', String(paused));
      root.querySelectorAll('[data-window]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.window) === windowMinutes)));
      viewer.classList.toggle('selecting', selecting); viewer.classList.toggle('pannable', zoom > 1 && !selecting);
      $('area-status').textContent = region ? (region.w === 1 && region.h === 1 ? 'Tracking the full frame; room movement is included.' : 'Tracking the outlined area. Drag the video when zoomed.') : 'Movement tracking needs a selected area.';
      $('viewer-message').textContent = selecting ? 'Drag a rectangle around your baby. Escape cancels.' : !region ? 'Select the area around your baby to start tracking movement.' : 'Drag to pan · use + and − to zoom';
      $('viewer-message').hidden = !!region && !selecting && zoom <= 1;
    }
    function updateSoundControls() {
      const audio = scope.NanitActivityAudio.state(source);
      $('sound').disabled = !audio.available || audioBusy;
      $('sound').setAttribute('aria-pressed', String(audio.enabled));
      $('sound').setAttribute('aria-label', audio.enabled ? 'Turn live sound off' : 'Turn live sound on');
      $('sound').title = audio.enabled ? 'Mute the live Nanit player' : audioNeedsClick ? 'Your sound preference is saved. Click to allow playback in this browser.' : 'Enable sound from the live Nanit player';
      $('sound-label').textContent = audioBusy ? 'Enabling…' : audio.enabled ? 'Sound on' : audioNeedsClick ? 'Enable sound' : audio.paused && source ? 'Sound paused' : 'Sound off';
      $('sound-icon').innerHTML = svg(audio.enabled ? 'sound' : 'muted');
    }
    function restoreSoundPreference() {
      if (audioRestored || audioBusy || !scope.NanitActivityAudio.state(source).available) return;
      audioRestored = true;
      audioNeedsClick = scope.NanitActivityAudio.restorePreference(source, soundEnabled).needsClick;
    }
    function restoreViewMode() {
      app.hidden = closed; $('open').hidden = !closed;
      document.body.inert = closed ? originalBodyInert : true;
      viewer.classList.toggle('theatre', expanded && !closed);
      $('exit-expanded').hidden = !expanded || closed;
      needsDraw = true;
    }
    function invalidateTrackingArea() {
      region = null; savedDimensions = null; focused = false; zoom = 1; pan = { x: 0, y: 0 };
      $('focus').disabled = true; updateControls(); savePreferences();
    }
    function resizeCanvas(element, context) {
      const bounds = element.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(bounds.width * ratio));
      const height = Math.max(1, Math.round(bounds.height * ratio));
      if (element.width !== width || element.height !== height) {
        element.width = width; element.height = height; needsDraw = true;
      }
      return { width, height, ratio };
    }
    function drawVideo() {
      if (closed || !source || !sourceWidth || source.readyState < 2) return;
      resizeCanvas(canvas, ctx);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#132624'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      transform = core.viewTransform(sourceWidth, sourceHeight, canvas.width, canvas.height, rotation, zoom,
        focused ? region : null, { x: pan.x * canvas.width, y: pan.y * canvas.height });
      ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
      try { ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight); } catch { return; }
      const selected = drag?.mode === 'select' ? core.normalizeRegion(drag.start, drag.end, sourceWidth, sourceHeight) : region;
      if (selected) {
        const scale = Math.hypot(transform.a, transform.b);
        ctx.strokeStyle = '#d1e3b7'; ctx.lineWidth = 1.5 / scale; ctx.setLineDash([7 / scale, 5 / scale]);
        ctx.strokeRect(selected.x * sourceWidth, selected.y * sourceHeight, selected.w * sourceWidth, selected.h * sourceHeight);
        ctx.setLineDash([]);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); needsDraw = false;
    }
    function recordSample(time, value, state) {
      const bucket = Math.floor(time / 1000);
      if (bucket === lastBucket) return;
      lastBucket = bucket; samples.push({ time, score: value, state }); prune(); saveSoon();
    }
    function sampleFrame(time) {
      if (!booted || !region || paused || blocked || document.hidden || time - lastSample < 200) return;
      lastSample = time;
      try {
        sampleContext.drawImage(source, region.x * sourceWidth, region.y * sourceHeight,
          region.w * sourceWidth, region.h * sourceHeight, 0, 0, 160, 90);
        const rgba = sampleContext.getImageData(0, 0, 160, 90).data;
        const gray = new Uint8Array(160 * 90);
        for (let i = 0, p = 0; i < rgba.length; i += 4, p++) gray[p] = Math.round(rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114);
        const priorState = result?.state;
        result = tracker.update(gray, time);
        if (reminder.observe(result.state, time)) showQuietReminder();
        updateQuietControls(time);
        if (result.state === 'unclear' && priorState !== 'unclear') addEvent('gap', 'View became unclear', 'There is too little image detail for a movement estimate.');
        if (result.gap && knownLive && !gapOpen) {
          addEvent('gap', 'Observation interrupted', 'A sampling gap occurred. Quiet time has restarted.');
        }
        for (const event of result.events) {
          if (event.type === 'movement-start') { burstCount++; addEvent('movement-start', 'Movement detected', 'A movement burst began in the selected area.', event.time); }
          else addEvent('movement-end', 'Movement settled', `Movement burst lasted about ${duration(event.duration)}.`, event.time);
        }
        recordSample(time, result.state === 'unclear' || result.state === 'calibrating' ? null : result.score, result.state);
      } catch (error) {
        blocked = true; resetTracking('', false);
        addEvent('gap', 'Video analysis unavailable', 'The video cannot be sampled in this browser. Original Nanit viewing is still available.');
        toast('This video is protected from frame analysis. Use Back to Nanit for the original feed.');
      }
    }
    function onFrame(video, mediaTime) {
      if (source !== video || host.isConnected === false) return;
      if (sourceWidth !== video.videoWidth || sourceHeight !== video.videoHeight) {
        sourceWidth = video.videoWidth; sourceHeight = video.videoHeight; transform = null;
        if (savedDimensions && (sourceWidth !== savedDimensions[0] || sourceHeight !== savedDimensions[1])) {
          invalidateTrackingArea();
          resetTracking('Camera dimensions changed; select a new tracking area');
        } else resetTracking('', false);
      }
      const time = Date.now();
      if (lastTick && time - lastTick > 1800 && knownLive && !gapOpen) {
        gapOpen = true; addEvent('gap', 'Observation interrupted', 'The tab was inactive or frames were delayed. Quiet time has restarted.');
        resetTracking('', false);
      }
      lastFrame = time; lastMediaTime = mediaTime; needsDraw = true;
      if (gapOpen && !document.hidden) { gapOpen = false; resetTracking('', false); addEvent('connection', 'Video resumed', 'Activity estimates restart after calibration.'); }
      sampleFrame(time); knownLive = true;
    }
    function watchFrames(video) {
      if (typeof video.requestVideoFrameCallback !== 'function') return;
      callbackId = video.requestVideoFrameCallback((_, metadata) => {
        if (source !== video) return;
        onFrame(video, metadata.mediaTime); watchFrames(video);
      });
    }
    function findVideo() {
      const candidates = Array.from(document.querySelectorAll('video')).filter(v => v.isConnected && (v.getBoundingClientRect().width > 0 || demo));
      const next = candidates.sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
      if (next === source) return;
      if (source && callbackId !== null) source.cancelVideoFrameCallback?.(callbackId);
      if (source) for (const event of ['volumechange', 'play', 'pause', 'emptied']) source.removeEventListener(event, updateSoundControls);
      source = next || null; sourceAttachedAt = Date.now(); lastFrame = 0; lastMediaTime = -1; callbackId = null; blocked = false;
      audioRestored = false; audioNeedsClick = false;
      updateSoundControls();
      // A fresh canvas also clears any taint left by a previous media source.
      sampleCanvas = document.createElement('canvas'); sampleCanvas.width = 160; sampleCanvas.height = 90;
      sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
      resetTracking('', false);
      if (!source) return;
      for (const event of ['volumechange', 'play', 'pause', 'emptied']) source.addEventListener(event, updateSoundControls);
      sourceWidth = source.videoWidth; sourceHeight = source.videoHeight;
      if (!knownLive && savedDimensions && sourceWidth && sourceHeight &&
          (savedDimensions[0] !== sourceWidth || savedDimensions[1] !== sourceHeight)) {
        invalidateTrackingArea();
        addEvent('settings', 'Camera dimensions changed', 'Select a tracking area for this camera.');
      }
      if (knownLive) {
        // A replacement can be a different camera with identical dimensions.
        invalidateTrackingArea();
        addEvent('connection', 'Video source changed', 'Select a tracking area for this source.');
      }
      watchFrames(source);
    }
    function drawTimeline(now) {
      const { width, height, ratio } = resizeCanvas(timeline, timelineContext);
      const context = timelineContext; context.clearRect(0, 0, width, height);
      const range = windowMinutes * 60000, start = now - range;
      context.strokeStyle = '#e7ece4'; context.lineWidth = ratio;
      for (const y of [0.25, 0.6, 0.95]) { context.beginPath(); context.moveTo(0, y * height); context.lineTo(width, y * height); context.stroke(); }
      const bins = Math.max(1, Math.floor(width / (4 * ratio)));
      const values = Array.from({ length: bins }, () => ({ max: null, state: 'gap', count: 0 }));
      let observations = 0;
      for (const sample of samples) {
        if (sample.time < start || sample.time > now) continue;
        const index = Math.min(bins - 1, Math.floor((sample.time - start) / range * bins));
        if (sample.score !== null) {
          values[index].max = Math.max(values[index].max || 0, sample.score);
          if (sample.state === 'moving' || sample.state === 'sustained') values[index].state = 'moving';
          else if (values[index].state !== 'moving') values[index].state = 'quiet';
          values[index].count++; observations++;
        }
      }
      for (let i = 0; i < bins; i++) {
        const bin = values[i];
        if (bin.max === null) continue;
        const barHeight = (0.06 + Math.min(1, bin.max / 25) * 0.78) * height;
        context.fillStyle = bin.state === 'moving' ? '#c69a62' : '#83a283';
        context.fillRect(i * width / bins, height * 0.95 - barHeight, Math.max(1, width / bins - ratio * 1.5), barHeight);
      }
      $('timeline-start').textContent = clock(start);
      $('observed-time').textContent = `${duration(observations * 1000)} observed`;
      timeline.setAttribute('aria-label', `Movement timeline for the last ${windowMinutes} minutes. ${duration(observations * 1000)} of observations; blank areas have no data.`);
    }
    function updateStatus(now) {
      restoreSoundPreference();
      updateSoundControls();
      updateQuietControls(now);
      const age = lastFrame ? now - lastFrame : Infinity;
      const live = source && age < 5000;
      $('viewer-empty').hidden = !!lastFrame;
      $('feed-dot').classList.toggle('offline', !live);
      $('feed-label').textContent = live ? (demo ? 'Simulated feed' : 'Frames arriving') : lastFrame ? 'Video delayed' : 'Waiting for Nanit';
      $('frame-age').textContent = lastFrame ? (age < 1000 ? 'Frame received just now' : `Last frame ${duration(age)} ago`) : 'Waiting for video';
      let state, title, detail, quality;
      if (paused) { state = 'offline'; title = 'Tracking paused'; detail = 'Video is still visible. Activity estimates are paused.'; quality = 'Paused'; }
      else if (blocked) { state = 'offline'; title = 'Analysis unavailable'; detail = 'This browser cannot sample the video. Return to Nanit to use the original view.'; quality = 'Unavailable'; }
      else if (!live) { state = 'offline'; title = lastFrame ? 'Observation interrupted' : 'Getting ready'; detail = lastFrame ? 'New video frames are delayed. There is no activity estimate.' : 'Waiting for a live video frame.'; quality = 'No signal'; }
      else if (!region) { state = 'offline'; title = 'Choose a tracking area'; detail = 'Outline the area around your baby to start observing movement.'; quality = 'Setup needed'; }
      else if (!result || result.state === 'calibrating') { state = 'calibrating'; title = 'Getting a baseline'; detail = 'A few seconds of frames help separate changes from background noise.'; quality = 'Calibrating'; }
      else if (result.state === 'unclear') { state = 'offline'; title = 'View is unclear'; detail = 'Too little image detail for a movement estimate. Check the tracking area.'; quality = 'Low detail'; }
      else if (result.state === 'quiet') { state = 'quiet'; title = 'Little movement'; detail = 'Only small changes are visible inside the tracking area.'; quality = 'Observing'; }
      else if (result.state === 'sustained') { state = 'sustained'; title = 'Sustained movement'; detail = 'Movement has continued for at least six seconds.'; quality = 'Observing'; }
      else { state = 'moving'; title = 'Movement detected'; detail = 'A burst of movement is visible inside the tracking area.'; quality = 'Observing'; }
      const key = `${state}|${title}`;
      if (key !== stateKey) {
        stateKey = key; $('activity-card').dataset.state = state;
        $('activity-title').textContent = title; $('activity-detail').textContent = detail;
      }
      $('quality').textContent = quality;
      const measurable = live && !paused && !blocked && result && !['unclear', 'calibrating'].includes(result.state);
      const score = measurable ? result.score : 0;
      $('meter-fill').style.width = `${Math.min(100, score * 4)}%`;
      $('motion-meter').setAttribute('aria-valuenow', score.toFixed(1));
      $('score').textContent = measurable ? `${score.toFixed(1)}% changed` : '—';
      $('quiet-time').textContent = measurable && result.quietSince !== null ? duration(now - result.quietSince) : '—';
      $('burst-count').textContent = String(burstCount);
      if (!live && knownLive && !gapOpen && !paused && now - (lastFrame || sourceAttachedAt) >= 5000) {
        gapOpen = true; resetTracking('', false);
        addEvent('gap', 'Video frames delayed', 'Activity is unknown until new frames arrive.');
      }
      if (!live || paused || blocked || !region) recordSample(now, null, 'gap');
    }
    function tick(time) {
      if (!host.isConnected) return;
      const now = Date.now();
      if (source && !source.requestVideoFrameCallback && source.readyState >= 2 && !source.paused && source.currentTime !== lastMediaTime) onFrame(source, source.currentTime);
      if (needsDraw && time - lastRenderedSecond > 33) { drawVideo(); lastRenderedSecond = time; }
      if (Math.floor(now / 500) !== Math.floor(lastTick / 500)) {
        updateStatus(now); if (!closed) drawTimeline(now);
      }
      lastTick = now;
      requestAnimationFrame(tick);
    }

    $('rotate-left').addEventListener('click', () => { rotation = (rotation + 270) % 360; pan = { x: 0, y: 0 }; needsDraw = true; savePreferences(); });
    $('sound').addEventListener('click', async () => {
      if (audioBusy) return;
      audioBusy = true;
      const media = source;
      const enabled = !scope.NanitActivityAudio.state(media).enabled;
      soundEnabled = enabled; audioRestored = true; audioNeedsClick = false; savePreferences();
      try {
        const pending = scope.NanitActivityAudio.setSound(media, enabled);
        updateSoundControls();
        await pending;
      } catch {
        audioNeedsClick = enabled;
        toast('Sound could not start. Try Sound again, or use the speaker control in Back to Nanit.');
      } finally { audioBusy = false; updateSoundControls(); }
    });
    $('rotate-right').addEventListener('click', () => { rotation = (rotation + 90) % 360; pan = { x: 0, y: 0 }; needsDraw = true; savePreferences(); });
    const changeZoom = (amount) => { zoom = Math.round(Math.max(1, Math.min(4, zoom + amount)) * 100) / 100; if (zoom === 1) pan = { x: 0, y: 0 }; updateControls(); needsDraw = true; savePreferences(); };
    $('zoom-in').addEventListener('click', () => changeZoom(0.25)); $('zoom-out').addEventListener('click', () => changeZoom(-0.25));
    $('reset-view').addEventListener('click', () => { rotation = 0; zoom = 1; pan = { x: 0, y: 0 }; focused = false; updateControls(); needsDraw = true; savePreferences(); });
    $('set-area').addEventListener('click', () => { selecting = !selecting; if (selecting) { focused = false; zoom = 1; pan = { x: 0, y: 0 }; } updateControls(); needsDraw = true; savePreferences(); canvas.focus(); });
    $('whole-frame').addEventListener('click', () => commitRegion({ x: 0, y: 0, w: 1, h: 1 }, 'Full-frame tracking selected'));
    $('focus').addEventListener('click', () => { if (!region) return; focused = !focused; zoom = 1; pan = { x: 0, y: 0 }; updateControls(); needsDraw = true; savePreferences(); });
    function exitExpanded() {
      expanded = false;
      viewer.classList.remove('theatre'); $('exit-expanded').hidden = true;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      needsDraw = true; savePreferences();
    }
    $('fullscreen').addEventListener('click', async () => {
      if (document.fullscreenElement || viewer.classList.contains('theatre')) return exitExpanded();
      try { await viewer.requestFullscreen(); }
      catch { viewer.classList.add('theatre'); }
      expanded = true; $('exit-expanded').hidden = false; needsDraw = true; savePreferences();
    });
    $('exit-expanded').addEventListener('click', exitExpanded);
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !viewer.classList.contains('theatre')) { expanded = false; $('exit-expanded').hidden = true; savePreferences(); } needsDraw = true; updateQuietControls(Date.now()); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && viewer.classList.contains('theatre')) exitExpanded(); });
    $('sensitivity').addEventListener('change', () => { tracker.sensitivity = $('sensitivity').value; resetTracking('Movement sensitivity changed'); savePreferences(); });
    $('pause').addEventListener('click', () => { paused = !paused; updateControls(); resetTracking('', false); addEvent('settings', paused ? 'Tracking paused' : 'Tracking resumed', paused ? 'No movement estimates are recorded while paused.' : 'Calibration starts with the next video frames.'); savePreferences(); updateStatus(Date.now()); });
    $('back').addEventListener('click', () => { closed = true; expanded = false; restoreViewMode(); savePreferences(); $('open').focus(); if (demo) toast('Preview minimized. Click Ripples activity view to reopen.'); });
    $('open').addEventListener('click', () => { closed = false; restoreViewMode(); savePreferences(); $('back').focus(); });
    $('quiet-enable').addEventListener('click', () => {
      quietAlertEnabled = !quietAlertEnabled; quietTestActive = false;
      reminder.configure(quietAlertEnabled, quietAlertSeconds); savePreferences(); updateQuietControls(Date.now());
      if (quietAlertEnabled && quietAlertSound) armQuietChime();
    });
    $('quiet-delay').addEventListener('change', () => {
      quietAlertSeconds = Number($('quiet-delay').value); quietTestActive = false;
      reminder.configure(quietAlertEnabled, quietAlertSeconds); savePreferences(); updateQuietControls(Date.now());
    });
    $('quiet-sound').addEventListener('click', () => {
      quietAlertSound = !quietAlertSound; savePreferences(); updateQuietControls(Date.now());
      if (quietAlertSound) armQuietChime();
    });
    $('quiet-arm').addEventListener('click', armQuietChime);
    $('quiet-test').addEventListener('click', async () => {
      showQuietReminder(true);
      if (quietAlertSound) {
        await armQuietChime();
        if (!chime.play()) toast('The test message is visible, but the chime could not play.');
      }
      updateQuietControls(Date.now());
    });
    $('quiet-dismiss').addEventListener('click', () => {
      quietTestActive = false; reminder.dismiss(); updateQuietControls(Date.now());
      (document.fullscreenElement ? canvas : closed ? $('open') : $('quiet-test')).focus();
    });
    $('quiet-review').addEventListener('click', () => {
      closed = false; exitExpanded(); restoreViewMode(); savePreferences(); canvas.focus();
    });
    $('note-form').addEventListener('submit', (event) => { event.preventDefault(); const text = $('note').value.trim(); if (!text) return; addEvent('note', 'Your note', text); $('note').value = ''; toast('Note saved on this device.'); });
    $('export').addEventListener('click', () => {
      const blob = new Blob(['\uFEFF' + core.csv(events)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `ripples-activity-${new Date().toISOString().slice(0, 10)}.csv`; root.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 15000);
    });
    root.querySelectorAll('[data-window]').forEach(button => button.addEventListener('click', () => {
      windowMinutes = Number(button.dataset.window); updateControls(); drawTimeline(Date.now()); savePreferences();
    }));
    timeline.addEventListener('pointermove', (event) => {
      const bounds = timeline.getBoundingClientRect(); const at = Date.now() - (1 - (event.clientX - bounds.left) / bounds.width) * windowMinutes * 60000;
      const nearest = samples.reduce((best, sample) => !best || Math.abs(sample.time - at) < Math.abs(best.time - at) ? sample : best, null);
      $('timeline-readout').textContent = nearest && Math.abs(nearest.time - at) < 2000 && nearest.score !== null ? `${clock(nearest.time)} · ${nearest.score.toFixed(1)}% of pixels changed · ${['moving', 'sustained'].includes(nearest.state) ? 'movement' : 'little movement'}` : `${clock(at)} · No observation available`;
    });
    timeline.addEventListener('pointerleave', () => { $('timeline-readout').textContent = 'Hover over the timeline to inspect an observation.'; });
    canvas.addEventListener('pointerdown', event => {
      if (!sourceWidth || !transform) return;
      if (selecting) { const start = sourcePoint(event); drag = { mode: 'select', start, end: start }; }
      else if (zoom > 1) { drag = { mode: 'pan', start: { x: event.clientX, y: event.clientY }, original: { ...pan } }; viewer.classList.add('dragging'); }
      if (drag) { canvas.setPointerCapture(event.pointerId); event.preventDefault(); }
    });
    canvas.addEventListener('pointermove', event => {
      if (!drag) return;
      if (drag.mode === 'select') drag.end = sourcePoint(event);
      else { const bounds = canvas.getBoundingClientRect(); pan = { x: Math.max(-1, Math.min(1, drag.original.x + (event.clientX - drag.start.x) / bounds.width)), y: Math.max(-1, Math.min(1, drag.original.y + (event.clientY - drag.start.y) / bounds.height)) }; }
      needsDraw = true;
    });
    canvas.addEventListener('pointerup', event => {
      if (drag?.mode === 'select') { const next = core.normalizeRegion(drag.start, sourcePoint(event), sourceWidth, sourceHeight); if (next) commitRegion(next, 'Tracking area selected'); else toast('Select a larger rectangle inside the video.'); }
      drag = null; viewer.classList.remove('dragging'); needsDraw = true; savePreferences();
    });
    canvas.addEventListener('pointercancel', () => { drag = null; viewer.classList.remove('dragging'); needsDraw = true; savePreferences(); });
    canvas.addEventListener('keydown', event => {
      if (event.key === 'Escape') { selecting = false; drag = null; updateControls(); needsDraw = true; }
      else if (event.key === '+' || event.key === '=') { changeZoom(0.25); event.preventDefault(); }
      else if (event.key === '-') { changeZoom(-0.25); event.preventDefault(); }
      else if (zoom > 1 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        const dx = event.key === 'ArrowLeft' ? 0.04 : event.key === 'ArrowRight' ? -0.04 : 0;
        const dy = event.key === 'ArrowUp' ? 0.04 : event.key === 'ArrowDown' ? -0.04 : 0;
        pan = { x: Math.max(-1, Math.min(1, pan.x + dx)), y: Math.max(-1, Math.min(1, pan.y + dy)) }; needsDraw = true; savePreferences(); event.preventDefault();
      }
    });
    root.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('nanit-demo-control', { detail: button.dataset.demo }));
      if (['moving', 'quiet'].includes(button.dataset.demo)) root.querySelectorAll('[data-demo="moving"],[data-demo="quiet"]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      if (button.dataset.demo === 'paused') { const pressed = button.getAttribute('aria-pressed') !== 'true'; button.setAttribute('aria-pressed', String(pressed)); button.textContent = pressed ? 'Resume feed' : 'Interrupt feed'; }
    }));
    document.addEventListener('visibilitychange', () => {
      savePreferences();
      reminder.reset(); quietTestActive = false; updateQuietControls(Date.now());
      if (document.hidden && knownLive) { gapOpen = true; resetTracking('', false); addEvent('gap', 'Tab left foreground', 'Continuous observation may pause in a background tab.'); }
      else if (!document.hidden) { resetTracking('', false); needsDraw = true; }
    });
    const resizeObserver = new ResizeObserver(() => { needsDraw = true; if (!closed) drawTimeline(Date.now()); });
    resizeObserver.observe(viewer); resizeObserver.observe(timeline);
    (async () => {
      try {
        const loaded = await storage.load();
        const saved = loaded.data;
        if (saved && Array.isArray(saved.events) && Array.isArray(saved.samples)) {
          events = saved.events.filter(e => Number.isFinite(e.time) && typeof e.title === 'string' && typeof e.detail === 'string').slice(0, 250);
          samples = saved.samples.filter(s => Number.isFinite(s.time) && (s.score === null || Number.isFinite(s.score))).slice(-7200);
          if (samples.length) samples.push({ time: Date.now(), score: null, state: 'gap' });
        }
        const prefs = scope.NanitActivityPreferences.normalize(loaded.preferences);
        region = prefs.region; savedDimensions = prefs.dimensions; rotation = prefs.rotation; zoom = prefs.zoom;
        focused = prefs.focused; pan = prefs.pan; tracker.sensitivity = prefs.sensitivity;
        windowMinutes = prefs.windowMinutes; paused = prefs.paused; closed = prefs.closed;
        expanded = prefs.expanded; soundEnabled = prefs.soundEnabled;
        quietAlertEnabled = prefs.quietAlertEnabled; quietAlertSeconds = prefs.quietAlertSeconds; quietAlertSound = prefs.quietAlertSound;
      } catch { toast('Saved activity could not be loaded. Starting a fresh session.'); }
      reminder.configure(quietAlertEnabled, quietAlertSeconds); updateQuietControls(Date.now());
      prune(); renderEvents(); booted = true; $('sensitivity').value = tracker.sensitivity;
      $('focus').disabled = !region; updateControls(); restoreViewMode(); savePreferences();
      $('session-start').textContent = `Session started ${clock(started)}`;
      addEvent('session', demo ? 'Preview session started' : 'Observation session started', 'Only visible movement is estimated. No video is recorded.');
      findVideo(); setInterval(findVideo, 1000); requestAnimationFrame(tick);
      setInterval(() => { if (!document.hidden) { updateStatus(Date.now()); saveSoon(); } }, 5000);
    })();
  }
  scope.NanitActivityView = { mount };
})(globalThis);
