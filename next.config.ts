import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // The preview panel loads the dev server from a cross-origin subdomain
  // (preview-chat-<chat-id>.space-z.ai). Allow it explicitly so the /_next/*
  // JS chunks load (otherwise React won't hydrate and the preview breaks).
  allowedDevOrigins: [
    "https://preview-chat-df2107cf-1aad-4a99-978d-24a4aca20b3f.space-z.ai",
    "http://preview-chat-df2107cf-1aad-4a99-978d-24a4aca20b3f.space-z.ai",
    "https://*.space-z.ai",
    "http://*.space-z.ai",
    "*.space-z.ai",
  ],
};

export default nextConfig;
