import { z } from "zod";

const DEFAULT_BANNER_IMAGE = "/images/bf3-logo.png";
const LEGACY_PUBLIC_IMAGE_PREFIXES = ["./common/images/", "common/images/"];

function normalizeBannerImagePath(value: string): string {
  const imagePath = value.trim();
  const legacyPrefix = LEGACY_PUBLIC_IMAGE_PREFIXES.find((prefix) =>
    imagePath.startsWith(prefix)
  );

  if (legacyPrefix) {
    return `/images/${imagePath.slice(legacyPrefix.length)}`;
  }

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

const envSchema = z.object({
  BF3_STATS_DB_HOST: z.string().min(1, "BF3_STATS_DB_HOST is required"),
  BF3_STATS_DB_PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3306),
  BF3_STATS_DB_NAME: z.string().min(1, "BF3_STATS_DB_NAME is required"),
  BF3_STATS_DB_USER: z.string().min(1, "BF3_STATS_DB_USER is required"),
  BF3_STATS_DB_PASS: z.string().min(1, "BF3_STATS_DB_PASS is required"),
  BF3_STATS_CLAN_NAME: z.string().default("clan"),
  BF3_STATS_BANNER_IMAGE: z.string()
    .trim()
    .min(1)
    .default(DEFAULT_BANNER_IMAGE)
    .transform(normalizeBannerImagePath)
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
