import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  env: {
    APINOTIFICATION_URL: process.env.APINOTIFICATION_URL || 'https://apinotification.firstaden-bank.com/',
  },
  /* config options here */
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      { source: '/v1/whatsapp/messages', destination: '/api/v1/whatsapp/messages' },
      { source: '/v1/whatsapp/webhook', destination: '/api/v1/whatsapp/webhook' },
    ];
  },
};

export default nextConfig;
