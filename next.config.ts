import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ปิด ESLint ขณะ build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ปิด TypeScript errors ขณะ build (ถ้ามี)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;