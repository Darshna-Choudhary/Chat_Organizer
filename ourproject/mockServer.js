const http = require('http');

const PORT = 3001;

// Lightweight mock server that consumes request body so browser can report upload progress
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle upload endpoint
  if (req.url === '/api/upload' && req.method === 'POST') {
    // Consume request body to allow the browser to fully upload and provide progress
    let receivedBytes = 0;
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    req.on('data', (chunk) => {
      receivedBytes += chunk.length;
      // We don't do anything with the data — this is a mock server — but consuming it
      // prevents the connection from stalling and allows upload progress events.
    });

    req.on('end', () => {
      // Simulate a short server-side processing delay before responding
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'File uploaded successfully',
          receivedBytes,
          contentLength: contentLength || null,
          timestamp: new Date().toISOString(),
        }));
      }, 500);
    });

    req.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error', detail: err.message }));
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
  console.log(`Upload endpoint: POST http://localhost:${PORT}/api/upload`);
});

