const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/api.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'api.js'));
});

app.get('/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'app.js'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/html/index.html'));
});

app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});
