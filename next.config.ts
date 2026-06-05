import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/**': ['html/**'],
    '/api/icelea-prix/**': [
      'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    ],
  },
  // Packages à ne pas bundler (natifs ou incompatibles avec le bundling)
  serverExternalPackages: ['potrace', 'jimp', 'sharp', 'pdf-parse', 'pdfjs-dist'],
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
