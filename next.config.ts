import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/**': ['html/**'],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
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
