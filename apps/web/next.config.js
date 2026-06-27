/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bus-aesh/shared'],
  allowedDevOrigins: ['192.168.1.9', '192.168.1.*', 'localhost'],
};

module.exports = nextConfig;
