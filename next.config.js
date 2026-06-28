/** @type {import('next').NextConfig} */
const nextConfig = {
  // Conditionally set output based on NODE_ENV.
  // This is necessary for Azure deployments while keeping the local dev server working.
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  poweredByHeader: false,
  typescript: {
    // TypeScript errors will now prevent production builds
    ignoreBuildErrors: false,
  },
  eslint: {
    // ESLint errors will now prevent production builds
    ignoreDuringBuilds: false,
  },
  images: {
    dangerouslyAllowSVG: true,
    // Harden SVG handling: scope what an optimized SVG can do and force it to be
    // downloaded rather than rendered inline if served directly.
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    contentDispositionType: 'attachment',
    minimumCacheTTL: 604800, // Cache optimized images for 7 days (ship images rarely change)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.fleetyards.net',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'api.fleetyards.net',
        pathname: '/files/**',
      },
      {
        protocol: 'https',
        hostname: 'fleetyards.net',
        pathname: '/files/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.fltyrd.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.aydocorp.space',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'aydocorp.space',
        pathname: '/images/**',
      },
    ],
  },
  serverExternalPackages: ['file-type'],
  webpack: (config, { isServer }) => {
    // Handle discord.js and its dependencies safely
    if (isServer) {
      // Ensure externals is an array before pushing
      if (!Array.isArray(config.externals)) {
        config.externals = config.externals ? [config.externals] : [];
      }
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        bufferutil: 'commonjs bufferutil',
        'zlib-sync': 'commonjs zlib-sync',
      });
    } else {
      // Ensure resolve and resolve.fallback exist before spreading
      config.resolve = config.resolve || {};
      const existingFallback = config.resolve.fallback || {};
      config.resolve.fallback = {
        ...existingFallback,
        'zlib-sync': false,
        'utf-8-validate': false,
        bufferutil: false,
      };
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: '/dashboard/operations/traderoutes',
        destination: '/dashboard/operations',
        permanent: true,
      },
    ];
  },
  async headers() {
    // In development, webpack needs 'unsafe-eval' for hot reloading
    const isDev = process.env.NODE_ENV !== 'production';

    // RESIDUAL RISK (CSP script-src 'unsafe-inline'):
    // Production still allows 'unsafe-inline' for scripts. A nonce-based CSP was
    // implemented in middleware and empirically REVERTED: Next.js bakes inline
    // hydration scripts (self.__next_f.push, the $RT/$RB/$RV resume runtime) into
    // statically prerendered pages at build time, before any per-request nonce
    // exists. A per-request nonce in the CSP header therefore does not match those
    // prerendered inline scripts, so every static page (login, signup, services,
    // join, contact, references, ...) fails to hydrate in production. Making nonce
    // CSP viable here requires opting the whole app into dynamic rendering (reading
    // headers()/nonce in the root layout), which removes static generation for the
    // marketing pages — a deliberate architectural tradeoff, tracked separately.
    // Until that decision is made, 'unsafe-inline' is retained with the
    // cloudflareinsights source kept explicit.

    return [
      {
        source: '/:all*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com${isDev ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https://cdn.fleetyards.net https://api.fleetyards.net https://fleetyards.net https://storage.fltyrd.net https://images.aydocorp.space https://aydocorp.space https://cdn.discordapp.com",
              "font-src 'self'",
              "connect-src 'self' https://discord.com https://cdn.discordapp.com https://cloudflareinsights.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, immutable, max-age=31536000' }],
      },
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }],
      },
      {
        source: '/assets/:path*',
        headers: [{ key: 'Cache-control', value: 'public, max-age=3600, must-revalidate' }],
      },
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }],
      },
      {
        source: '/_next/image',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

let withBundleAnalyzer = (cfg) => cfg;
if (process.env.ANALYZE === 'true') {
  try {
    withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
  } catch (err) {
    console.warn(
      "Bundle analyzer not installed; skipping. To enable, install '@next/bundle-analyzer' and run with ANALYZE=true."
    );
  }
}
module.exports = withBundleAnalyzer(nextConfig);
