const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      fs.writeFileSync('browser_leads_dump.json', body);
      console.log('Saved to browser_leads_dump.json');
      res.writeHead(200);
      res.end('OK');
      process.exit(0);
    });
  }
});

server.listen(9999, () => {
  console.log('Listening on 9999...');
});
