"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { createContext, useContext, useState } from "react";
import type { ReactElement, ReactNode } from "react";

const HintContext = createContext<Tooltip.Handle<string> | undefined>(undefined);

export function HintProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [handle] = useState(() => Tooltip.createHandle<string>());

  return (
    <Tooltip.Provider delay={300}>
      <HintContext value={handle}>
        {children}
        <Tooltip.Root handle={handle}>
          {({ payload }) => (
            <Tooltip.Portal>
              <Tooltip.Positioner sideOffset={6} className="z-50">
                <Tooltip.Popup className="max-w-xs rounded-sm border border-slate-600/70 bg-slate-900 px-2 py-1 text-xs text-slate-100 shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-opacity duration-100 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
                  {payload}
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          )}
        </Tooltip.Root>
      </HintContext>
    </Tooltip.Provider>
  );
}

type HintProps = Readonly<{
  label: string;
  render?: ReactElement;
  className?: string;
  children: ReactNode;
}>;

export function Hint({ label, render = <span />, className, children }: HintProps) {
  const handle = useContext(HintContext);

  return (
    <Tooltip.Trigger handle={handle} payload={label} render={render} className={className}>
      {children}
    </Tooltip.Trigger>
  );
}
