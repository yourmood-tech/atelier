import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/**': ['html/**'],
  },
  // Potrace + Jimp doivent être en CommonJS externe (pas bundlés) sinon `instanceof Jimp` échoue
  serverExternalPackages: ['potrace', 'jimp'],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
