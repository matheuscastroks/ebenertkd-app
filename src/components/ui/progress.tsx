"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Progress as ProgressPrimitive } from "radix-ui"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn(
        "relative flex h-3.5 w-full items-center overflow-hidden rounded-full bg-surface-recessed p-[2.5px] shadow-inset-well [box-shadow:var(--shadow-inset-well)]",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full rounded-full bg-primary transition-[width] duration-(--duration-fast) ease-(--ease-smooth-out) motion-reduce:transition-none [box-shadow:0_1px_2px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.7)]"
        style={{ width: `${Math.min(Math.max(value || 0, 0), 100)}%` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
