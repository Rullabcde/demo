import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Output configuration
  output: 'standalone',

  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // External packages allowed in server runtime
  serverExternalPackages: ['@prisma/client'],

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
  },

  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=1, stale-while-revalidate=59' },
        ],
      },
    ]
  },

  // Webpack optimizations
  webpack: (config, { dev }) => {
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
          commons: {
            minChunks: 2,
            priority: -5,
            reuseExistingChunk: true,
          },
        },
      }

      // Memory optimization
      config.optimization.concatenateModules = true
    }

    config.ignoreWarnings = [{ module: /node_modules/ }]
    return config
  },

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // Static optimization
  trailingSlash: false,

  // Security rewrites
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/robots.txt',
          destination: '/api/robots',
        },
      ],
    }
  },
}

export default nextConfig
