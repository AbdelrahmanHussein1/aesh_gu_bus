import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist-release');
const PORT = parseInt(process.env.ZIP_PORT || '8888', 10);

const server = http.createServer((req, res) => {
  const clientIp = req.socket.remoteAddress || 'unknown';
  console.log(`[ZIP Server] ${new Date().toISOString()} ${req.method} ${req.url} from ${clientIp}`);

  const cleanUrl = req.url.split('?')[0].replace(/^\/+/, '');

  if (cleanUrl && cleanUrl.endsWith('.zip')) {
    const targetFile = path.join(distDir, path.basename(cleanUrl));
    if (!fs.existsSync(targetFile)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`File not found: ${cleanUrl}\n`);
      return;
    }
    const stat = fs.statSync(targetFile);
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${path.basename(targetFile)}"`,
      'Access-Control-Allow-Origin': '*',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(targetFile).pipe(res);
    return;
  }

  // Root or landing
  const files = fs.existsSync(distDir)
    ? fs.readdirSync(distDir).filter(f => f.endsWith('.zip'))
    : [];

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bus Aesh Local Distribution Server</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; background: #0F172A; color: #F1F5F9; }
    h1 { color: #60A5FA; }
    .card { background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    a.btn { display: inline-block; background: #2563EB; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px; }
    pre { background: #020617; padding: 12px; border-radius: 8px; overflow-x: auto; color: #34D399; font-size: 13px; }
  </style>
</head>
<body>
  <h1>🚌 Bus Aesh Local Distribution Server</h1>
  <p>Download release archives directly to your host machine or VirtualBox Ubuntu VM.</p>
  
  ${files.map(f => {
    const sizeMb = (fs.statSync(path.join(distDir, f)).size / (1024 * 1024)).toFixed(2);
    return `
    <div class="card">
      <h3>📦 ${f} <span style="font-size: 14px; color: #94A3B8;">(${sizeMb} MB)</span></h3>
      <a class="btn" href="/${f}">Direct Download</a>
      <p style="font-size: 13px; color: #CBD5E1; margin-top: 15px;">Run inside Ubuntu VirtualBox VM:</p>
      <pre>wget -O ${f} http://192.168.1.7:8888/${f}\n# Or via Host-Only:\nwget -O ${f} http://192.168.56.1:8888/${f}</pre>
    </div>`;
  }).join('')}
</body>
</html>`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Zip distribution server listening on http://0.0.0.0:${PORT}`);
});
