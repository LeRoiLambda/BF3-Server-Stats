import Link from "next/link";
import { sortableHeadingClass } from "@/components/layout/stats-ui";

type SortHeadingProps = Readonly<{
  href: string;
  label: string;
  // The table's order when it is sorted by this column, else null.
  activeOrder: "asc" | "desc" | null;
}>;

// A column heading that links to the table sorted by that column.
export function SortHeading({ href, label, activeOrder }: SortHeadingProps) {
  return (
    <Link href={href} className={sortableHeadingClass(activeOrder !== null)}>
      {label}
      {activeOrder === "asc" ? "↑" : activeOrder === "desc" ? "↓" : null}
    </Link>
  );
}
