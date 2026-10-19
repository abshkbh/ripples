const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4317);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const requested = pathname === '/' ? '/demo/index.html' : pathname;
  const file = path.resolve(root, '.' + requested);
  if (!file.startsWith(root + path.sep) || !/^\/(demo|extension)\//.test(requested)) {
    response.writeHead(404); return response.end('Not found');
  }
  fs.readFile(file, (error, content) => {
    if (error) { response.writeHead(404); return response.end('Not found'); }
    response.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'text/plain') + '; charset=utf-8',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'none'; frame-ancestors 'none'" });
    response.end(content);
  });
}).listen(port, '127.0.0.1', () => console.log(`Ripples preview: http://127.0.0.1:${port}`));
