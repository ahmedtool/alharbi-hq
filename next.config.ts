
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // The links page (/bio) was removed; old links (e.g. in videos) land on the home page.
  async redirects() {
    return [{ source: '/bio', destination: '/', permanent: true }];
  },
  async rewrites() {
    return [
      // Block common vulnerability scans
      { source: '/.env', destination: '/404' },
      { source: '/.aws/:path*', destination: '/404' },
      { source: '/.git/:path*', destination: '/404' },
      { source: '/.well-known/:path*', destination: '/404' },
      { source: '/Autodiscover/Autodiscover.xml', destination: '/404' },
      { source: '/actuator/:path*', destination: '/404' },
      { source: '/api/:path*', destination: '/404' },
      { source: '/backend/:path*', destination: '/404' },
      { source: '/ecp/:path*', destination: '/404' },
      { source: '/phpmyadmin/:path*', destination: '/404' },
      { source: '/remote/:path*', destination: '/404' },
      { source: '/sito/:path*', destination: '/404' },
      { source: '/website/:path*', destination: '/404' },
      { source: '/wordpress/:path*', destination: '/404' },
      { source: '/wp-admin/:path*', destination: '/404' },
      { source: '/wp-content/:path*', destination: '/404' },
      { source: '/wp-includes/:path*', destination: '/404' },
      { source: '/wp-login.php', destination: '/404' },
      { source: '/xmlrpc.php', destination: '/404' },
    ];
  },
  /* config options here */
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: false,
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
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Files uploaded before the move to Supabase
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
