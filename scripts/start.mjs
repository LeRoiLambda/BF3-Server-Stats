// Serves the standalone build after loading the .env files `next start` reads
// (.env.production.local, .env.local, .env.production and .env).
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

await import("../.next/standalone/server.js");
