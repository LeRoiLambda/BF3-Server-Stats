import { z } from "zod";
import { isValidTimeZone } from "@/src/server/utils/time-zones";

const DEFAULT_BANNER_IMAGE = "/images/bf3-logo.png";
const DEFAULT_TIME_ZONE = "America/Los_Angeles";

function normalizeBannerImagePath(value: string): string {
  const imagePath = value.trim();

  if (imagePath.startsWith("./public/")) {
    return `/${imagePath.slice("./public/".length)}`;
  }

  if (imagePath.startsWith("public/")) {
    return `/${imagePath.slice("public/".length)}`;
  }

  if (imagePath.startsWith("./")) {
    return `/${imagePath.slice(2)}`;
  }

  return imagePath;
}

// Blank values (`NAME=`) count as unset, so optional variables get their
// defaults.
function blankAsUnset(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const envSchema = z.object({
  BF3_STATS_DB_HOST: z.string().min(1, "BF3_STATS_DB_HOST is required"),
  BF3_STATS_DB_PORT: z.preprocess(
    blankAsUnset,
    z.coerce
      .number()
      .int()
      .positive()
      .default(3306)
  ),
  BF3_STATS_DB_NAME: z.string().min(1, "BF3_STATS_DB_NAME is required"),
  BF3_STATS_DB_USER: z.string().min(1, "BF3_STATS_DB_USER is required"),
  BF3_STATS_DB_PASS: z.string().min(1, "BF3_STATS_DB_PASS is required"),
  BF3_STATS_BANNER_IMAGE: z.preprocess(
    blankAsUnset,
    z.string()
      .trim()
      .min(1)
      .default(DEFAULT_BANNER_IMAGE)
      .transform(normalizeBannerImagePath)
  ),
  BF3_STATS_TIME_ZONE: z.preprocess(
    blankAsUnset,
    z.string()
      .trim()
      .min(1)
      .refine(isValidTimeZone, "BF3_STATS_TIME_ZONE must be a valid IANA time zone")
      .default(DEFAULT_TIME_ZONE)
  ),
  BF3_STATS_LOGGER_TIME_ZONE: z.string()
    .trim()
    .min(1, "BF3_STATS_LOGGER_TIME_ZONE is required")
    .refine(isValidTimeZone, "BF3_STATS_LOGGER_TIME_ZONE must be a valid IANA time zone"),
  BF3_STATS_LOGGER_TIME_OFFSET: z.preprocess(
    blankAsUnset,
    z.coerce
      .number()
      .min(-24, "BF3_STATS_LOGGER_TIME_OFFSET must be between -24 and 24 hours")
      .max(24, "BF3_STATS_LOGGER_TIME_OFFSET must be between -24 and 24 hours")
      .default(0)
  )
});

export type RuntimeEnv = z.infer<typeof envSchema>;

let cachedEnv: RuntimeEnv | null = null;

export function readEnv(): RuntimeEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Environment validation failed: ${message}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
