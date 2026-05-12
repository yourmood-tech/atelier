import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/**': ['html/**'],
  },
  async headers() {
    return [
      {
        // Autoriser /creer et /creer-argent à être intégrés en iframe depuis yourmood.net
        source: "/creer:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://yourmood.net https://*.yourmood.net https://*.myshopify.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
