import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/**': ['html/**'],
  },
  // Potrace + Jimp + Sharp doivent être en CommonJS externe (pas bundlés)
  // (Sharp a un binaire natif, Potrace fait des `instanceof Jimp` qui cassent en bundle)
  serverExternalPackages: ['potrace', 'jimp', 'sharp'],
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
