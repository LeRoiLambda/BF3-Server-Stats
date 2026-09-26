export type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const SQL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;

const MS_PER_DAY = 86_400_000;

// Building a formatter costs far more than using one, so each zone gets one.
const wallClockFormats = new Map<string, Intl.DateTimeFormat>();
const zoneNameFormats = new Map<string, Intl.DateTimeFormat>();

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

// Whether `value` names a time zone Intl knows, such as "Europe/Paris".
export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function wallClockFormat(timeZone: string): Intl.DateTimeFormat {
  let format = wallClockFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
    wallClockFormats.set(timeZone, format);
  }

  return format;
}

export function wallClockInTimeZone(date: Date, timeZone: string): WallClock {
  const values = Object.fromEntries(
    wallClockFormat(timeZone)
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

// The zone's offset from UTC at `instant`, in milliseconds.
function offsetAt(instant: number, timeZone: string): number {
  const wallClock = wallClockInTimeZone(new Date(instant), timeZone);
  return wallClockToNaiveDate(wallClock).getTime() - instant;
}

// Finds the instant at which the given wall-clock time occurs in `timeZone`,
// trying the offsets in force a day before and a day after it. A time that
// occurs twice, when clocks go back, gives the earlier instant. A time that
// clocks skip when they go forward is read with the offset in force before
// the change, which moves it forward: 02:30 on the day Los Angeles moves to
// PDT is 03:30 PDT, and a day whose midnight is skipped, as in Santiago,
// starts at 01:00.
export function wallClockToInstant(wallClock: WallClock, timeZone: string): Date {
  const wallTime = wallClockToNaiveDate(wallClock).getTime();
  const offsetBefore = offsetAt(wallTime - MS_PER_DAY, timeZone);
  const offsetAfter = offsetAt(wallTime + MS_PER_DAY, timeZone);
  const occurrences = [wallTime - offsetBefore, wallTime - offsetAfter].filter(
    (instant) => offsetAt(instant, timeZone) === wallTime - instant
  );

  return new Date(
    occurrences.length > 0 ? Math.min(...occurrences) : wallTime - offsetBefore
  );
}

// Calendar arithmetic on wall-clock values without any time zone: the value is
// held in a Date whose UTC fields are the wall-clock fields.
export function wallClockToNaiveDate(wallClock: WallClock): Date {
  return new Date(Date.UTC(
    wallClock.year,
    wallClock.month - 1,
    wallClock.day,
    wallClock.hour,
    wallClock.minute,
    wallClock.second
  ));
}

export function naiveDateToWallClock(date: Date): WallClock {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds()
  };
}

export function formatSqlDate(wallClock: WallClock): string {
  return `${wallClock.year}-${pad2(wallClock.month)}-${pad2(wallClock.day)}`;
}

export function formatSqlDateTime(wallClock: WallClock): string {
  return [
    formatSqlDate(wallClock),
    `${pad2(wallClock.hour)}:${pad2(wallClock.minute)}:${pad2(wallClock.second)}`
  ].join(" ");
}

// Reads a stored "YYYY-MM-DD HH:MM:SS" value. Zero dates and impossible ones
// such as 2026-02-31 return null.
export function parseSqlDateTime(value: unknown): WallClock | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = SQL_DATE_TIME_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const wallClock = { year, month, day, hour, minute, second };
  const normalized = naiveDateToWallClock(wallClockToNaiveDate(wallClock));

  return formatSqlDateTime(normalized) === formatSqlDateTime(wallClock) ? wallClock : null;
}

// The instant of a stored UTC value, such as an AdKats record time.
export function parseUtcDateTime(value: unknown): Date | null {
  const wallClock = parseSqlDateTime(value);
  return wallClock ? wallClockToNaiveDate(wallClock) : null;
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

// "2026-09-25 09:00:00 PDT": the time in `timeZone`, followed by the zone's
// abbreviation or, for zones without one in English, its UTC offset.
export function formatInZone(instant: Date, timeZone: string): string {
  return `${formatSqlDateTime(wallClockInTimeZone(instant, timeZone))} ${zoneName(instant, timeZone)}`;
}

// The "YYYY-MM-DD" date in `timeZone` at `instant`.
export function dateInZone(instant: Date, timeZone: string): string {
  return formatSqlDate(wallClockInTimeZone(instant, timeZone));
}

// The "YYYY-MM-DD" dates in `timeZone` from the one containing `from` to the
// one containing `to`.
export function datesInZone(from: Date, to: Date, timeZone: string): string[] {
  const lastDate = dateInZone(to, timeZone);
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

// The instant a "YYYY-MM-DD" date starts in `timeZone`, `days` days later.
export function dayStartInZone(date: string, timeZone: string, days = 0): Date {
  const [year, month, day] = date.split("-").map(Number);

  return wallClockToInstant(
    naiveDateToWallClock(new Date(Date.UTC(year, month - 1, day + days))),
    timeZone
  );
}
