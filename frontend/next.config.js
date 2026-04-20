/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  // Explicitly set pages directory in src
  distDir: '.next',
}

module.exports = nextConfig