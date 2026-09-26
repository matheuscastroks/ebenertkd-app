import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-input/60 bg-surface-recessed depth-recessed px-3 py-2 text-sm text-foreground transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-semibold file:text-foreground placeholder:text-muted-foreground/80 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
