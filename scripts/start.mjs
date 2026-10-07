// The standalone server listens on HOSTNAME, which shells and containers set to the machine's name.
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
