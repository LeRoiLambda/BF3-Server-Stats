import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Traces the standalone server from this directory, so it is always
  // .next/standalone/server.js, where the scripts in scripts/ expect it.
  // Otherwise Next.js starts from the topmost directory holding a lockfile,
  // up to the Git repository's root: a copy outside Git, or a subdirectory of
  // another repository, under a directory with a lockfile nests the server a
  // level down.
  outputFileTracingRoot: __dirname,
  reactStrictMode: true
};

export default nextConfig;
