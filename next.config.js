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
        minimumCacheTTL: 604800, // Cache optimized images for 7 days (ship images rarely change)
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.fleetyards.net',
                pathname: '/uploads/**',
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
                'bufferutil': 'commonjs bufferutil',
                'zlib-sync': 'commonjs zlib-sync'
            });
        } else {
            // Ensure resolve and resolve.fallback exist before spreading
            config.resolve = config.resolve || {};
            const existingFallback = (config.resolve.fallback) || {};
            config.resolve.fallback = {
                ...existingFallback,
                'zlib-sync': false,
                'utf-8-validate': false,
                'bufferutil': false
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
        return [
            {
                source: '/:all*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline'",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' blob: data: https://cdn.fleetyards.net https://images.aydocorp.space https://aydocorp.space https://cdn.discordapp.com",
                            "font-src 'self'",
                            "connect-src 'self' https://discord.com https://cdn.discordapp.com",
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
                headers: [
                    { key: 'Cache-Control', value: 'public, immutable, max-age=31536000' },
                ],
            },
            {
                source: '/images/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
                ],
            },
            {
                source: '/assets/:path*',
                headers: [
                    { key: 'Cache-control', value: 'public, max-age=3600, must-revalidate' },
                ],
            },
            {
                source: '/fonts/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
                ],
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
        console.warn("Bundle analyzer not installed; skipping. To enable, install '@next/bundle-analyzer' and run with ANALYZE=true.");
    }
}
module.exports = withBundleAnalyzer(nextConfig);
