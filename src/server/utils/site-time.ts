import { readEnv } from "@/src/server/env";

export function siteTimeZone(): string {
  return readEnv().BF3_STATS_TIME_ZONE;
}

export function siteTimeZoneCity(): string {
  const timeZone = siteTimeZone();
  return timeZone.split("/").at(-1)?.replaceAll("_", " ") ?? timeZone;
}
