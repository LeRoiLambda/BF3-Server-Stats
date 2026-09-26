import { readEnv } from "@/src/server/env";

export function siteTimeZone(): string {
  return readEnv().BF3_STATS_TIME_ZONE;
}
