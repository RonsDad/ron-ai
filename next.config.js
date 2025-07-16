/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix HMR WebSocket issues
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Ensure HMR works properly with custom server
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
  
  // Experimental features for better HMR
  experimental: {
    // Ensure proper WebSocket handling
    allowMiddlewareResponseBody: true,
  },

  async rewrites() {
    return [
      {
        source: '/api/claude/:path*',
        destination: 'http://localhost:8001/api/claude/:path*',
      },
      // Exclude placeholder API from proxy - let Next.js handle it locally
      {
        source: '/api/((?!placeholder).*)',
        destination: 'http://localhost:8000/api/$1',
      },
    ]
  },
}

module.exports = nextConfig