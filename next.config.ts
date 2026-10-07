import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Without it, a lockfile in a parent directory nests the standalone server a level down.
  outputFileTracingRoot: __dirname,
  reactStrictMode: true
};

export default nextConfig;
