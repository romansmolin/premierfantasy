import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    reactCompiler: true,
    serverExternalPackages: ['reflect-metadata'],
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
