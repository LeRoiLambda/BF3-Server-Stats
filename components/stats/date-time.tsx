import { siteTimeZone } from "@/src/server/utils/site-time";
import { formatInZone } from "@/src/server/utils/time-zones";

type DateTimeProps = {
  value: Date | null;
  fallback?: string;
  className?: string;
};

export function DateTime({ value, fallback = "Unknown", className }: DateTimeProps) {
  if (!value) {
    return <span className={className}>{fallback}</span>;
  }

  return (
    <time dateTime={value.toISOString()} className={className}>
      {formatInZone(value, siteTimeZone())}
    </time>
  );
}
