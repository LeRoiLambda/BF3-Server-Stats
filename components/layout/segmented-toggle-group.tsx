"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { clsx } from "clsx";
import {
  segmentedItemClass,
  segmentedListClass,
  segmentedShellClass
} from "@/components/layout/segmented-styles";

export type SegmentedToggleItem = {
  label: string;
  value: string;
};

type SegmentedToggleGroupProps = {
  items: SegmentedToggleItem[];
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
};

export function SegmentedToggleGroup({
  items,
  label,
  value,
  onChange,
  className
}: SegmentedToggleGroupProps) {
  return (
    <div className={clsx(segmentedShellClass, className)}>
      <ToggleGroup
        aria-label={label}
        value={value === null ? [] : [value]}
        onValueChange={(next) => {
          if (next[0] !== undefined) {
            onChange(next[0]);
          }
        }}
        className={segmentedListClass}
      >
        {items.map((item) => (
          <Toggle
            key={item.value}
            value={item.value}
            className={(state) =>
              clsx(
                segmentedItemClass(state.pressed),
                "outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60"
              )
            }
          >
            {item.label}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}
