import { afterEach, describe, expect, it, vi } from "vitest";
import { importWithEnv } from "./test-env";

async function readEnvWith(env: Record<string, string>) {
  const { readEnv } = await importWithEnv(env, () => import("@/src/server/env"));
  return readEnv;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("readEnv", () => {
  it("gives blank optional settings their defaults", async () => {
    const env = (await readEnvWith({}))();

    expect(env.BF3_STATS_DB_PORT).toBe(3306);
    expect(env.BF3_STATS_BANNER_IMAGE).toBe("/images/bf3-logo.png");
    expect(env.BF3_STATS_TIME_ZONE).toBe("America/Los_Angeles");
    expect(env.BF3_STATS_LOGGER_TIME_OFFSET).toBe(0);
  });

  it("requires the logger's time zone", async () => {
    const readEnv = await readEnvWith({ BF3_STATS_LOGGER_TIME_ZONE: "" });

    expect(() => readEnv()).toThrow("BF3_STATS_LOGGER_TIME_ZONE is required");
  });

  it("rejects unknown time zones", async () => {
    const readEnv = await readEnvWith({ BF3_STATS_LOGGER_TIME_ZONE: "Mars/Olympus_Mons" });

    expect(() => readEnv()).toThrow("must be a valid IANA time zone");
  });

  it("rejects logger offsets beyond a day", async () => {
    const readEnv = await readEnvWith({ BF3_STATS_LOGGER_TIME_OFFSET: "25" });

    expect(() => readEnv()).toThrow("between -24 and 24 hours");
  });

  it("serves banner images from public/", async () => {
    for (const [value, expected] of [
      ["/images/banner.png", "/images/banner.png"],
      ["./public/images/banner.png", "/images/banner.png"],
      ["public/images/banner.png", "/images/banner.png"],
      ["./images/banner.png", "/images/banner.png"]
    ]) {
      const env = (await readEnvWith({ BF3_STATS_BANNER_IMAGE: value }))();

      expect(env.BF3_STATS_BANNER_IMAGE).toBe(expected);
    }
  });
});
