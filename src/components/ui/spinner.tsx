import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 as Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<typeof Loader2Icon>) {
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4", className)} {...props} />
  )
}

export { Spinner }
