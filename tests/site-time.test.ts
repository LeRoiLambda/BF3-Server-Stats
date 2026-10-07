import { afterEach, describe, expect, it, vi } from "vitest";
import { importWithEnv } from "./test-env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("siteTimeZoneCity", () => {
  async function siteTimeZoneCity(timeZone: string) {
    const siteTime = await importWithEnv(
      { BF3_STATS_TIME_ZONE: timeZone },
      () => import("@/src/server/utils/site-time")
    );
    return siteTime.siteTimeZoneCity();
  }

  it("names the city of the site's zone", async () => {
    expect(await siteTimeZoneCity("America/Los_Angeles")).toBe("Los Angeles");
    expect(await siteTimeZoneCity("America/Argentina/Buenos_Aires")).toBe("Buenos Aires");
    expect(await siteTimeZoneCity("Europe/Paris")).toBe("Paris");
  });

  it("keeps a zone without a city as it is", async () => {
    expect(await siteTimeZoneCity("UTC")).toBe("UTC");
  });
});
