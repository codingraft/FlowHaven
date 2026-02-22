import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // @ts-ignore - Required for WiFi testing despite imperfect types in current version
    allowedDevOrigins: ["192.168.29.22:3000", "localhost:3000"],
    serverActions: {
      allowedOrigins: ["192.168.29.22:3000", "localhost:3000"],
    },
  },
  reactCompiler: true,
};

export default nextConfig;
