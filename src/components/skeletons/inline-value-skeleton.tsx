import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function InlineValueSkeleton({ className }: { className?: string }) {
  return <Skeleton aria-hidden="true" className={cn("inline-block h-5 w-24 align-middle", className)} />;
}
