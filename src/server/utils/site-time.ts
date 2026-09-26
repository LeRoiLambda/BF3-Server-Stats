import { readEnv } from "@/src/server/env";

// The site shows times, and starts its days and weeks, in BF3_STATS_TIME_ZONE.
export function siteTimeZone(): string {
  return readEnv().BF3_STATS_TIME_ZONE;
}
