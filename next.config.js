/** @type {import('next').NextConfig} */
const nextConfig = {
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
