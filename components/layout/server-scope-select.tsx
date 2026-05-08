"use client";

type ServerScopeOption = Readonly<{
  label: string;
  href: string;
}>;

type ServerScopeSelectProps = Readonly<{
  value: string;
  options: ServerScopeOption[];
  className?: string;
}>;

export function ServerScopeSelect({
  value,
  options,
  className
}: ServerScopeSelectProps) {
  return (
    <select
      aria-label="Server"
      value={value}
      className={className}
      onChange={(event) => {
        const href = event.currentTarget.value;
        if (href) {
          window.location.assign(href);
        }
      }}
    >
      {options.map((option) => (
        <option key={option.href} value={option.href}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
