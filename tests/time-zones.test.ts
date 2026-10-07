import { describe, expect, it } from "vitest";
import {
  formatSqlDateTime,
  parseSqlDateTime,
  parseUtcDateTime,
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

  it("finds times on the day of a daylight saving change", () => {
    const at = (month: number, day: number, hour: number, minute: number) => ({
      year: 2026,
      month,
      day,
      hour,
      minute,
      second: 0
    });

    // Los Angeles moves to PDT at 10:00 UTC on 8 March.
    expect(wallClockToInstant(at(3, 8, 3, 30), "America/Los_Angeles").toISOString()).toBe(
      "2026-03-08T10:30:00.000Z"
    );
    // Paris moves to CEST at 01:00 UTC on 29 March.
    expect(wallClockToInstant(at(3, 29, 1, 30), "Europe/Paris").toISOString()).toBe(
      "2026-03-29T00:30:00.000Z"
    );
    expect(wallClockToInstant(at(3, 29, 3, 30), "Europe/Paris").toISOString()).toBe(
      "2026-03-29T01:30:00.000Z"
    );
  });
});

describe("parseSqlDateTime", () => {
  it("reads a stored value", () => {
    expect(parseSqlDateTime("2026-09-25 14:32:07")).toEqual({
      year: 2026,
      month: 9,
      day: 25,
      hour: 14,
      minute: 32,
      second: 7
    });
  });

  it("returns null for zero, impossible, malformed and missing values", () => {
    expect(parseSqlDateTime("0000-00-00 00:00:00")).toBeNull();
    expect(parseSqlDateTime("2026-02-31 00:00:00")).toBeNull();
    expect(parseSqlDateTime("yesterday")).toBeNull();
    expect(parseSqlDateTime(null)).toBeNull();
  });
});

describe("parseUtcDateTime", () => {
  it("reads a stored value as UTC", () => {
    expect(parseUtcDateTime("2026-09-25 14:32:07")?.toISOString()).toBe(
      "2026-09-25T14:32:07.000Z"
    );
  });

  it("returns null for zero values", () => {
    expect(parseUtcDateTime("0000-00-00 00:00:00")).toBeNull();
  });
});
