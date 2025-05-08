/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'piayfwaqtgyddgpsejdh.supabase.co',
        port: '',
        // qualquer arquivo dentro do bucket "logos":
        pathname: '/storage/public/logos/**',
      },
    ],
  },
};

module.exports = nextConfig;
