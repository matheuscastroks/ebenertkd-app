import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground shadow-xs transition-[color,background-color,border-color,box-shadow] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none outline-none hover:border-border/80 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-semibold file:text-foreground placeholder:text-muted-foreground dark:bg-input/20 dark:hover:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
