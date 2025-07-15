const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { createProxyMiddleware } = require('http-proxy-middleware')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

// Initialize Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Create HTTP proxy for API routes
  const claudeApiProxy = createProxyMiddleware({
    target: 'http://localhost:8001',
    changeOrigin: true,
    pathRewrite: {
      '^/api/claude': '/api/claude',
    },
    logLevel: 'warn',
  })

  const browserApiProxy = createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: {
      '^/api': '/api',
    },
    logLevel: 'warn',
  })

  // Dynamic proxy to expose Chrome remote-debugging port through same origin so it can be embedded in an <iframe>
  const liveBrowserProxy = createProxyMiddleware('/live', {
    changeOrigin: true,
    ws: true,
    logLevel: 'debug', // Change from 'warn' to 'debug' for more detailed logging
    router: (req) => {
      // Expect requests like /live/51234/...
      const m = req.url.match(/^\/live\/(\d+)/)
      const port = m ? m[1] : null
      if (!port) {
        console.warn('liveBrowserProxy: could not parse port from', req.url)
        return 'http://localhost:0'
      }
      const target = `http://localhost:${port}`
      console.log(`liveBrowserProxy: routing ${req.url} to ${target}`)
      return target
    },
    pathRewrite: (path, req) => {
      // Remove /live/<port> prefix so underlying target sees correct path
      const newPath = path.replace(/^\/live\/\d+/, '') || '/'
      console.log(`liveBrowserProxy: rewriting path from ${path} to ${newPath}`)
      return newPath
    },
    onProxyRes: (proxyRes, req, res) => {
      // Remove framing protections so we can embed the page
      delete proxyRes.headers['x-frame-options']
      delete proxyRes.headers['content-security-policy']
      console.log(`liveBrowserProxy: proxied response for ${req.url}, status: ${proxyRes.statusCode}`)
    },
    onError: (err, req, res) => {
      console.error(`liveBrowserProxy error for ${req.url}:`, err.message)
      res.writeHead(500, {
        'Content-Type': 'text/plain',
      })
      res.end(`Proxy error: ${err.message}`)
    }
  })

  // Create WebSocket proxy for browser-use backend only
  const wsProxy = createProxyMiddleware({
    target: 'ws://localhost:8000',
    changeOrigin: true,
    ws: true,
    logLevel: 'warn',
    // Use the new 'on' object syntax from v3.x documentation
    on: {
      error: (err, req, res) => {
        console.error('Browser WebSocket proxy error:', err.message)
      },
      proxyReqWs: (proxyReq, req, socket) => {
        console.log('Proxying browser WebSocket:', req.url)
      },
      open: (proxySocket) => {
        console.log('Browser WebSocket connection opened')
      },
      close: (res, socket, head) => {
        console.log('Browser WebSocket connection closed')
      },
    },
  })

  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      const { pathname } = parsedUrl

      // Handle API routes with proxy
      if (pathname.startsWith('/api/claude')) {
        claudeApiProxy(req, res)
      } else if (pathname.startsWith('/api/')) {
        browserApiProxy(req, res)
      } else if (pathname.startsWith('/live/')) {
        liveBrowserProxy(req, res)
      } else {
        // Handle all other routes with Next.js
        await handle(req, res, parsedUrl)
      }
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Handle WebSocket upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url)
    
    // Only proxy our browser automation WebSocket connections
    if (pathname && pathname.startsWith('/ws/')) {
      console.log('Proxying browser automation WebSocket:', request.url)
      try {
        wsProxy.upgrade(request, socket, head)
      } catch (error) {
        console.error('WebSocket proxy upgrade error:', error.message)
        socket.destroy()
      }
    } else if (pathname && pathname.startsWith('/live/')) {
      // Proxy WebSocket upgrade for live browser (DevTools) as well
      try {
        liveBrowserProxy.upgrade(request, socket, head)
      } catch (err) {
        console.error('Live browser WS proxy error:', err.message)
        socket.destroy()
      }
    } else if (pathname === '/_next/webpack-hmr') {
      // For Next.js HMR connections, let Next.js handle them
      console.log('Allowing Next.js to handle HMR WebSocket upgrade')
      // Don't interfere with Next.js HMR - let it handle the connection
    } else {
      // For any other WebSocket connections, let Next.js handle them
      console.log('Letting Next.js handle WebSocket upgrade for:', pathname)
      // Don't destroy the socket - let Next.js handle it
    }
  })

  server
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log('> Browser automation WebSocket proxy active on /ws/*')
      console.log('> Next.js HMR will handle its own WebSocket connections')
    })
}) 