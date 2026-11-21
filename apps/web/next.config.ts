import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@content-engine/core",
    "@content-engine/config",
    "@content-engine/db",
    "@content-engine/services",
    "@content-engine/telegram",
    "@content-engine/media",
  ],
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  poweredByHeader: false,
};

export default nextConfig;
