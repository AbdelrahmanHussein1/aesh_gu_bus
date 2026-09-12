import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zipPath = path.resolve(__dirname, '../dist-release/bus-aesh-linux-vbox.zip');

const PORT = parseInt(process.env.ZIP_PORT || '8888', 10);

const server = http.createServer((req, res) => {
  console.log(`[ZIP Server] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);

  if (req.url === '/bus-aesh-linux-vbox.zip' || req.url === '/download') {
    if (!fs.existsSync(zipPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Zip file not found in dist-release directory.');
      return;
    }
    const stat = fs.statSync(zipPath);
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="bus-aesh-linux-vbox.zip"',
      'Access-Control-Allow-Origin': '*',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(zipPath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>🚌 Bus Aesh Linux VirtualBox Package</h2><p><a href="/bus-aesh-linux-vbox.zip">Download bus-aesh-linux-vbox.zip</a></p>');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Zip server listening on http://0.0.0.0:${PORT}/bus-aesh-linux-vbox.zip`);
});
