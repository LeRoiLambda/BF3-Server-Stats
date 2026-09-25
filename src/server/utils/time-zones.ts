export type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function wallClockInTimeZone(date: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
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
export function wallClockToInstant(wallClock: WallClock, timeZone: string): Date {
  const utcGuess = new Date(Date.UTC(
    wallClock.year,
    wallClock.month - 1,
    wallClock.day,
    wallClock.hour,
    wallClock.minute,
    wallClock.second
  ));
  const guessedParts = wallClockInTimeZone(utcGuess, timeZone);
  const guessedLocalAsUtc = Date.UTC(
    guessedParts.year,
    guessedParts.month - 1,
    guessedParts.day,
    guessedParts.hour,
    guessedParts.minute,
    guessedParts.second
  );
  const timeZoneOffset = guessedLocalAsUtc - utcGuess.getTime();

  return new Date(utcGuess.getTime() - timeZoneOffset);
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

export function formatSqlDateTime(wallClock: WallClock): string {
  return [
    `${wallClock.year}-${pad2(wallClock.month)}-${pad2(wallClock.day)}`,
    `${pad2(wallClock.hour)}:${pad2(wallClock.minute)}:${pad2(wallClock.second)}`
  ].join(" ");
}
