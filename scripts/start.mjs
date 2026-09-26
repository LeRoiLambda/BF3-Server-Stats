// Serves the standalone build as `next start` would: it loads the same .env
// files (.env.production.local, .env.local, .env.production and .env) and
// takes its -H/--hostname, -p/--port and --keepAliveTimeout options. Without
// -H it listens on every IPv4 interface, 0.0.0.0; -H :: adds IPv6. The
// standalone server reads the address from HOSTNAME, which shells and
// containers often set to the machine's name, so it is set here.
import { parseArgs } from "node:util";
import nextEnv from "@next/env";

const { values } = parseArgs({
  options: {
    hostname: { type: "string", short: "H" },
    port: { type: "string", short: "p" },
    keepAliveTimeout: { type: "string" }
  }
});

nextEnv.loadEnvConfig(process.cwd());
process.env.HOSTNAME = values.hostname ?? "0.0.0.0";
if (values.port) {
  process.env.PORT = values.port;
}
if (values.keepAliveTimeout) {
  process.env.KEEP_ALIVE_TIMEOUT = values.keepAliveTimeout;
}

await import("../.next/standalone/server.js");
