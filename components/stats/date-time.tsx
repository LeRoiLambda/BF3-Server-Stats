import { formatSiteTime } from "@/src/server/utils/site-time";

type DateTimeProps = {
  value: Date | null;
  fallback?: string;
  className?: string;
};

// A time on the site's clock, labelled with its zone.
export function DateTime({ value, fallback = "Unknown", className }: DateTimeProps) {
  if (!value) {
    return <span className={className}>{fallback}</span>;
  }

  return (
    <time dateTime={value.toISOString()} className={className}>
      {formatSiteTime(value)}
    </time>
  );
}
