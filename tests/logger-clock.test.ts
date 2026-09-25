import { afterEach, describe, expect, it, vi } from "vitest";
import { formatSqlDateTime } from "@/src/server/utils/time-zones";
import { importWithEnv } from "./test-env";

async function loggerClock(env: Record<string, string>) {
  const { loggerWallClock } = await importWithEnv(
    env,
    () => import("@/src/server/utils/logger-clock")
  );
  return (instant: Date) => formatSqlDateTime(loggerWallClock(instant));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loggerWallClock", () => {
  const instant = new Date("2026-09-25T16:00:00Z");

  it("reads the Procon host's local time", async () => {
    const clock = await loggerClock({ BF3_STATS_LOGGER_TIME_ZONE: "Europe/Paris" });

    expect(clock(instant)).toBe("2026-09-25 18:00:00");
  });

  it("adds the Servertime Offset", async () => {
    const clock = await loggerClock({
      BF3_STATS_LOGGER_TIME_ZONE: "UTC",
      BF3_STATS_LOGGER_TIME_OFFSET: "2"
    });

    expect(clock(instant)).toBe("2026-09-25 18:00:00");
  });

  it("accepts negative and fractional offsets", async () => {
    const clock = await loggerClock({
      BF3_STATS_LOGGER_TIME_ZONE: "UTC",
      BF3_STATS_LOGGER_TIME_OFFSET: "-5.5"
    });

    expect(clock(instant)).toBe("2026-09-25 10:30:00");
  });

  it("adds the offset to the local time, as DateTime.Now.AddHours does", async () => {
    const clock = await loggerClock({
      BF3_STATS_LOGGER_TIME_ZONE: "America/Los_Angeles",
      BF3_STATS_LOGGER_TIME_OFFSET: "1"
    });

    // 01:30 PST, half an hour before clocks go forward.
    expect(clock(new Date("2026-03-08T09:30:00Z"))).toBe("2026-03-08 02:30:00");
  });
});
