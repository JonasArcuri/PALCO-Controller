const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const allowed = new Set(['midi-controller.html', 'css/styles.css', ...['app', 'backup', 'cloud', 'config', 'midi', 'storage'].map(name => `js/${name}.js`)]);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
http.createServer((request, response) => {
  let name;
  try { name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1) || 'midi-controller.html'; }
  catch { response.writeHead(400).end(); return; }
  if (!allowed.has(name)) { response.writeHead(404).end(); return; }
  fs.readFile(path.join(root, name), (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': `${types[path.extname(name)]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(data);
  });
}).listen(3000, '127.0.0.1', () => console.log('Palco: http://localhost:3000'));
