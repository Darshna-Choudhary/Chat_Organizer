const http = require('http');
const fs = require('fs');
const path = require('path');
const { Writable } = require('stream');

const PORT = 3001;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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
    // Extract filename from Content-Disposition header or generate one
    let filename = 'upload_' + Date.now();
    const contentDisposition = req.headers['content-disposition'];
    if (contentDisposition && contentDisposition.includes('filename')) {
      const match = contentDisposition.match(/filename[^;=\n]*=(?:(['"]).*?\1|[^;\n]*)/);
      if (match && match[0]) {
        filename = match[0].split('=')[1].replace(/"/g, '').trim();
      }
    }

    const filepath = path.join(UPLOADS_DIR, filename);
    const writeStream = fs.createWriteStream(filepath);
    
    let receivedBytes = 0;
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    // Pipe incoming data to file and track progress
    req.on('data', (chunk) => {
      receivedBytes += chunk.length;
    });

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'File uploaded successfully',
        filename,
        filepath: path.relative(__dirname, filepath),
        receivedBytes,
        contentLength: contentLength || null,
        timestamp: new Date().toISOString(),
      }));
      console.log(`✓ Uploaded: ${filename} (${receivedBytes} bytes)`);
    });

    writeStream.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error', detail: err.message }));
      console.error(`✗ Upload failed: ${filename}`, err.message);
    });

    req.on('error', (err) => {
      writeStream.destroy();
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
  console.log(`Uploads directory: ${UPLOADS_DIR}`);
});
