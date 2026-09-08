const http = require('node:http');
const net = require('node:net');

const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '3001', 10);
const API_PORT = parseInt(process.env.API_PORT || '3000', 10);
const WEB_PORT = parseInt(process.env.WEB_PORT || '3002', 10);
const HOST = '127.0.0.1';

// Standard HTTP Proxy Handler
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'gateway', timestamp: new Date().toISOString() }));
    return;
  }

  const isApi = req.url.startsWith('/api') || req.url.startsWith('/ws');
  const targetPort = isApi ? API_PORT : WEB_PORT;

  const options = {
    hostname: HOST,
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      'x-forwarded-host': req.headers.host || '',
      'x-forwarded-for': req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http',
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[Gateway] Error forwarding HTTP ${req.method} ${req.url} -> port ${targetPort}:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gateway Bad Gateway', targetPort, message: err.message }));
    }
  });

  if (req.method === 'GET' || req.method === 'HEAD') {
    proxyReq.end();
  } else {
    req.pipe(proxyReq, { end: true });
  }
});

// WebSocket HTTP Upgrade Proxy Handler
server.on('upgrade', (req, clientSocket, head) => {
  // All WebSockets (/ws/*) are destined for Fastify on port 3000
  const targetPort = API_PORT;

  const targetSocket = net.connect(targetPort, HOST, () => {
    let rawHeaders = `${req.method} ${req.url} HTTP/1.1\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      rawHeaders += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    }
    rawHeaders += '\r\n';

    targetSocket.write(rawHeaders);
    if (head && head.length > 0) {
      targetSocket.write(head);
    }

    targetSocket.pipe(clientSocket);
    clientSocket.pipe(targetSocket);
  });

  targetSocket.on('error', (err) => {
    console.error(`[Gateway] WebSocket upgrade error -> port ${targetPort}:`, err.message);
    clientSocket.destroy();
  });

  clientSocket.on('error', (err) => {
    console.error('[Gateway] Client WebSocket error:', err.message);
    targetSocket.destroy();
  });
});

server.listen(GATEWAY_PORT, '0.0.0.0', () => {
  console.log(`[Gateway] Unified Reverse Proxy listening on port ${GATEWAY_PORT} (0.0.0.0)`);
  console.log(`          • Web Traffic (/*)             -> Next.js :${WEB_PORT}`);
  console.log(`          • API & WebSockets (/api, /ws) -> Fastify :${API_PORT}`);
});
