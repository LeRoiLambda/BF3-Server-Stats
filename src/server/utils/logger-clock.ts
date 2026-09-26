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

// The logger stamps the Procon host's local time plus its Servertime Offset (DateTime.Now.AddHours).
function loggerOffsetMs(): number {
  return readEnv().BF3_STATS_LOGGER_TIME_OFFSET * MS_PER_HOUR;
}

export function toLoggerTime(instant: Date): string {
  const hostTime = wallClockToNaiveDate(
    wallClockInTimeZone(instant, readEnv().BF3_STATS_LOGGER_TIME_ZONE)
  );

  return formatSqlDateTime(
    naiveDateToWallClock(new Date(hostTime.getTime() + loggerOffsetMs()))
  );
}

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
