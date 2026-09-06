/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bus-aesh/shared'],
  allowedDevOrigins: ['192.168.1.*', 'localhost', '*.trycloudflare.com'],
  async rewrites() {
    const apiTarget = process.env.INTERNAL_API_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`,
      },
      {
        source: '/ws/:path*',
        destination: `${apiTarget}/ws/:path*`,
      },
      {
        source: '/health',
        destination: `${apiTarget}/health`,
      },
    ];
  },
};

module.exports = nextConfig;
