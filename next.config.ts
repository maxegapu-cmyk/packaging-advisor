import { existsSync } from "node:fs";
import type { NextConfig } from "next";

// a licensed 瘦金体, sliced by scripts/fonts/add_shoujin.py into public/fonts/shoujin (git-ignored),
// becomes the inscription face; NEXT_PUBLIC_SHOUJIN_FONT_URL can point elsewhere instead
const shoujin = process.env.NEXT_PUBLIC_SHOUJIN_FONT_URL || (existsSync("public/fonts/shoujin/shoujin.css") ? "/fonts/shoujin/shoujin.css" : "");

const nextConfig: NextConfig = {
  // Standalone output keeps the Docker image small.
  output: "standalone",
  env: { NEXT_PUBLIC_SHOUJIN_FONT_URL: shoujin },
  // sharp is native; keep it out of the server bundle.
  serverExternalPackages: ["sharp"],
  // Skill files are read at runtime from ./skills; ship them with the standalone build.
  outputFileTracingIncludes: {
    "/**": ["./skills/**/*"],
  },
  // No ESLint setup ships with the project; type-checking still runs during `next build`.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { bodySizeLimit: "30mb" },
  },
  // node:sqlite is a Node built-in that webpack does not know yet: load it at runtime.
  webpack(config, { isServer }) {
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : config.externals ? [config.externals] : [];
      config.externals = [...externals, { "node:sqlite": "commonjs node:sqlite" }];
    }
    return config;
  },
};

export default nextConfig;
