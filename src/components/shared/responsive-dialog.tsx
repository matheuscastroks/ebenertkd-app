"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const ResponsiveDialogCloseContext = createContext<(() => void) | null>(null);

export function useResponsiveDialogClose() {
  return useContext(ResponsiveDialogCloseContext);
}

export function ResponsiveDialog({
  trigger,
  triggerTooltip,
  title,
  description,
  children,
  open,
  onOpenChange,
  modal,
  size = "default",
  className,
}: {
  trigger: ReactNode;
  triggerTooltip?: string;
  title: string;
  description: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  size?: "default" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}) {
  const mobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const resolvedOpen = isControlled ? open : internalOpen;

  const sizeClasses = {
    default: "sm:max-w-lg",
    md: "sm:max-w-lg",
    lg: "sm:max-w-xl",
    xl: "sm:max-w-2xl",
    "2xl": "sm:max-w-3xl",
  }[size];

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const close = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  return (
    <Sheet open={resolvedOpen} onOpenChange={handleOpenChange} modal={modal}>
      {triggerTooltip ? (
        <TooltipProvider delayDuration={180}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SheetTrigger asChild>{trigger}</SheetTrigger>
            </TooltipTrigger>
            <TooltipContent>{triggerTooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <SheetTrigger asChild>{trigger}</SheetTrigger>
      )}
      <SheetContent
        side={mobile ? "bottom" : "right"}
        className={
          mobile
            ? "max-h-[88dvh] overflow-y-auto rounded-t-2xl pb-6"
            : `w-full overflow-y-auto ${sizeClasses} ${className ?? ""}`
        }
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <ResponsiveDialogCloseContext.Provider value={close}>
            {children}
          </ResponsiveDialogCloseContext.Provider>
        </div>
      </SheetContent>
    </Sheet>
  );
}
