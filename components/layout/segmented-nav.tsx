import { clsx } from "clsx";
import Link from "next/link";
import {
  segmentedItemClass,
  segmentedListClass,
  segmentedShellClass
} from "@/components/layout/segmented-styles";

export type SegmentedNavItem = {
  href: string;
  label: string;
  selected: boolean;
};

type SegmentedNavProps = {
  items: SegmentedNavItem[];
  label: string;
  className?: string;
};

export function SegmentedNav({ items, label, className }: SegmentedNavProps) {
  return (
    <nav
      aria-label={label}
      className={clsx(
        segmentedShellClass,
        className
      )}
    >
      <div className={segmentedListClass}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.selected ? "page" : undefined}
            className={segmentedItemClass(item.selected)}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
