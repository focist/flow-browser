"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("relative overflow-hidden", className)} {...props}>
      {/*
       * [&>div]:!block — Radix wraps viewport children in an anonymous
       * <div style="min-width:100%; display:table"> (inline, so !important is
       * required). A table sizes to its content's intrinsic width, so any
       * nowrap descendant (e.g. a truncated bookmark title — even inside a
       * collapsed, height:0 section) widens it past the pane, and every
       * w-full/percentage below then resolves against that wider table.
       * Forcing block keeps children constrained to the viewport width.
       * Do NOT re-add an inline overflow style here: props.style overrides
       * Radix's managed overflowY and breaks wheel scrolling.
       */}
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 h-full w-full rounded-[inherit] transition-[color,box-shadow] focus-visible:ring-4 focus-visible:outline-1 [&>div]:!block [&>div]:w-full"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
