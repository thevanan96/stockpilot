import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Don't generate AGENTS.md for AI coding agents during `next dev`.
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
