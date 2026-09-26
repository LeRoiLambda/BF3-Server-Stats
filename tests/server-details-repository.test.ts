import { afterEach, describe, expect, it, vi } from "vitest";
import { importWithEnv } from "./test-env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("daysOverlapping", () => {
  async function daysOverlapping(loggerDates: string[]) {
    const repository = await importWithEnv(
      { BF3_STATS_LOGGER_TIME_ZONE: "UTC" },
      () => import("@/src/server/repositories/server-details-repository")
    );
    return repository.daysOverlapping(loggerDates, "America/Los_Angeles");
  }

  it("gives each day its bounds on the logger's clock", async () => {
    expect(await daysOverlapping(["2026-09-24"])).toEqual([
      { date: "2026-09-23", start: "2026-09-23 07:00:00", end: "2026-09-24 07:00:00" },
      { date: "2026-09-24", start: "2026-09-24 07:00:00", end: "2026-09-25 07:00:00" }
    ]);
  });

  it("follows the zone's daylight saving changes", async () => {
    expect(await daysOverlapping(["2026-11-01"])).toEqual([
      { date: "2026-10-31", start: "2026-10-31 07:00:00", end: "2026-11-01 07:00:00" },
      { date: "2026-11-01", start: "2026-11-01 07:00:00", end: "2026-11-02 08:00:00" }
    ]);
  });

  it("lists each day once", async () => {
    const days = await daysOverlapping(["2026-09-25", "2026-09-24"]);

    expect(days.map((day) => day.date)).toEqual(["2026-09-23", "2026-09-24", "2026-09-25"]);
  });
});
