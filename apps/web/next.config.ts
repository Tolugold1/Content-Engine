import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@content-engine/core"],
  poweredByHeader: false,
};

export default nextConfig;
