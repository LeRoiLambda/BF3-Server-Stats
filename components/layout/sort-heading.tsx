import Link from "next/link";
import { sortableHeadingClass } from "@/components/layout/stats-ui";

type SortHeadingProps = Readonly<{
  href: string;
  label: string;
  activeOrder: "asc" | "desc" | null;
}>;

export function SortHeading({ href, label, activeOrder }: SortHeadingProps) {
  return (
    <Link href={href} className={sortableHeadingClass(activeOrder !== null)}>
      {label}
      {activeOrder === "asc" ? "↑" : activeOrder === "desc" ? "↓" : null}
    </Link>
  );
}
