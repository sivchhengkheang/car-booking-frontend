/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  allowedDevOrigins: ['disparity-document-active.ngrok-free.dev'],
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return [
      {
        source: '/uploads/:path*',
        destination: `${backendUrl.replace(/\/+$/, '')}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
