"use client";

import { clsx } from "clsx";
import {
  segmentedItemClass,
  segmentedListClass,
  segmentedShellClass
} from "@/components/layout/segmented-styles";

export type SegmentedTabItem = {
  label: string;
  value: string;
};

type SegmentedTabsProps = {
  items: SegmentedTabItem[];
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
};

export function SegmentedTabs({
  items,
  label,
  value,
  onChange,
  className
}: SegmentedTabsProps) {
  return (
    <div
      aria-label={label}
      className={clsx(segmentedShellClass, className)}
      role="tablist"
    >
      <div className={segmentedListClass}>
        {items.map((item) => {
          const selected = item.value === value;

          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={selected}
              className={segmentedItemClass(selected)}
              onClick={() => onChange(item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
