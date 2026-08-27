const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 8080;
const DIST_DIR = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  // RFC-TM-7 §2 (rfc-tm-7-diamond.md, S-CONS-WEB-1, FAQ Q5): without this
  // entry .wasm falls through to text/plain (see the extname lookup below),
  // and WebAssembly.instantiateStreaming refuses a non-application/wasm
  // response — the playground's wasm loading would only work via the slower
  // ArrayBuffer fallback path locally, unlike the deployed Cloudflare Pages
  // layout (which serves application/wasm by default).
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  const filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end(`Server error: ${error.code}`);
      }
    } else {
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'text/plain';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Open http://localhost:${PORT}/playground.html to test the playground`);
});
