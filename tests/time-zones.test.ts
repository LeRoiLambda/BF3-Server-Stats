import { describe, expect, it } from "vitest";
import {
  formatSqlDateTime,
  wallClockInTimeZone,
  wallClockToInstant
} from "@/src/server/utils/time-zones";

describe("wallClockInTimeZone", () => {
  it("reads the wall-clock time of an instant in a time zone", () => {
    const instant = new Date("2026-01-15T12:00:00Z");

    expect(formatSqlDateTime(wallClockInTimeZone(instant, "America/Los_Angeles"))).toBe(
      "2026-01-15 04:00:00"
    );
    expect(formatSqlDateTime(wallClockInTimeZone(instant, "Asia/Tokyo"))).toBe(
      "2026-01-15 21:00:00"
    );
  });
});

describe("wallClockToInstant", () => {
  const monday = (month: number, day: number) => ({
    year: 2026,
    month,
    day,
    hour: 0,
    minute: 0,
    second: 0
  });

  it("finds the instant of a wall-clock time", () => {
    expect(wallClockToInstant(monday(9, 21), "America/Los_Angeles").toISOString()).toBe(
      "2026-09-21T07:00:00.000Z"
    );
  });

  it("uses the offset in force after a daylight saving change", () => {
    expect(wallClockToInstant(monday(3, 9), "America/Los_Angeles").toISOString()).toBe(
      "2026-03-09T07:00:00.000Z"
    );
    expect(wallClockToInstant(monday(11, 2), "America/Los_Angeles").toISOString()).toBe(
      "2026-11-02T08:00:00.000Z"
    );
  });
});
