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

  it("moves times that clocks skip forward, past the change", () => {
    const at = (month: number, day: number, hour: number, minute: number) => ({
      year: 2026,
      month,
      day,
      hour,
      minute,
      second: 0
    });

    // 02:00 to 02:59 do not exist in Los Angeles on 8 March, nor in Paris on
    // 29 March: 02:30 is 03:30 PDT and 03:30 CEST.
    for (const minute of [0, 3, 30, 59]) {
      expect(wallClockToInstant(at(3, 8, 2, minute), "America/Los_Angeles").toISOString()).toBe(
        `2026-03-08T10:${String(minute).padStart(2, "0")}:00.000Z`
      );
    }
    expect(wallClockToInstant(at(3, 29, 2, 30), "Europe/Paris").toISOString()).toBe(
      "2026-03-29T01:30:00.000Z"
    );
    // Santiago skips midnight on 6 September: the day starts at 01:00 -03.
    expect(wallClockToInstant(at(9, 6, 0, 0), "America/Santiago").toISOString()).toBe(
      "2026-09-06T04:00:00.000Z"
    );
  });

  it("finds the first of two times when clocks go back", () => {
    // 01:30 happens twice in Los Angeles on 1 November, first as PDT.
    expect(
      wallClockToInstant(
        { year: 2026, month: 11, day: 1, hour: 1, minute: 30, second: 0 },
        "America/Los_Angeles"
      ).toISOString()
    ).toBe("2026-11-01T08:30:00.000Z");
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
