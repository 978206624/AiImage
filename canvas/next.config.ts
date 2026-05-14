import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["ali-oss"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.aliyuncs.com",
      },
      {
        protocol: "https",
        hostname: "**.oss-cn-*.aliyuncs.com",
      },
    ],
  },
  headers: async () => [
    ...(isProduction
      ? [
          {
            source: "/_next/static/:path*",
            headers: [
              {
                key: "Cache-Control",
                value: "public, max-age=31536000, immutable",
              },
            ],
          },
        ]
      : []),
    {
      source: "/favicon.ico",
      headers: [
        { key: "Cache-Control", value: "public, max-age=86400" },
      ],
    },
  ],
};

export default nextConfig;
