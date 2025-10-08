/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: false, // Using pages directory
  },
  images: {
    domains: [
      'localhost',
      'utfs.io', // UploadThing domain
      'image.mux.com', // Mux thumbnails
      'stream.mux.com', // Mux video streams
    ],
  },
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
}

module.exports = nextConfig

