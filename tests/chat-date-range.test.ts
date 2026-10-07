import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importWithEnv } from "./test-env";

async function resolverOnClock(timeZone: string) {
  const { resolveChatDateRange } = await importWithEnv(
    { BF3_STATS_LOGGER_TIME_ZONE: timeZone },
    () => import("@/src/server/repositories/chat-repository")
  );
  return resolveChatDateRange;
}

beforeEach(() => {
  vi.useFakeTimers();
  // Friday 2026-09-25, 18:00 in Paris.
  vi.setSystemTime(new Date("2026-09-25T16:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("resolveChatDateRange", () => {
  it("matches the whole day of a date", async () => {
    const resolve = await resolverOnClock("UTC");

    expect(resolve("2026-09-20")).toEqual({
      low: "2026-09-20 00:00:00",
      high: "2026-09-20 23:59:59"
    });
  });

  it("matches five minutes either side of a date and time", async () => {
    const resolve = await resolverOnClock("UTC");

    expect(resolve("2026-09-20 21:30")).toEqual({
      low: "2026-09-20 21:25:00",
      high: "2026-09-20 21:35:00"
    });
  });

  it("rejects impossible dates and times", async () => {
    const resolve = await resolverOnClock("UTC");

    expect(resolve("2026-02-31")).toBeNull();
    expect(resolve("2026-09-20 25:00")).toBeNull();
  });

  it("leaves other text to the text search", async () => {
    const resolve = await resolverOnClock("UTC");

    for (const query of ["top 10", "ak 47", "12", "gg", ""]) {
      expect(resolve(query)).toBeNull();
    }
  });

  it("reads relative dates on the logger's clock", async () => {
    const resolve = await resolverOnClock("Europe/Paris");

    expect(resolve("last hour")).toEqual({
      low: "2026-09-25 17:00:00",
      high: "2026-09-25 18:00:00"
    });
    expect(resolve("today")).toEqual({
      low: "2026-09-25 00:00:00",
      high: "2026-09-25 18:00:00"
    });
    expect(resolve("yesterday")).toEqual({
      low: "2026-09-24 00:00:00",
      high: "2026-09-24 23:59:59"
    });
    expect(resolve("2 days ago")).toEqual({
      low: "2026-09-23 00:00:00",
      high: "2026-09-23 23:59:59"
    });
  });

  it("starts weeks on Monday", async () => {
    const resolve = await resolverOnClock("Europe/Paris");

    expect(resolve("this week")).toEqual({
      low: "2026-09-21 00:00:00",
      high: "2026-09-25 18:00:00"
    });
    expect(resolve("last week")).toEqual({
      low: "2026-09-14 00:00:00",
      high: "2026-09-20 23:59:59"
    });
  });
});
