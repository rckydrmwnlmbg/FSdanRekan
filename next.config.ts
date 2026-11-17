import type { NextConfig } from 'next'

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.instagram.com https://*.cdninstagram.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self' https://www.instagram.com",
  "frame-src https://challenges.cloudflare.com https://www.google.com https://www.instagram.com https://instagram.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: csp },
]

const IMMUTABLE_STATIC_CACHE_HEADER = 'public, max-age=31536000, immutable'
const REUSABLE_STATIC_CACHE_HEADER = 'public, max-age=2592000, stale-while-revalidate=86400'
const NO_STORE_HEADERS = [
  { key: 'Cache-Control', value: 'private, no-store, no-cache, must-revalidate' },
  { key: 'Pragma', value: 'no-cache' },
]

// 301 Redirects from legacy paths to new canonical sections/pages (FR-9.3)
const legacyRedirects = [
  { source: '/home', destination: '/', permanent: true },
  { source: '/index.html', destination: '/', permanent: true },
  { source: '/about', destination: '/#tentang', permanent: true },
  { source: '/tentang-kami', destination: '/#tentang', permanent: true },
  { source: '/team', destination: '/#tim-advokat', permanent: true },
  { source: '/tim', destination: '/#tim-advokat', permanent: true },
  { source: '/practice-areas', destination: '/#keahlian', permanent: true },
  { source: '/layanan', destination: '/#keahlian', permanent: true },
  { source: '/contact', destination: '/#janji-temu', permanent: true },
  { source: '/kontak', destination: '/#janji-temu', permanent: true },
  { source: '/blog', destination: '/artikel', permanent: true },
  { source: '/news', destination: '/artikel', permanent: true },
  { source: '/blog/:slug', destination: '/artikel/:slug', permanent: true },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['mysql2', 'nodemailer', 'pino'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    const reusableStaticRoutes = [
      '/images/:path*',
      '/team/:path*',
      '/logo-seal.webp',
      '/logo-seal-transparent.png',
      '/og-default.webp',
      '/favicon.ico',
      '/icon.png',
    ]
    const noStoreRoutes = [
      '/admin',
      '/admin/:path*',
      '/api/admin/:path*',
      '/api/inquiry',
      '/api/chat',
      '/api/instagram/sync',
    ]

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: IMMUTABLE_STATIC_CACHE_HEADER }],
      },
      ...reusableStaticRoutes.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: REUSABLE_STATIC_CACHE_HEADER }],
      })),
      ...noStoreRoutes.map((source) => ({
        source,
        headers: NO_STORE_HEADERS,
      })),
    ]
  },
  async redirects() {
    return legacyRedirects
  },
}

export default nextConfig
