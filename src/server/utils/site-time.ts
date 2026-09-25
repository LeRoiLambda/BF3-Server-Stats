import { readEnv } from "@/src/server/env";
import {
  formatSqlDate,
  formatSqlDateTime,
  naiveDateToWallClock,
  wallClockInTimeZone,
  wallClockToInstant,
  wallClockToNaiveDate
} from "@/src/server/utils/time-zones";

const zoneNameFormats = new Map<string, Intl.DateTimeFormat>();

// The site shows times, and starts its days and weeks, in BF3_STATS_TIME_ZONE.
export function siteTimeZone(): string {
  return readEnv().BF3_STATS_TIME_ZONE;
}

function zoneName(instant: Date, timeZone: string): string {
  let format = zoneNameFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" });
    zoneNameFormats.set(timeZone, format);
  }

  return (
    format.formatToParts(instant).find((part) => part.type === "timeZoneName")?.value ??
    timeZone
  );
}

// "2026-09-25 09:00:00 PDT": the time on the site's clock, followed by the
// zone's abbreviation or, for zones without one in English, its UTC offset.
export function formatSiteTime(instant: Date): string {
  const timeZone = siteTimeZone();

  return `${formatSqlDateTime(wallClockInTimeZone(instant, timeZone))} ${zoneName(instant, timeZone)}`;
}

// The "YYYY-MM-DD" dates on the site's clock from the one containing `from` to
// the one containing `to`.
export function siteDatesBetween(from: Date, to: Date): string[] {
  const timeZone = siteTimeZone();
  const lastDate = formatSqlDate(wallClockInTimeZone(to, timeZone));
  const day = wallClockToNaiveDate({
    ...wallClockInTimeZone(from, timeZone),
    hour: 0,
    minute: 0,
    second: 0
  });
  const dates: string[] = [];

  let date = formatSqlDate(naiveDateToWallClock(day));
  while (date <= lastDate) {
    dates.push(date);
    day.setUTCDate(day.getUTCDate() + 1);
    date = formatSqlDate(naiveDateToWallClock(day));
  }

  return dates;
}

// The instant a "YYYY-MM-DD" date starts on the site's clock, `days` days
// later.
export function siteDateStart(date: string, days = 0): Date {
  const [year, month, day] = date.split("-").map(Number);

  return wallClockToInstant(
    naiveDateToWallClock(new Date(Date.UTC(year, month - 1, day + days))),
    siteTimeZone()
  );
}
