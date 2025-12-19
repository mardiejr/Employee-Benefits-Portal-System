import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Don't run ESLint during build - just warning, not failing
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't run TypeScript during build - just warning, not failing
    ignoreBuildErrors: true,
  },
  // Add any other Next.js configuration options here
  images: {
    domains: ['blob.vercel-storage.com'], // Allow images from Vercel Blob
  },
};

export default nextConfig;