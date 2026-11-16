import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    // e2e builds into its own folder so it never touches the dev server's files.
    distDir: process.env.NEXT_DIST_DIR ?? '.next',
    reactCompiler: true,
    serverExternalPackages: ['reflect-metadata'],
    async redirects() {
        return [
            { source: '/competitions', destination: '/dashboard', permanent: true },
            { source: '/competitions/:path*', destination: '/dashboard', permanent: true },
            { source: '/leagues', destination: '/dashboard', permanent: true },
            { source: '/fantasy-team-builder', destination: '/dashboard', permanent: true },
        ]
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'media.api-sports.io',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
        ],
    },
}

export default nextConfig
