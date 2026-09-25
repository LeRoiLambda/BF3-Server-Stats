import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importWithEnv } from "./test-env";

async function resolverIn(timeZone: string) {
  const { resolveChatDateRange } = await importWithEnv(
    { BF3_STATS_TIME_ZONE: timeZone },
    () => import("@/src/server/repositories/chat-repository")
  );

  return (query: string) => {
    const range = resolveChatDateRange(query);
    return range && { low: range.low.toISOString(), high: range.high.toISOString() };
  };
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
    const resolve = await resolverIn("UTC");

    expect(resolve("2026-09-20")).toEqual({
      low: "2026-09-20T00:00:00.000Z",
      high: "2026-09-20T23:59:59.000Z"
    });
  });

  it("matches the whole month of a year and month", async () => {
    const resolve = await resolverIn("UTC");

    expect(resolve("2026-02")).toEqual({
      low: "2026-02-01T00:00:00.000Z",
      high: "2026-02-28T23:59:59.000Z"
    });
  });

  it("matches five minutes either side of a date and time", async () => {
    const resolve = await resolverIn("UTC");

    expect(resolve("2026-09-20 21:30")).toEqual({
      low: "2026-09-20T21:25:00.000Z",
      high: "2026-09-20T21:35:00.000Z"
    });
  });

  it("reads dates on the site's clock", async () => {
    const resolve = await resolverIn("Europe/Paris");

    expect(resolve("2026-09-20")).toEqual({
      low: "2026-09-19T22:00:00.000Z",
      high: "2026-09-20T21:59:59.000Z"
    });
  });

  it("rejects impossible dates and times", async () => {
    const resolve = await resolverIn("UTC");

    expect(resolve("2026-02-31")).toBeNull();
    expect(resolve("2026-09-20 25:00")).toBeNull();
    expect(resolve("2026-13")).toBeNull();
  });

  it("leaves other text to the text search", async () => {
    const resolve = await resolverIn("UTC");

    for (const query of ["top 10", "ak 47", "12", "2026", "21:30", "gg", ""]) {
      expect(resolve(query)).toBeNull();
    }
  });

  it("reads relative dates on the site's clock", async () => {
    const resolve = await resolverIn("Europe/Paris");

    expect(resolve("last hour")).toEqual({
      low: "2026-09-25T15:00:00.000Z",
      high: "2026-09-25T16:00:00.000Z"
    });
    expect(resolve("today")).toEqual({
      low: "2026-09-24T22:00:00.000Z",
      high: "2026-09-25T16:00:00.000Z"
    });
    expect(resolve("yesterday")).toEqual({
      low: "2026-09-23T22:00:00.000Z",
      high: "2026-09-24T21:59:59.000Z"
    });
    expect(resolve("2 days ago")).toEqual({
      low: "2026-09-22T22:00:00.000Z",
      high: "2026-09-23T21:59:59.000Z"
    });
  });

  it("starts weeks on Monday", async () => {
    const resolve = await resolverIn("Europe/Paris");

    expect(resolve("this week")).toEqual({
      low: "2026-09-20T22:00:00.000Z",
      high: "2026-09-25T16:00:00.000Z"
    });
    expect(resolve("last week")).toEqual({
      low: "2026-09-13T22:00:00.000Z",
      high: "2026-09-20T21:59:59.000Z"
    });
  });
});
