#!/usr/bin/env node

/**
 * Debug script to identify Socket.IO connection sources
 * Run this alongside your application to monitor network traffic
 */

const http = require('http');
const url = require('url');

// Create a simple server to intercept Socket.IO requests
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname.includes('socket.io')) {
    console.log('\n🔍 Socket.IO Request Detected:');
    console.log('   URL:', req.url);
    console.log('   Method:', req.method);
    console.log('   Headers:');
    console.log('     User-Agent:', req.headers['user-agent']);
    console.log('     Origin:', req.headers['origin']);
    console.log('     Referer:', req.headers['referer']);
    console.log('     X-Requested-With:', req.headers['x-requested-with']);
    console.log('   Query Params:', parsedUrl.query);
    console.log('   Time:', new Date().toISOString());
    console.log('---');
    
    // Return a debugging response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Socket.IO debugging interceptor',
      source: req.headers['referer'] || req.headers['origin'] || 'unknown',
      userAgent: req.headers['user-agent']
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 8888;
server.listen(PORT, () => {
  console.log(`🐛 Socket.IO Debug Server running on port ${PORT}`);
  console.log(`   To use: Configure your proxy to route socket.io requests to http://localhost:${PORT}`);
  console.log(`   This will help identify what's making Socket.IO connection attempts`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down debug server...');
  server.close(() => {
    process.exit(0);
  });
}); 