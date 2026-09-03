import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zipPath = path.resolve(__dirname, '../dist-release/bus-aesh-linux-vbox.zip');

const server = http.createServer((req, res) => {
  if (req.url === '/bus-aesh-linux-vbox.zip') {
    if (!fs.existsSync(zipPath)) {
      res.writeHead(404);
      res.end('Zip file not found');
      return;
    }
    const stat = fs.statSync(zipPath);
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="bus-aesh-linux-vbox.zip"'
    });
    fs.createReadStream(zipPath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>🚌 Bus Aesh Linux VirtualBox Package</h2><p><a href="/bus-aesh-linux-vbox.zip">Download bus-aesh-linux-vbox.zip</a></p>');
  }
});

server.listen(9999, '0.0.0.0', () => {
  console.log('Zip server listening on port 9999 (0.0.0.0)');
});
