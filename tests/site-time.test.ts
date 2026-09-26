import { afterEach, describe, expect, it, vi } from "vitest";
import { importWithEnv } from "./test-env";

async function siteClock(timeZone: string) {
  return importWithEnv(
    { BF3_STATS_TIME_ZONE: timeZone },
    () => import("@/src/server/utils/site-time")
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("formatSiteTime", () => {
  it("labels times with the zone's abbreviation", async () => {
    const { formatSiteTime } = await siteClock("America/Los_Angeles");

    expect(formatSiteTime(new Date("2026-09-25T16:00:00Z"))).toBe("2026-09-25 09:00:00 PDT");
    expect(formatSiteTime(new Date("2026-01-15T16:00:00Z"))).toBe("2026-01-15 08:00:00 PST");
  });

  it("labels zones without an English abbreviation with their UTC offset", async () => {
    const { formatSiteTime } = await siteClock("Europe/Paris");

    expect(formatSiteTime(new Date("2026-09-25T16:00:00Z"))).toBe("2026-09-25 18:00:00 GMT+2");
  });
});

describe("siteDate", () => {
  it("reads the date on the site's clock", async () => {
    const { siteDate } = await siteClock("America/Los_Angeles");

    expect(siteDate(new Date("2026-09-25T06:59:59Z"))).toBe("2026-09-24");
    expect(siteDate(new Date("2026-09-25T07:00:00Z"))).toBe("2026-09-25");
  });
});

describe("siteDatesBetween", () => {
  it("lists the dates on the site's clock", async () => {
    const { siteDatesBetween } = await siteClock("America/Los_Angeles");

    expect(
      siteDatesBetween(new Date("2026-09-24T00:00:00Z"), new Date("2026-09-24T23:59:59Z"))
    ).toEqual(["2026-09-23", "2026-09-24"]);
  });
});

describe("siteDateStart", () => {
  it("finds midnight on the site's clock", async () => {
    const { siteDateStart } = await siteClock("America/Los_Angeles");

    expect(siteDateStart("2026-09-24").toISOString()).toBe("2026-09-24T07:00:00.000Z");
    // 1 November 2026 lasts 25 hours in Los Angeles.
    expect(siteDateStart("2026-11-01", 1).toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });

  it("starts a day whose midnight clocks skip when they resume", async () => {
    const { siteDateStart } = await siteClock("America/Santiago");

    expect(siteDateStart("2026-09-06").toISOString()).toBe("2026-09-06T04:00:00.000Z");
  });
});
