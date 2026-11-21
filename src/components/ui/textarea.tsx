import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-xl bg-muted px-3.5 py-2.5 text-base text-foreground md:text-sm shadow-xs transition-[color,background-color,border-color,box-shadow] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none outline-none focus-visible:ring-3 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 placeholder:text-muted-foreground dark:bg-muted",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
