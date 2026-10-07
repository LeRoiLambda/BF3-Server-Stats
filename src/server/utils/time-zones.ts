export type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const SQL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;

// Building a formatter costs far more than using one, so each zone gets one.
const wallClockFormats = new Map<string, Intl.DateTimeFormat>();

function pad2(value: number): string {
  return String(value).padStart(2, "0");
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

// Finds the instant at which the given wall-clock time occurs in `timeZone`.
// The second pass corrects the offset when a daylight saving change falls
// between the first guess and the instant.
export function wallClockToInstant(wallClock: WallClock, timeZone: string): Date {
  const wallTime = wallClockToNaiveDate(wallClock).getTime();
  let instant = wallTime;

  for (let pass = 0; pass < 2; pass += 1) {
    const offset =
      wallClockToNaiveDate(wallClockInTimeZone(new Date(instant), timeZone)).getTime() -
      instant;
    instant = wallTime - offset;
  }

  return new Date(instant);
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
