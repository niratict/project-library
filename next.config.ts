import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ปิด ESLint ขณะ build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ปิด TypeScript errors ขณะ build
    ignoreBuildErrors: true,
  },
  // ปิด type checking ทั้งหมด
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;