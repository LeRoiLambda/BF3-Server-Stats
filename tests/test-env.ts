import { vi } from "vitest";

const REQUIRED_ENV = {
  BF3_STATS_DB_HOST: "127.0.0.1",
  BF3_STATS_DB_PORT: "",
  BF3_STATS_DB_NAME: "bf3_stats",
  BF3_STATS_DB_USER: "bf3",
  BF3_STATS_DB_PASS: "bf3",
  BF3_STATS_BANNER_IMAGE: "",
  BF3_STATS_TIME_ZONE: "",
  BF3_STATS_LOGGER_TIME_ZONE: "UTC",
  BF3_STATS_LOGGER_TIME_OFFSET: ""
};

// readEnv() caches the parsed environment, so modules that read it are
// imported afresh after the variables are set.
export async function importWithEnv<T>(
  env: Record<string, string>,
  load: () => Promise<T>
): Promise<T> {
  vi.resetModules();
  for (const [name, value] of Object.entries({ ...REQUIRED_ENV, ...env })) {
    vi.stubEnv(name, value);
  }

  return load();
}
