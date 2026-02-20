/**
 * server.js — ZV Cativa Ingressos
 * Uso: node server.js  (dev: porta 3000, produção: PORT env)
 * Acesse: http://localhost:3000
 */

// Carrega variáveis de .env manualmente (sem dependências extras)
const fs0 = require('fs');
const envPath = require('path').join(__dirname, '.env');
if (fs0.existsSync(envPath)) {
  fs0.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) return;
    const idx = clean.indexOf('=');
    if (idx === -1) return;
    const key = clean.slice(0, idx).trim();
    const val = clean.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
}

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const ROOT = __dirname;

// Carrega o handler da API
const jogosHandler = require('./api/jogos');

// MIME types para arquivos estáticos
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
};

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  // ── Favicon ───────────────────────────────────────────────────
  if (url === '/favicon.ico' || url === '/favicon.svg') {
    const svgPath = path.join(ROOT, 'assets', 'favicon.svg');
    fs.readFile(svgPath, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end(data);
    });
    return;
  }

  // ── API ────────────────────────────────────────────────────────
  if (url === '/api/jogos') {
    await jogosHandler(req, res);
    return;
  }

  // ── Arquivos estáticos ──────────────────────────────────────────
  let filePath = path.join(ROOT, url === '/' ? 'index.html' : url);

  // Segurança simples: impede path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + url);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅  ZV Cativa rodando em http://localhost:${PORT}\n`);
});
