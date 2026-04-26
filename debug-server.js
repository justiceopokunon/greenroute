console.log('Starting debug server...');

const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  console.log('Request received:', req.method, req.url);
  
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
  } else if (req.url === '/road-routing.js') {
    try {
      const content = fs.readFileSync('./road-routing.js', 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(content);
    } catch (err) {
      console.error('Error reading road-routing.js:', err);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'road-routing.js not found' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Debug server running on http://localhost:${PORT}`);
  console.log('Test with: curl http://localhost:3001/api/health');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
