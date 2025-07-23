/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ['neeyzyrpxexfghagdgra.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'neeyzyrpxexfghagdgra.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
}

export default nextConfig
