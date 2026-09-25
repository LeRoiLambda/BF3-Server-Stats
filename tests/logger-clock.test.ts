import { afterEach, describe, expect, it, vi } from "vitest";
import { importWithEnv } from "./test-env";

async function loggerClock(env: Record<string, string>) {
  return importWithEnv(env, () => import("@/src/server/utils/logger-clock"));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("toLoggerTime", () => {
  const instant = new Date("2026-09-25T16:00:00Z");

  it("reads the Procon host's local time", async () => {
    const { toLoggerTime } = await loggerClock({ BF3_STATS_LOGGER_TIME_ZONE: "Europe/Paris" });

    expect(toLoggerTime(instant)).toBe("2026-09-25 18:00:00");
  });

  it("adds the Servertime Offset", async () => {
    const { toLoggerTime } = await loggerClock({
      BF3_STATS_LOGGER_TIME_ZONE: "UTC",
      BF3_STATS_LOGGER_TIME_OFFSET: "2"
    });

    expect(toLoggerTime(instant)).toBe("2026-09-25 18:00:00");
  });

  it("accepts negative and fractional offsets", async () => {
    const { toLoggerTime } = await loggerClock({
      BF3_STATS_LOGGER_TIME_ZONE: "UTC",
      BF3_STATS_LOGGER_TIME_OFFSET: "-5.5"
    });

    expect(toLoggerTime(instant)).toBe("2026-09-25 10:30:00");
  });

  it("adds the offset to the local time, as DateTime.Now.AddHours does", async () => {
    const { toLoggerTime } = await loggerClock({
      BF3_STATS_LOGGER_TIME_ZONE: "America/Los_Angeles",
      BF3_STATS_LOGGER_TIME_OFFSET: "1"
    });

    // 01:30 PST, half an hour before clocks go forward.
    expect(toLoggerTime(new Date("2026-03-08T09:30:00Z"))).toBe("2026-03-08 02:30:00");
  });
});

describe("fromLoggerTime", () => {
  it("finds the instant of a stamped value", async () => {
    const { fromLoggerTime } = await loggerClock({
      BF3_STATS_LOGGER_TIME_ZONE: "Europe/Paris",
      BF3_STATS_LOGGER_TIME_OFFSET: "1"
    });

    expect(fromLoggerTime("2026-09-25 19:00:00")?.toISOString()).toBe(
      "2026-09-25T16:00:00.000Z"
    );
  });

  it("undoes toLoggerTime across a daylight saving change", async () => {
    const { fromLoggerTime, toLoggerTime } = await loggerClock({
      BF3_STATS_LOGGER_TIME_ZONE: "America/Los_Angeles",
      BF3_STATS_LOGGER_TIME_OFFSET: "1"
    });

    for (const iso of [
      "2026-03-08T09:30:00.000Z",
      "2026-03-08T10:30:00.000Z",
      "2026-09-25T16:00:00.000Z"
    ]) {
      expect(fromLoggerTime(toLoggerTime(new Date(iso)))?.toISOString()).toBe(iso);
    }
  });

  it("returns null for zero, malformed and missing values", async () => {
    const { fromLoggerTime } = await loggerClock({});

    expect(fromLoggerTime("0000-00-00 00:00:00")).toBeNull();
    expect(fromLoggerTime("yesterday")).toBeNull();
    expect(fromLoggerTime(null)).toBeNull();
  });
});
