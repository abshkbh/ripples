const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'extension/manifest.json')));
if (JSON.stringify(manifest.permissions) !== '["storage"]') throw new Error('Unexpected permissions');
if (manifest.content_scripts[0].matches.join() !== 'https://my.nanit.com/*') throw new Error('Unexpected host access');
for (const folder of ['extension', 'demo', 'scripts']) {
  for (const name of fs.readdirSync(path.join(root, folder))) {
    if (/\.(js|cjs)$/.test(name)) execFileSync(process.execPath, ['--check', path.join(root, folder, name)]);
  }
}
for (const file of manifest.content_scripts[0].js) {
  if (!fs.existsSync(path.join(root, 'extension', file))) throw new Error(`Missing content script: ${file}`);
}
console.log('Syntax and extension manifest checks passed.');
