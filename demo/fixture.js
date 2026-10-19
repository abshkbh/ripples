(() => {
  'use strict';
  let mode = 'quiet', interrupted = false, light = 0, phase = 0;
  const scene = document.createElement('canvas'); scene.width = 1280; scene.height = 720;
  const context = scene.getContext('2d');
  let video = document.getElementById('test-video');
  let stream = scene.captureStream(20);
  video.srcObject = stream;
  const roundRect = (x, y, w, h, radius, fill, stroke) => {
    context.beginPath(); context.roundRect(x, y, w, h, radius);
    if (fill) { context.fillStyle = fill; context.fill(); }
    if (stroke) { context.strokeStyle = stroke; context.lineWidth = 3; context.stroke(); }
  };
  function draw() {
    phase += 1;
    context.fillStyle = '#d4c6ad'; context.fillRect(0, 0, 1280, 720);
    context.strokeStyle = '#c6b69b'; context.lineWidth = 2;
    for (let x = 0; x < 1280; x += 105) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x + 25, 720); context.stroke(); }
    context.save(); context.translate(640, 360); context.rotate(-0.06); context.translate(-640, -360);
    context.shadowColor = '#312c2425'; context.shadowBlur = 22;
    roundRect(360, 25, 560, 670, 54, '#e6e2d5', '#f4f1e6');
    context.shadowBlur = 0;
    roundRect(392, 54, 496, 612, 35, '#b9b4a0', '#e8e5d9');
    roundRect(415, 77, 450, 565, 27, '#bd9b86');
    context.fillStyle = '#d6b8a0';
    for (let y = 100; y < 620; y += 31) for (let x = 434; x < 854; x += 31) { context.beginPath(); context.arc(x, y, 1.5, 0, 7); context.fill(); }
    const move = mode === 'moving' ? Math.sin(phase * 0.3) * 22 : 0;
    context.save(); context.translate(640 + move, 365 + (mode === 'moving' ? Math.cos(phase * 0.23) * 12 : 0));
    context.rotate(mode === 'moving' ? Math.sin(phase * 0.15) * 0.08 : 0);
    roundRect(-79, -117, 158, 292, 67, '#e1e3cc', '#c4c8b4');
    context.save(); context.beginPath(); context.roundRect(-79, -117, 158, 292, 67); context.clip();
    context.strokeStyle = '#9fa98c'; context.lineWidth = 2;
    for (let y = -110; y < 180; y += 24) for (let x = -80; x < 80; x += 23) {
      context.beginPath(); context.moveTo(x, y + 5); context.lineTo(x + 5, y); context.lineTo(x + 10, y + 5); context.stroke();
      context.beginPath(); context.arc(x + 5, y + 13, 2, 0, 7); context.stroke();
    }
    context.restore();
    context.beginPath(); context.ellipse(0, -133, 53, 59, -0.1, 0, Math.PI * 2); context.fillStyle = '#c49776'; context.fill();
    context.beginPath(); context.ellipse(-3, -157, 51, 39, -0.1, Math.PI, Math.PI * 2 + 0.6); context.fillStyle = '#4c4438'; context.fill();
    context.strokeStyle = '#87674f'; context.lineWidth = 2; context.beginPath(); context.moveTo(-31, -128); context.lineTo(-16, -129); context.moveTo(12, -128); context.lineTo(27, -129); context.stroke();
    context.restore(); context.restore();
    if (light) { context.fillStyle = 'rgba(255,255,255,0.17)'; context.fillRect(0, 0, 1280, 720); }
    context.fillStyle = '#344d3d'; context.font = '14px system-ui'; context.fillText('GENERATED TEST SCENE · NO REAL NURSERY FOOTAGE', 24, 691);
  }
  draw();
  setInterval(() => { if (!interrupted) draw(); }, 50);
  document.addEventListener('nanit-demo-control', async event => {
    if (event.detail === 'quiet' || event.detail === 'moving') mode = event.detail;
    else if (event.detail === 'lighting') light = !light;
    else if (event.detail === 'paused') { interrupted = !interrupted; if (interrupted) video.pause(); else await video.play(); }
    else if (event.detail === 'replace') {
      stream.getTracks().forEach(track => track.stop());
      const next = document.createElement('video'); next.id = 'test-video'; next.autoplay = true; next.muted = true; next.playsInline = true;
      stream = scene.captureStream(20); next.srcObject = stream; video.replaceWith(next); video = next; interrupted = false; await video.play();
    }
  });
  NanitActivityView.mount({ demo: true });
})();
