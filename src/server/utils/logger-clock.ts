import { readEnv } from "@/src/server/env";
import {
  naiveDateToWallClock,
  wallClockInTimeZone,
  wallClockToNaiveDate,
  type WallClock
} from "@/src/server/utils/time-zones";

const MS_PER_HOUR = 3_600_000;

// Wall-clock time on the stats logger's clock: the Procon host's local time
// with the logger's "Servertime Offset" added to it (DateTime.Now.AddHours).
export function loggerWallClock(date: Date): WallClock {
  const env = readEnv();
  const hostTime = wallClockToNaiveDate(
    wallClockInTimeZone(date, env.BF3_STATS_LOGGER_TIME_ZONE)
  );

  return naiveDateToWallClock(
    new Date(hostTime.getTime() + env.BF3_STATS_LOGGER_TIME_OFFSET * MS_PER_HOUR)
  );
}
