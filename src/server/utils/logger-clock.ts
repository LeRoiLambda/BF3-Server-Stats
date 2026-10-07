import { readEnv } from "@/src/server/env";
import {
  formatSqlDateTime,
  naiveDateToWallClock,
  parseSqlDateTime,
  wallClockInTimeZone,
  wallClockToInstant,
  wallClockToNaiveDate
} from "@/src/server/utils/time-zones";

const MS_PER_HOUR = 3_600_000;

// The stats logger stamps rows with the Procon host's local time plus its
// "Servertime Offset" setting (DateTime.Now.AddHours).
function loggerOffsetMs(): number {
  return readEnv().BF3_STATS_LOGGER_TIME_OFFSET * MS_PER_HOUR;
}

// The "YYYY-MM-DD HH:MM:SS" value the stats logger stamps at `instant`.
export function toLoggerTime(instant: Date): string {
  const hostTime = wallClockToNaiveDate(
    wallClockInTimeZone(instant, readEnv().BF3_STATS_LOGGER_TIME_ZONE)
  );

  return formatSqlDateTime(
    naiveDateToWallClock(new Date(hostTime.getTime() + loggerOffsetMs()))
  );
}

// The instant a value stamped by the stats logger stands for. Zero and
// malformed values return null. A value from the hour the Procon host's clock
// goes back maps to one of that hour's two instants.
export function fromLoggerTime(value: unknown): Date | null {
  const loggerTime = parseSqlDateTime(value);
  if (!loggerTime) {
    return null;
  }

  const hostTime = new Date(wallClockToNaiveDate(loggerTime).getTime() - loggerOffsetMs());

  return wallClockToInstant(
    naiveDateToWallClock(hostTime),
    readEnv().BF3_STATS_LOGGER_TIME_ZONE
  );
}
